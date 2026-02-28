import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminHybrid } from "@/lib/hybrid-auth"
import { logActivity } from "@/lib/activity-logger"
import { processOrderCompletionRewards } from "@/lib/loyalty"
import { recomputeOrderTotals } from "@/lib/order-totals"
import { getScope, scopeWhereForOrders } from "@/lib/scope"
import {
  canTransition,
  isOrderStatus,
  statusLabel,
  type OrderStatusValue,
} from "@/lib/orderStatus"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminHybrid(request, ["SUPER_ADMIN", "STORE_ADMIN"])
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const scope = getScope(authResult)

    const { id } = await params
    const body = await request.json()

    const nextStatus = typeof body?.status === "string" ? body.status : ""
    const note = typeof body?.note === "string" ? body.note.trim() : undefined
    const force = body?.force === true

    if (!isOrderStatus(nextStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        AND: [{ id }, scopeWhereForOrders(scope)],
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        store: {
          include: {
            franchise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const fromStatus = existingOrder.status as OrderStatusValue
    const toStatus = nextStatus as OrderStatusValue
    const canForceOverride = authResult.role === "SUPER_ADMIN" && force

    if (!canTransition(fromStatus, toStatus) && !canForceOverride) {
      return NextResponse.json(
        { error: `Invalid status transition from ${fromStatus} to ${toStatus}` },
        { status: 400 }
      )
    }

    if (fromStatus === toStatus) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        status: existingOrder.status,
        message: "Order status unchanged",
      })
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: toStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        store: {
          include: {
            franchise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        address: true,
        items: {
          include: {
            service: true,
          },
        },
        pickupRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        deliveryRider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    await recomputeOrderTotals(updatedOrder.id)

    if (toStatus === "COMPLETED") {
      await processOrderCompletionRewards(updatedOrder.id)
    }

    await logActivity({
      type: toStatus === "COMPLETED" ? "ORDER_COMPLETED" : "ORDER_PLACED",
      description: `Order ${updatedOrder.orderNumber} status changed from ${statusLabel(fromStatus)} to ${statusLabel(toStatus)}`,
      userId: updatedOrder.userId,
      metadata: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        previousStatus: fromStatus,
        newStatus: toStatus,
        note: note || null,
        updatedByRole: authResult.role,
        storeId: updatedOrder.storeId,
      },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order status updated successfully",
    })
  } catch (error) {
    console.error("order status POST error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update status" },
      { status: 500 }
    )
  }
}
