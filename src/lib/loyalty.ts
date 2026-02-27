import { prisma } from './prisma'
import { logActivity } from './activity-logger'

export async function processOrderCompletionRewards(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true
            }
        })

        if (!order || !order.user) return

        // Get Global Config
        const config = await prisma.loyaltyConfiguration.findFirst()
        if (!config || !config.isActive) return

        const orderTotalAmount = Number(order.totalAmount)

        // 1. Reward User for their own order (Loyalty Points)
        if (config.minOrderForPoints === 0 || orderTotalAmount >= config.minOrderForPoints) {
            const pointsToEarn = Math.floor(orderTotalAmount * config.pointsPerOrderCurrency)

            if (pointsToEarn > 0) {
                // TODO: If human-readable event details are needed, add a schema field (e.g. metadata/description).
                await prisma.loyaltyPoint.create({
                    data: {
                        userId: order.userId,
                        points: pointsToEarn,
                        source: 'ORDER_REWARD'
                    }
                })
            }
        }

        // 2. Reward Referrer if this is the User's first order
        // Check if user has any OTHER completed orders
        const previousOrders = await prisma.order.count({
            where: {
                userId: order.userId,
                status: 'COMPLETED',
                id: { not: orderId } // Exclude current one
            }
        })

        if (previousOrders === 0) {
            // This is the FIRST completed order. Check if they were referred.
            const referral = await prisma.referral.findFirst({
                where: {
                    referredId: order.userId,
                    status: 'PENDING'
                }
            })

            if (referral) {
                // Reward the Referrer
                await prisma.loyaltyPoint.create({
                    data: {
                        userId: referral.referrerId,
                        points: config.pointsForReferral,
                        source: 'REFERRAL_REWARD'
                    }
                })

                // Mark Referral as Rewarded
                await prisma.referral.update({
                    where: { id: referral.id },
                    data: {
                        status: 'REWARDED',
                        rewardedAt: new Date()
                    }
                })

                // Log Activity
                await logActivity({
                    type: 'REFERRAL_REWARDED',
                    description: `Referral reward of ${config.pointsForReferral} points sent to referrer`,
                    userId: referral.referrerId,
                    metadata: {
                        referredUserId: order.userId,
                        points: config.pointsForReferral
                    }
                })
            }
        }

    } catch (error) {
        console.error('Error processing rewards:', error)
    }
}
