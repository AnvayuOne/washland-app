import { prisma } from './prisma'
import { randomUUID } from 'crypto'

export function generateReferralCode(prefix = 'WL') {
  // Simple human-friendly code: WL-XXXX
  const part = randomUUID().split('-')[0].toUpperCase()
  return `${prefix}-${part}`
}

export async function createReferralForReferrer(referrerId: string) {
  const code = generateReferralCode()
  const referral = await prisma.referral.create({
    data: {
      code,
      referrerId,
    },
  })
  return referral
}

export async function applyReferralCode(code: string, referredUserId: string) {
  const ref = await prisma.referral.findFirst({
    where: {
      code,
      referredId: null,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
  if (!ref) throw new Error('Referral code not found')
  if (ref.referredId) throw new Error('Referral code already used')

  const updated = await prisma.referral.update({
    where: { id: ref.id },
    data: { referredId: referredUserId },
  })
  return updated
}

export async function creditReferral(referralId: string, referrerAmount = 100, referredAmount = 50) {
  // This will mark referral as REWARDED and credit wallets and points
  return await prisma.$transaction(async (tx) => {
    const referral = await tx.referral.update({
      where: { id: referralId },
      data: { status: 'REWARDED', rewardedAt: new Date() },
    })

    // credit referrer
    const referrerWallet = await tx.wallet.upsert({
      where: { userId: referral.referrerId },
      update: { balance: { increment: referrerAmount } as any },
      create: { userId: referral.referrerId, balance: referrerAmount as any },
    })

    await tx.walletTransaction.create({
      data: {
        walletId: referrerWallet.id,
        type: 'CREDIT',
        amount: referrerAmount as any,
        source: 'REFERRAL_REWARD',
      },
    })

    // add loyalty points to referrer
    await tx.loyaltyPoint.create({
      data: {
        userId: referral.referrerId,
        points: Math.floor(referrerAmount),
        source: 'REFERRAL',
        expiresAt: new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000), // 6 months
      },
    })

    // credit referred user (if exists)
    if (referral.referredId) {
      const rWallet = await tx.wallet.upsert({
        where: { userId: referral.referredId },
        update: { balance: { increment: referredAmount } as any },
        create: { userId: referral.referredId, balance: referredAmount as any },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: rWallet.id,
          type: 'CREDIT',
          amount: referredAmount as any,
          source: 'REFERRAL_WELCOME',
        },
      })

      await tx.loyaltyPoint.create({
        data: {
          userId: referral.referredId,
          points: Math.floor(referredAmount),
          source: 'REFERRAL_WELCOME',
          expiresAt: new Date(new Date().getTime() + 180 * 24 * 60 * 60 * 1000),
        },
      })
    }

    return referral
  })
}
