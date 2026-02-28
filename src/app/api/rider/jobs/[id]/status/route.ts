import { NextResponse } from "next/server"
import { OrderStatus } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canTransition, statusLabel, type OrderStatusValue } from "@/lib/orderStatus"
import { logActivity } from "@/lib/activity-logger"

type RiderStatusRequest = "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED"

const RIDER_STATUS_TO_ORDER_STATUS: Record<RiderStatusRequest, OrderStatusValue> = {
  PICKED_UP: "IN_PROGRESS",
  OUT_FOR_DELIVERY: "READY_FOR_PICKUP",
  DELIVERED: "DELIVERED",
}

function isRiderStatusRequest(value: string): value is RiderStatusRequest {
  return value === "PICKED_UP" || value === "OUT_FOR_DELIVERY" || value === "DELIVERED"
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["RIDER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const riderId = authResult.id
    const body = await request.json()

    const requestedStatus = typeof body?.status === "string" ? body.status.trim().toUpperCase() : ""
    const note = typeof body?.note === "string" ? body.note.trim() : ""

    if (!isRiderStatusRequest(requestedStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid rider status. Use PICKED_UP, OUT_FOR_DELIVERY, or DELIVERED." },
        { status: 400 }
      )
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [{ pickupRiderId: riderId }, { deliveryRiderId: riderId }],
      },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        storeId: true,
        status: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Job not found for this rider" },
        { status: 404 }
      )
    }

    const fromStatus = order.status as OrderStatusValue
    const toStatus = RIDER_STATUS_TO_ORDER_STATUS[requestedStatus]

    if (fromStatus === toStatus) {
      return NextResponse.json({
        success: true,
        message: "Job status unchanged",
        job: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
      })
    }

    if (!canTransition(fromStatus, toStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid transition from ${statusLabel(fromStatus)} to ${statusLabel(toStatus)}.`,
        },
        { status: 400 }
      )
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: toStatus as OrderStatus,
        pickedUpAt:
          toStatus === "IN_PROGRESS"
            ? new Date()
            : undefined,
        deliveredAt:
          toStatus === "DELIVERED"
            ? new Date()
            : undefined,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
    })

    await logActivity({
      type: "RIDER_STATUS_UPDATE",
      description: `Rider updated order ${updatedOrder.orderNumber} from ${statusLabel(fromStatus)} to ${statusLabel(toStatus)}`,
      userId: riderId,
      metadata: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        from: fromStatus,
        to: toStatus,
        riderStatus: requestedStatus,
        note: note || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Job status updated successfully",
      job: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        pickedUpAt: updatedOrder.pickedUpAt,
        deliveredAt: updatedOrder.deliveredAt,
        updatedAt: updatedOrder.updatedAt,
      },
    })
  } catch (error) {
    console.error("rider job status POST error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update rider job status" },
      { status: 500 }
    )
  }
}
