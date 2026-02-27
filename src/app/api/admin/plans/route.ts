import { NextRequest, NextResponse } from "next/server"
import { requireAdminHybrid } from "@/lib/hybrid-auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { isBillingCycle, isJsonSerializable, isPlanType, toPlanResponse } from "@/lib/subscription-utils"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, "SUPER_ADMIN")
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const includeInactive = searchParams.get("includeInactive") === "true"

    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
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
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    })

    return apiSuccess({ plans: plans.map(toPlanResponse) })
  } catch (error) {
    console.error("Error fetching plans:", error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, "SUPER_ADMIN")
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return apiError("Invalid JSON body", 400)
    }

    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const description = typeof body?.description === "string" ? body.description.trim() : null
    const planType = typeof body?.planType === "string" ? body.planType : ""
    const billingCycle = typeof body?.billingCycle === "string" ? body.billingCycle : ""
    const price = Number(body?.price)
    const currency = typeof body?.currency === "string" ? body.currency.trim().toUpperCase() : "INR"
    const benefitsJson = body?.benefitsJson ?? null
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true
    const storeId = typeof body?.storeId === "string" && body.storeId.trim() ? body.storeId.trim() : null

    if (!name) {
      return apiError("name is required", 400)
    }

    if (!isPlanType(planType)) {
      return apiError("invalid planType", 400)
    }

    if (!isBillingCycle(billingCycle)) {
      return apiError("invalid billingCycle", 400)
    }

    if (!Number.isFinite(price) || price <= 0) {
      return apiError("price must be greater than 0", 400)
    }

    if (!currency || currency.length < 3 || currency.length > 8) {
      return apiError("currency must be a valid code", 400)
    }

    if (!isJsonSerializable(benefitsJson)) {
      return apiError("benefitsJson must be JSON serializable", 400)
    }

    if (storeId) {
      const store = await prisma.store.findFirst({
        where: { id: storeId, isActive: true },
        select: { id: true, isActive: true },
      })
      if (!store) {
        return apiError("Store not found or inactive", 404)
      }
    }

    const createdPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        planType,
        billingCycle,
        price,
        currency,
        benefitsJson,
        isActive,
        storeId,
      },
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

    return apiSuccess({ plan: toPlanResponse(createdPlan) }, 201)
  } catch (error) {
    console.error("Error creating plan:", error)
    return apiError("Internal server error", 500)
  }
}
