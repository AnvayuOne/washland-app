import { NextResponse } from "next/server"
import { OrderStatus } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RiderWorkflowStatus =
  | "PICKUP_SCHEDULED"
  | "CONFIRMED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"

function toWorkflowStatus(status: OrderStatus): RiderWorkflowStatus {
  switch (status) {
    case "IN_PROGRESS":
      return "PICKED_UP"
    case "READY_FOR_PICKUP":
      return "OUT_FOR_DELIVERY"
    case "DELIVERED":
    case "COMPLETED":
      return "DELIVERED"
    case "CONFIRMED":
      return "CONFIRMED"
    default:
      return "PICKUP_SCHEDULED"
  }
}

export async function GET() {
  try {
    const authResult = await requireRole(["RIDER"])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const riderId = authResult.id

    const jobs = await prisma.order.findMany({
      where: {
        OR: [{ pickupRiderId: riderId }, { deliveryRiderId: riderId }],
        status: {
          in: ["CONFIRMED", "IN_PROGRESS", "READY_FOR_PICKUP", "DELIVERED", "COMPLETED"],
        },
      },
      include: {
        address: {
          select: {
            title: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
            state: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: [{ pickupDate: "asc" }, { updatedAt: "desc" }],
    })

    const transformedJobs = jobs.map((job) => {
      const itemsCount = job.items.reduce((sum, item) => sum + item.quantity, 0)
      return {
        id: job.id,
        orderNumber: job.orderNumber,
        status: job.status,
        riderStatus: toWorkflowStatus(job.status),
        scheduledPickupAt: job.pickupDate,
        pickupAddressSummary: job.address
          ? `${job.address.street}, ${job.address.city}, ${job.address.state} ${job.address.zipCode}`
          : null,
        address: job.address,
        store: job.store,
        itemsCount,
        totalAmount: job.totalAmount,
        updatedAt: job.updatedAt,
      }
    })

    const counts = transformedJobs.reduce(
      (acc, job) => {
        if (job.status === "CONFIRMED") {
          acc.pendingPickup += 1
        } else if (job.status === "IN_PROGRESS" || job.status === "READY_FOR_PICKUP") {
          acc.inProgress += 1
        } else if (job.status === "DELIVERED" || job.status === "COMPLETED") {
          acc.completed += 1
        }
        return acc
      },
      { pendingPickup: 0, inProgress: 0, completed: 0 }
    )

    return NextResponse.json({
      success: true,
      jobs: transformedJobs,
      counts: {
        ...counts,
        total: transformedJobs.length,
      },
    })
  } catch (error) {
    console.error("rider jobs GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch rider jobs" },
      { status: 500 }
    )
  }
}
