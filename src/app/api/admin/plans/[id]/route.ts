import { NextRequest, NextResponse } from "next/server"
import { requireAdminHybrid } from "@/lib/hybrid-auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { isBillingCycle, isJsonSerializable, isPlanType, toPlanResponse } from "@/lib/subscription-utils"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdminHybrid(request, "SUPER_ADMIN")
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    })

    if (!plan) {
      return apiError("Plan not found", 404)
    }

    return apiSuccess({ plan: toPlanResponse(plan) })
  } catch (error) {
    console.error("Error fetching plan:", error)
    return apiError("Internal server error", 500)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdminHybrid(request, "SUPER_ADMIN")
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existingPlan) {
      return apiError("Plan not found", 404)
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return apiError("Invalid JSON body", 400)
    }

    const updateData: Record<string, any> = {}

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name) return apiError("name cannot be empty", 400)
      updateData.name = name
    }

    if (body?.description !== undefined) {
      updateData.description =
        typeof body.description === "string" && body.description.trim() ? body.description.trim() : null
    }

    if (body?.planType !== undefined) {
      if (!isPlanType(body.planType)) {
        return apiError("invalid planType", 400)
      }
      updateData.planType = body.planType
    }

    if (body?.billingCycle !== undefined) {
      if (!isBillingCycle(body.billingCycle)) {
        return apiError("invalid billingCycle", 400)
      }
      updateData.billingCycle = body.billingCycle
    }

    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price <= 0) {
        return apiError("price must be greater than 0", 400)
      }
      updateData.price = price
    }

    if (body?.currency !== undefined) {
      const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : ""
      if (!currency || currency.length < 3 || currency.length > 8) {
        return apiError("currency must be a valid code", 400)
      }
      updateData.currency = currency
    }

    if (body?.benefitsJson !== undefined) {
      if (!isJsonSerializable(body.benefitsJson)) {
        return apiError("benefitsJson must be JSON serializable", 400)
      }
      updateData.benefitsJson = body.benefitsJson
    }

    if (body?.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    if (body?.storeId !== undefined) {
      const storeId =
        typeof body.storeId === "string" && body.storeId.trim() ? body.storeId.trim() : null
      if (storeId) {
        const store = await prisma.store.findFirst({
          where: { id: storeId, isActive: true },
          select: { id: true },
        })
        if (!store) return apiError("Store not found or inactive", 404)
      }
      updateData.storeId = storeId
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No valid fields provided for update", 400)
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    })

    return apiSuccess({ plan: toPlanResponse(updatedPlan) })
  } catch (error) {
    console.error("Error updating plan:", error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdminHybrid(request, "SUPER_ADMIN")
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    })

    if (!plan) {
      return apiError("Plan not found", 404)
    }

    if (plan._count.subscriptions > 0) {
      return apiError("Cannot delete a plan that already has subscriptions. Deactivate it instead.", 400)
    }

    await prisma.subscriptionPlan.delete({ where: { id } })

    return apiSuccess({ id, message: "Plan deleted" })
  } catch (error) {
    console.error("Error deleting plan:", error)
    return apiError("Internal server error", 500)
  }
}
