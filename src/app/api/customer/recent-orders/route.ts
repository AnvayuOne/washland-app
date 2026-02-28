import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5')

    try {
      const orders = await prisma.order.findMany({
        where: { userId: scope.userId },
        include: {
          items: {
            include: {
              service: true
            }
          },
          store: {
            select: {
              name: true,
              city: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      const formattedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        itemsCount: order.items.length,
        store: order.store
      }))

      return NextResponse.json({
        success: true,
        orders: formattedOrders
      })
    } catch (dbError) {
      console.error('Database error fetching recent orders:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch recent orders' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('recent orders GET error', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
