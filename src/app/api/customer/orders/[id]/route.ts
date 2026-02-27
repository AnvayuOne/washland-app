import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(["CUSTOMER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: authResult.id,
      },
      include: {
        items: {
          include: {
            service: true,
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

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("customer order detail GET error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch order" },
      { status: 500 }
    )
  }
}

