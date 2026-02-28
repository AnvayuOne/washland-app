import { prisma } from './prisma'
import { logActivity } from './activity-logger'
import { getActiveLoyaltyConfig } from './loyaltyRules'

interface AwardLoyaltyForOrderInput {
  orderId: string
  userId: string
  amount: number
}

export async function awardLoyaltyForOrder(input: AwardLoyaltyForOrderInput) {
  const rules = await getActiveLoyaltyConfig(prisma)

  if (input.amount < rules.minOrderAmountForPoints) {
    return {
      awarded: false,
      reason: 'below-min-order-amount',
      points: 0,
    }
  }

  const pointsToEarn = Math.floor(input.amount * rules.earnRate)
  if (pointsToEarn <= 0) {
    return {
      awarded: false,
      reason: 'zero-points',
      points: 0,
    }
  }

  const source = `ORDER_EARN:${input.orderId}`

  const existingAward = await prisma.loyaltyPoint.findFirst({
    where: {
      userId: input.userId,
      source,
    },
    select: {
      id: true,
      points: true,
    },
  })

  if (existingAward) {
    return {
      awarded: false,
      reason: 'already-awarded',
      points: existingAward.points,
    }
  }

  const awardedRecord = await prisma.loyaltyPoint.create({
    data: {
      userId: input.userId,
      points: pointsToEarn,
      source,
    },
    select: {
      id: true,
      points: true,
      source: true,
    },
  })

  return {
    awarded: true,
    reason: 'awarded',
    points: awardedRecord.points,
    recordId: awardedRecord.id,
  }
}

export async function processOrderCompletionRewards(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!order || !order.userId) {
      return
    }

    const orderTotalAmount = Number(order.totalAmount)

    // 1) Loyalty points for completed order (idempotent by source ORDER_EARN:<orderId>)
    await awardLoyaltyForOrder({
      orderId: order.id,
      userId: order.userId,
      amount: orderTotalAmount,
    })

    // 2) Referral bonus for referrer when referred user completes first order
    const config = await prisma.loyaltyConfiguration.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!config || config.pointsForReferral <= 0) {
      return
    }

    const previousCompletedOrders = await prisma.order.count({
      where: {
        userId: order.userId,
        status: 'COMPLETED',
        id: { not: order.id },
      },
    })

    if (previousCompletedOrders > 0) {
      return
    }

    const referral = await prisma.referral.findFirst({
      where: {
        referredId: order.userId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (!referral) {
      return
    }

    const referralRewardSource = `REFERRAL_REWARD:${referral.id}`
    const existingReferralReward = await prisma.loyaltyPoint.findFirst({
      where: {
        userId: referral.referrerId,
        source: referralRewardSource,
      },
      select: { id: true },
    })

    if (!existingReferralReward) {
      await prisma.loyaltyPoint.create({
        data: {
          userId: referral.referrerId,
          points: config.pointsForReferral,
          source: referralRewardSource,
        },
      })

      await logActivity({
        type: 'REFERRAL_REWARDED',
        description: `Referral reward of ${config.pointsForReferral} points sent to referrer`,
        userId: referral.referrerId,
        metadata: {
          referredUserId: order.userId,
          referralId: referral.id,
          points: config.pointsForReferral,
        },
      })
    }

    if (referral.status !== 'REWARDED') {
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'REWARDED',
          rewardedAt: new Date(),
        },
      })
    }
  } catch (error) {
    console.error('Error processing rewards:', error)
  }
}
