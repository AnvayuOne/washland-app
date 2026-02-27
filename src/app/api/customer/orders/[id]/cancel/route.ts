import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"
import { recomputeOrderTotals } from "@/lib/order-totals"

const CUSTOMER_CANCELABLE_STATUSES = ["PAYMENT_PENDING", "CONFIRMED"] as const

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) {
      return auth
    }

    const { id } = await params
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: auth.id,
      },
      include: {
        items: {
          include: {
            service: true,
          },
        },
        store: true,
        address: true,
        pickupRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        deliveryRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!CUSTOMER_CANCELABLE_STATUSES.includes(order.status as (typeof CUSTOMER_CANCELABLE_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Order can only be cancelled in Payment Pending or Confirmed state" },
        { status: 400 }
      )
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
      include: {
        items: {
          include: {
            service: true,
          },
        },
        store: true,
        address: true,
        pickupRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        deliveryRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    })

    await recomputeOrderTotals(updated.id)

    await logActivity({
      type: "ORDER_PLACED",
      description: `Customer cancelled order ${updated.orderNumber}`,
      userId: updated.userId,
      metadata: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        previousStatus: order.status,
        newStatus: updated.status,
      },
    })

    return NextResponse.json({
      success: true,
      order: updated,
    })
  } catch (error) {
    console.error("customer cancel order POST error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel order" },
      { status: 500 }
    )
  }
}
