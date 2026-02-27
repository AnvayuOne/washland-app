import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const storeId = searchParams.get('storeId')
    const franchiseId = searchParams.get('franchiseId')
    const userId = searchParams.get('userId')
    const lookup = searchParams.get('lookup')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (lookup === 'customers') {
      const customers = await prisma.user.findMany({
        where: {
          role: 'CUSTOMER',
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          addresses: {
            select: {
              id: true,
              title: true,
              street: true,
              city: true,
              state: true,
              zipCode: true,
              isDefault: true
            },
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' }
            ]
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({
        success: true,
        customers
      })
    }

    const whereClause: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      storeId?: string;
      store?: { franchiseId: string };
      userId?: string;
    } = {}

    if (status && status !== 'all') {
      whereClause.status = status as OrderStatus
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus as PaymentStatus
    }
    
    if (storeId) {
      whereClause.storeId = storeId
    }
    
    if (franchiseId) {
      whereClause.store = {
        franchiseId: franchiseId
      }
    }
    
    if (userId) {
      whereClause.userId = userId
    }

    const skip = (page - 1) * limit

    try {
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            store: {
              include: {
                franchise: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            address: true,
            items: {
              include: {
                service: true
              }
            },
            pickupRider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            deliveryRider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
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
      
      return NextResponse.json({
        success: true,
        orders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    } catch (dbError) {
      console.error('Database error fetching orders:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch orders from database' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('orders GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const { 
      userId, 
      storeId, 
      addressId, 
      items, // Array of {serviceId, quantity, price, notes?}
      pickupDate,
      deliveryDate,
      specialInstructions
    } = body

    if (!storeId || !userId || !addressId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Store ID, customer, address, and at least one item are required' 
      }, { status: 400 })
    }

    try {
      // Validate store exists
      const store = await prisma.store.findUnique({ where: { id: storeId } })
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }

      // Validate selected customer exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true
        }
      })
      if (!user) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
      if (user.role !== 'CUSTOMER') {
        return NextResponse.json({ error: 'Selected user is not a customer' }, { status: 400 })
      }

      // Validate selected address exists and belongs to selected customer
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId
        },
        select: { id: true }
      })
      if (!address) {
        return NextResponse.json({ error: 'Address not found for selected customer' }, { status: 404 })
      }

      // Calculate total amount
      let totalAmount = 0
      for (const item of items) {
        if (!item.serviceId || typeof item.serviceId !== 'string') {
          return NextResponse.json({
            error: 'Each order item must include a valid service'
          }, { status: 400 })
        }

        const quantity = Number(item.quantity)
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return NextResponse.json({
            error: `Invalid quantity for service: ${item.serviceId}`
          }, { status: 400 })
        }

        const price = parseFloat(item.price)
        if (isNaN(price) || price < 0) {
          return NextResponse.json({ 
            error: `Invalid price for item: ${item.serviceId || item.itemType}` 
          }, { status: 400 })
        }
        totalAmount += price * quantity
      }

      // Generate unique order number
      const orderNumber = `WL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          storeId,
          addressId,
          totalAmount,
          pickupDate: pickupDate ? new Date(pickupDate) : null,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          specialInstructions: specialInstructions || '',
          items: {
            create: items.map((item: any) => ({
              serviceId: item.serviceId,
              quantity: Number(item.quantity),
              price: parseFloat(item.price),
              notes: item.notes || item.instructions || ''
            }))
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          store: {
            include: {
              franchise: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          address: true,
          items: {
            include: {
              service: true
            }
          }
        }
      })

      // Log the order creation activity
      await logActivity({
        type: 'ORDER_PLACED',
        description: `Order ${order.orderNumber} placed for ₹${order.totalAmount}`,
        userId: order.userId,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          storeId: order.storeId,
          storeName: order.store.name,
          franchiseName: order.store.franchise.name,
          customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Walk-in Customer'
        }
      })

      return NextResponse.json({
        success: true,
        order,
        message: 'Order created successfully'
      })
    } catch (dbError) {
      console.error('Database error creating order:', dbError)
      return NextResponse.json(
        { error: 'Failed to create order in database' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('orders POST error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
