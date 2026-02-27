import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    if (!id) {
      return apiError("Subscription id is required", 400)
    }

    const existing = await prisma.subscription.findFirst({
      where: {
        id,
        userId: auth.id,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!existing) {
      return apiError("Subscription not found", 404)
    }

    if (existing.status === "CANCELLED" || existing.status === "EXPIRED") {
      return apiError(`Subscription is already ${existing.status.toLowerCase()}`, 400)
    }

    const cancelled = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        autoRenew: false,
        endAt: new Date(),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            billingCycle: true,
            price: true,
            currency: true,
          },
        },
      },
    })

    return apiSuccess({
      subscription: {
        id: cancelled.id,
        status: cancelled.status,
        endAt: cancelled.endAt,
        autoRenew: cancelled.autoRenew,
        plan: cancelled.plan
          ? {
              ...cancelled.plan,
              price: Number(cancelled.plan.price),
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    return apiError("Internal server error", 500)
  }
}
