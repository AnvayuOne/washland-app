import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: {
        id,
        store: {
          franchiseId: context.franchiseId,
        },
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
            service: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
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

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const activities = await prisma.activity.findMany({
      where: {
        metadata: {
          path: ["orderId"],
          equals: order.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        type: true,
        description: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order,
      activities,
    })
  } catch (error) {
    console.error("franchise order detail GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load order detail" },
      { status: 500 }
    )
  }
}
