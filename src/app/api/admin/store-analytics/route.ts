import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'
import { assertStoreInScope, getScope } from '@/lib/scope'

// GET /api/admin/store-analytics - Get analytics for a specific store
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const scope = getScope(authResult)

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }
    await assertStoreInScope(storeId, scope)

    try {
      // Get current date for calculations
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Get real analytics from database
      const [
        todaysOrders,
        pendingPickups,
        readyForDelivery,
        totalCustomers,
        monthlyRevenue,
        activeRiderAssignments
      ] = await Promise.all([
        // Today's orders
        prisma.order.count({
          where: {
            storeId: storeId,
            createdAt: {
              gte: startOfToday
            }
          }
        }),

        // Pending pickups
        prisma.order.count({
          where: {
            storeId: storeId,
            status: {
              in: ['CONFIRMED', 'READY_FOR_PICKUP']
            }
          }
        }),

        // Ready for delivery
        prisma.order.count({
          where: {
            storeId: storeId,
            status: 'READY_FOR_PICKUP'
          }
        }),

        // Total customers (unique users who have placed orders at this store)
        prisma.order.groupBy({
          by: ['userId'],
          where: {
            storeId: storeId
          }
        }).then(result => result.length),

        // Monthly revenue (sum of paid orders this month)
        prisma.order.aggregate({
          where: {
            storeId: storeId,
            createdAt: {
              gte: startOfMonth
            },
            paymentStatus: 'PAID'
          },
          _sum: {
            totalAmount: true
          }
        }).then(result => result._sum.totalAmount || 0),

        prisma.order.findMany({
          where: {
            storeId: storeId,
            status: {
              in: ['CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP']
            }
          },
          select: {
            pickupRiderId: true,
            deliveryRiderId: true
          }
        })
      ])

      const riderIds = new Set<string>()
      for (const order of activeRiderAssignments) {
        if (order.pickupRiderId) riderIds.add(order.pickupRiderId)
        if (order.deliveryRiderId) riderIds.add(order.deliveryRiderId)
      }

      const stats = {
        todaysOrders,
        pendingPickups,
        readyForDelivery,
        totalCustomers,
        monthlyRevenue: Number(monthlyRevenue),
        activeRiders: riderIds.size
      }

      return NextResponse.json({
        success: true,
        stats,
        message: 'Store analytics retrieved successfully'
      })

    } catch (dbError) {
      console.error('Database error fetching analytics:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics from database' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error fetching store analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
