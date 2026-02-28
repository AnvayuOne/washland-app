import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let whereClause: any = { userId: scope.userId }
    
    if (status && status !== 'all') {
      whereClause.status = status
    }

    const skip = (page - 1) * limit

    try {
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            },
            store: {
              select: {
                id: true,
                name: true,
                city: true,
                phone: true
              }
            },
            address: {
              select: {
                id: true,
                street: true,
                city: true,
                state: true,
                zipCode: true
              }
            },
            pickupRider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            },
            deliveryRider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({ where: whereClause })
      ])

      const normalizedOrders = orders.map((order) => ({
        ...order,
        itemsCount: order.items.length
      }))

      return NextResponse.json({
        success: true,
        orders: normalizedOrders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    } catch (dbError) {
      console.error('Database error fetching customer orders:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch orders from database' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('customer orders GET error', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
