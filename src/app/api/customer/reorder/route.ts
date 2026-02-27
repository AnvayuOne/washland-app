import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-logger'
import { computeOrderItems, computeOrderTotals, normalizeCurrencyCode } from '@/lib/order-totals'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    
    if (!userId || userRole !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    try {
      // Fetch the original order with items
      const originalOrder = await prisma.order.findUnique({
        where: { 
          id: orderId,
          userId // Ensure user owns this order
        },
        include: {
          items: {
            include: {
              service: true
            }
          },
          address: true,
          store: true
        }
      })

      if (!originalOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const computedItems = computeOrderItems(
        originalOrder.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice && !item.unitPrice.eq(0) ? item.unitPrice : item.price
        }))
      )
      const totals = computeOrderTotals(computedItems, {
        currency: normalizeCurrencyCode(originalOrder.currency)
      })

      // Generate unique order number
      const orderNumber = `WL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      // Create new order with same items
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          userId,
          storeId: originalOrder.storeId,
          addressId: originalOrder.addressId,
          currency: totals.currency,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          totalAmount: totals.totalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          specialInstructions: `Reorder of ${originalOrder.orderNumber}`,
          items: {
            create: originalOrder.items.map((item, index) => ({
              serviceId: item.serviceId,
              quantity: computedItems[index].quantity,
              unitPrice: computedItems[index].unitPrice,
              lineTotal: computedItems[index].lineTotal,
              price: computedItems[index].unitPrice,
              notes: item.notes || ''
            }))
          }
        },
        include: {
          items: {
            include: {
              service: true
            }
          },
          store: true,
          address: true
        }
      })

      // Log the reorder activity
      await logActivity({
        type: 'ORDER_PLACED',
        description: `Reorder ${newOrder.orderNumber} placed for ₹${newOrder.totalAmount}`,
        userId: userId,
        metadata: {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          totalAmount: newOrder.totalAmount,
          storeId: newOrder.storeId,
          storeName: newOrder.store.name,
          originalOrderNumber: originalOrder.orderNumber,
          isReorder: true
        }
      })

      return NextResponse.json({
        success: true,
        order: newOrder,
        message: 'Order created successfully. You can modify it before confirming.'
      })
    } catch (dbError) {
      console.error('Database error creating reorder:', dbError)
      return NextResponse.json(
        { error: 'Failed to create reorder' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('reorder POST error', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
