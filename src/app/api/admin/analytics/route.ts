import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'

export async function GET(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const franchiseId = searchParams.get('franchiseId')
    const storeId = searchParams.get('storeId')

    // Set default date range to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const whereClause: Record<string, any> = {
      createdAt: {
        gte: start,
        lte: end
      }
    }

    if (storeId) {
      whereClause.storeId = storeId
    } else if (franchiseId) {
      whereClause.store = {
        franchiseId: franchiseId
      }
    }

    if (type === 'overview') {
      // Get overall business metrics
      const [
        totalRevenue,
        totalOrders,
        completedOrders,
        activeOrders,
        activeCustomers,
        franchiseCount,
        storeCount,
        serviceCount,
        recentOrders
      ] = await Promise.all([
        // Total revenue from completed orders
        prisma.order.aggregate({
          where: {
            ...whereClause,
            status: 'COMPLETED',
            paymentStatus: 'PAID'
          },
          _sum: { totalAmount: true }
        }),
        
        // Total orders count
        prisma.order.count({
          where: whereClause
        }),
        
        // Completed orders count
        prisma.order.count({
          where: {
            ...whereClause,
            status: 'COMPLETED'
          }
        }),
        
        // Active orders (not completed or cancelled)
        prisma.order.count({
          where: {
            ...whereClause,
            status: {
              notIn: ['COMPLETED', 'CANCELLED']
            }
          }
        }),
        
        // Active customers (made order in period)
        prisma.user.count({
          where: {
            orders: {
              some: whereClause
            }
          }
        }),
        
        // Total franchises
        prisma.franchise.count(),
        
        // Total stores
        prisma.store.count(),
        
        // Total services
        prisma.service.count({
          where: { isActive: true }
        }),
        
        // Recent orders
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            store: {
              include: {
                franchise: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ])

      return NextResponse.json({
        metrics: {
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalOrders,
          completedOrders,
          activeOrders,
          pendingOrders: totalOrders - completedOrders,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0,
          activeCustomers,
          franchiseCount,
          storeCount,
          serviceCount
        },
        recentOrders,
        period: {
          start,
          end
        }
      })
    }

    if (type === 'revenue') {
      // Daily revenue breakdown
      const revenueData = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(total_amount) as revenue
        FROM orders 
        WHERE created_at >= ${start}
          AND created_at <= ${end}
          AND status = 'COMPLETED'
          AND payment_status = 'PAID'
          ${storeId ? `AND store_id = '${storeId}'` : ''}
          ${franchiseId ? `AND store_id IN (SELECT id FROM stores WHERE franchise_id = '${franchiseId}')` : ''}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `

      return NextResponse.json({
        revenueByDay: revenueData,
        period: { start, end }
      })
    }

    if (type === 'orders') {
      // Order status breakdown
      const [statusBreakdown, serviceBreakdown] = await Promise.all([
        prisma.order.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true
        }),
        
        prisma.orderItem.groupBy({
          by: ['serviceId'],
          where: {
            order: whereClause
          },
          _count: true,
          _sum: { quantity: true, price: true }
        })
      ])

      // Get service names for service breakdown
      const serviceIds = serviceBreakdown
        .map((item: { serviceId: string | null }) => item.serviceId)
        .filter((id): id is string => id !== null)
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true }
      })

      const enrichedServiceBreakdown = serviceBreakdown.map((item: { serviceId: string | null }) => ({
        ...item,
        serviceName: services.find(s => s.id === item.serviceId)?.name || 'Unknown'
      }))

      return NextResponse.json({
        statusBreakdown,
        serviceBreakdown: enrichedServiceBreakdown,
        period: { start, end }
      })
    }

    if (type === 'customers') {
      // Customer analytics
      const [
        newCustomers,
        returningCustomers,
        topCustomers
      ] = await Promise.all([
        // New customers in period
        prisma.user.count({
          where: {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        }),
        
        // Customers with multiple orders
        prisma.user.count({
          where: {
            orders: {
              some: whereClause
            },
            createdAt: {
              lt: start
            }
          }
        }),
        
        // Top customers by order value
        prisma.user.findMany({
          where: {
            orders: {
              some: whereClause
            }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            _count: {
              select: {
                orders: true
              }
            },
            orders: {
              where: {
                ...whereClause,
                status: 'COMPLETED'
              },
              select: {
                totalAmount: true
              }
            }
          },
          take: 10
        })
      ])

      const enrichedTopCustomers = topCustomers.map((customer: any) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        totalOrders: customer._count.orders,
        totalSpent: customer.orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount), 0)
      })).sort((a: any, b: any) => b.totalSpent - a.totalSpent)

      return NextResponse.json({
        newCustomers,
        returningCustomers,
        topCustomers: enrichedTopCustomers,
        period: { start, end }
      })
    }

    return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })

  } catch (err) {
    console.error('analytics GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
