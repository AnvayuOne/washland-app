import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    try {
      // Get dashboard statistics
      const [
        activeOrdersCount,
        totalOrdersCount,
        loyaltyPointsAgg,
        wallet
      ] = await Promise.all([
        // Active orders (not completed or cancelled)
        prisma.order.count({
          where: {
            userId: scope.userId,
            status: {
              notIn: ['COMPLETED', 'CANCELLED']
            }
          }
        }),
        
        // Total orders
        prisma.order.count({
          where: { userId: scope.userId }
        }),
        prisma.loyaltyPoint.aggregate({
          where: { userId: scope.userId },
          _sum: { points: true }
        }),
        prisma.wallet.findUnique({
          where: { userId: scope.userId },
          select: { balance: true }
        })
      ])

      const stats = {
        activeOrders: activeOrdersCount,
        totalOrders: totalOrdersCount,
        loyaltyPoints: loyaltyPointsAgg._sum.points ?? 0,
        walletBalance: wallet ? Number(wallet.balance) : 0
      }

      return NextResponse.json({
        success: true,
        stats
      })
    } catch (dbError) {
      console.error('Database error fetching dashboard stats:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard statistics' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('dashboard stats GET error', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
