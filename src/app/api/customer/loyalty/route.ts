import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveLoyaltyConfig } from '@/lib/loyaltyRules'

export async function GET() {
  try {
    const authResult = await requireRole(['CUSTOMER'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const userId = authResult.id

    const [
      pointsBalanceAgg,
      lifetimeEarnedAgg,
      lifetimeRedeemedAgg,
      recentTransactions,
      rules,
    ] = await Promise.all([
      prisma.loyaltyPoint.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      prisma.loyaltyPoint.aggregate({
        where: { userId, points: { gt: 0 } },
        _sum: { points: true },
      }),
      prisma.loyaltyPoint.aggregate({
        where: { userId, points: { lt: 0 } },
        _sum: { points: true },
      }),
      prisma.loyaltyPoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          points: true,
          source: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      getActiveLoyaltyConfig(prisma),
    ])

    const pointsBalance = pointsBalanceAgg._sum.points ?? 0
    const lifetimePointsEarned = lifetimeEarnedAgg._sum.points ?? 0
    const lifetimePointsRedeemed = Math.abs(lifetimeRedeemedAgg._sum.points ?? 0)

    return NextResponse.json({
      success: true,
      loyalty: {
        pointsBalance,
        lifetimePointsEarned,
        lifetimePointsRedeemed,
        rules,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('customer loyalty GET error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch loyalty data' },
      { status: 500 }
    )
  }
}
