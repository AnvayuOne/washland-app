import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'
import { processOrderCompletionRewards } from '@/lib/loyalty'
import { canTransition, isOrderStatus, type OrderStatusValue } from '@/lib/orderStatus'
import { recomputeOrderTotals } from '@/lib/order-totals'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params

    try {
      const order = await prisma.order.findUnique({
        where: { id },
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
        }
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        order,
        message: 'Order retrieved successfully'
      })
    } catch (dbError) {
      console.error('Database error fetching order:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch order from database' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('order GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const body = await request.json()
    const {
      status,
      paymentStatus,
      pickupDate,
      deliveryDate,
      specialInstructions,
      stripePaymentIntentId,
      pickupRiderId,
      deliveryRiderId,
      force
    } = body

    try {
      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      })

      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      if (status !== undefined) {
        if (typeof status !== 'string' || !isOrderStatus(status)) {
          return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
        }

        const fromStatus = existingOrder.status as OrderStatusValue
        const toStatus = status as OrderStatusValue
        const canForceOverride = authResult.role === 'SUPER_ADMIN' && force === true

        if (!canTransition(fromStatus, toStatus) && !canForceOverride) {
          return NextResponse.json(
            { error: `Invalid status transition from ${fromStatus} to ${toStatus}` },
            { status: 400 }
          )
        }
      }

      const updateData: {
        status?: OrderStatus;
        paymentStatus?: PaymentStatus;
        pickupDate?: Date | null;
        deliveryDate?: Date | null;
        specialInstructions?: string;
        stripePaymentIntentId?: string;
        pickupRiderId?: string | null;
        deliveryRiderId?: string | null;
      } = {}

      // Update order info
      if (status !== undefined) updateData.status = status as OrderStatus
      if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus
      if (pickupDate !== undefined) {
        updateData.pickupDate = pickupDate ? new Date(pickupDate) : null
      }
      if (deliveryDate !== undefined) {
        updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null
      }
      if (specialInstructions !== undefined) updateData.specialInstructions = specialInstructions
      if (stripePaymentIntentId !== undefined) updateData.stripePaymentIntentId = stripePaymentIntentId

      // Update rider assignments
      if (pickupRiderId !== undefined) {
        updateData.pickupRiderId = pickupRiderId || null
      }
      if (deliveryRiderId !== undefined) {
        updateData.deliveryRiderId = deliveryRiderId || null
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
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

      // Keep normalized monetary fields synced on every update path.
      await recomputeOrderTotals(updatedOrder.id)

      // Log activity if payment status changed to PAID
      if (paymentStatus === 'PAID' && existingOrder.paymentStatus !== 'PAID') {
        await logActivity({
          type: 'PAYMENT_RECEIVED',
          description: `Payment of ₹${updatedOrder.totalAmount} received for order ${updatedOrder.orderNumber}`,
          userId: updatedOrder.userId,
          metadata: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            amount: updatedOrder.totalAmount,
            storeId: updatedOrder.storeId,
            storeName: updatedOrder.store.name,
            franchiseName: updatedOrder.store.franchise.name,
            customerName: updatedOrder.user ? `${updatedOrder.user.firstName} ${updatedOrder.user.lastName}` : 'Walk-in Customer'
          }
        })
      }

      // Log activity if order status changed to COMPLETED
      if (status === 'COMPLETED' && existingOrder.status !== 'COMPLETED') {

        // Process Loyalty & Referral Rewards
        await processOrderCompletionRewards(updatedOrder.id)

        await logActivity({
          type: 'ORDER_COMPLETED',
          description: `Order ${updatedOrder.orderNumber} completed and delivered`,
          userId: updatedOrder.userId,
          metadata: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            totalAmount: updatedOrder.totalAmount,
            storeId: updatedOrder.storeId,
            storeName: updatedOrder.store.name,
            franchiseName: updatedOrder.store.franchise.name
          }
        })
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: 'Order updated successfully'
      })
    } catch (dbError) {
      console.error('Database error updating order:', dbError)
      return NextResponse.json(
        { error: 'Failed to update order in database' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('order PUT error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

// Also support PATCH for partial updates
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params

    try {
      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Check if order can be deleted (only allow deletion of PENDING or CANCELLED orders)
      if (!['PENDING', 'CANCELLED'].includes(existingOrder.status)) {
        return NextResponse.json({
          error: 'Can only delete pending or cancelled orders. Update status to CANCELLED first if needed.'
        }, { status: 400 })
      }

      // Delete order items first
      await prisma.orderItem.deleteMany({
        where: { orderId: id }
      })

      // Delete the order
      await prisma.order.delete({
        where: { id }
      })

      return NextResponse.json({
        success: true,
        message: 'Order deleted successfully'
      })
    } catch (dbError) {
      console.error('Database error deleting order:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete order from database' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('order DELETE error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
