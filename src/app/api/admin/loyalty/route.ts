import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const points = await prisma.loyaltyPoint.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      }
    })

    const perUserMap = new Map<string, {
      userId: string
      firstName: string
      lastName: string
      fullName: string
      email: string
      pointsBalance: number
      lifetimePointsEarned: number
      lifetimePointsRedeemed: number
      lastActivityAt: string
      lastSource: string
    }>()

    for (const point of points) {
      const existing = perUserMap.get(point.userId)
      const fullName = `${point.user.firstName ?? ''} ${point.user.lastName ?? ''}`.trim()

      if (!existing) {
        perUserMap.set(point.userId, {
          userId: point.user.id,
          firstName: point.user.firstName,
          lastName: point.user.lastName,
          fullName,
          email: point.user.email,
          pointsBalance: point.points,
          lifetimePointsEarned: point.points > 0 ? point.points : 0,
          lifetimePointsRedeemed: point.points < 0 ? Math.abs(point.points) : 0,
          lastActivityAt: point.createdAt.toISOString(),
          lastSource: point.source,
        })
        continue
      }

      existing.pointsBalance += point.points
      if (point.points > 0) {
        existing.lifetimePointsEarned += point.points
      } else if (point.points < 0) {
        existing.lifetimePointsRedeemed += Math.abs(point.points)
      }
    }

    const users = Array.from(perUserMap.values()).sort((a, b) => b.pointsBalance - a.pointsBalance)

    const recentTransactions = points.slice(0, 20).map((point) => ({
      id: point.id,
      userId: point.user.id,
      firstName: point.user.firstName,
      lastName: point.user.lastName,
      fullName: `${point.user.firstName ?? ''} ${point.user.lastName ?? ''}`.trim(),
      email: point.user.email,
      points: point.points,
      source: point.source,
      createdAt: point.createdAt,
      expiresAt: point.expiresAt,
    }))

    return NextResponse.json({
      success: true,
      users,
      recentTransactions,
    })
  } catch (error) {
    console.error('Error fetching loyalty points:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
