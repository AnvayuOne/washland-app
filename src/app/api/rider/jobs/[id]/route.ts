import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { statusLabel } from "@/lib/orderStatus"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["RIDER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const riderId = authResult.id

    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [{ pickupRiderId: riderId }, { deliveryRiderId: riderId }],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
            state: true,
            address: true,
          },
        },
        address: {
          select: {
            id: true,
            title: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Job not found for this rider" },
        { status: 404 }
      )
    }

    const latestRiderUpdate = await prisma.activity.findFirst({
      where: {
        type: "RIDER_STATUS_UPDATE",
        metadata: {
          path: ["orderId"],
          equals: order.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    })

    const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      success: true,
      job: {
        ...order,
        statusLabel: statusLabel(order.status),
        itemsCount,
        latestRiderUpdate,
      },
    })
  } catch (error) {
    console.error("rider job detail GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch rider job detail" },
      { status: 500 }
    )
  }
}
