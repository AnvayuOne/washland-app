import { NextRequest, NextResponse } from "next/server"
import { BillingCycle } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-response"
import { toSubscriptionResponse } from "@/lib/subscription-utils"

function addRenewDate(startAt: Date, cycle: BillingCycle) {
  const renewAt = new Date(startAt)
  if (cycle === "WEEKLY") {
    renewAt.setDate(renewAt.getDate() + 7)
    return renewAt
  }

  if (cycle === "MONTHLY") {
    renewAt.setMonth(renewAt.getMonth() + 1)
    return renewAt
  }

  if (cycle === "QUARTERLY") {
    renewAt.setMonth(renewAt.getMonth() + 3)
    return renewAt
  }

  renewAt.setFullYear(renewAt.getFullYear() + 1)
  return renewAt
}

export async function GET() {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: auth.id,
      },
      include: {
        plan: true,
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess({ subscriptions: subscriptions.map(toSubscriptionResponse) })
  } catch (error) {
    console.error("Error fetching customer subscriptions:", error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return apiError("Invalid JSON body", 400)
    }

    const planId = typeof body?.planId === "string" ? body.planId.trim() : ""
    const requestedStoreId =
      typeof body?.storeId === "string" && body.storeId.trim() ? body.storeId.trim() : null
    const activateNow = body?.activateNow === true
    const autoRenew = body?.autoRenew !== undefined ? body.autoRenew === true : true

    if (!planId) {
      return apiError("planId is required", 400)
    }

    if (body?.activateNow !== undefined && typeof body.activateNow !== "boolean") {
      return apiError("activateNow must be a boolean", 400)
    }

    if (body?.autoRenew !== undefined && typeof body.autoRenew !== "boolean") {
      return apiError("autoRenew must be a boolean", 400)
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
      select: {
        id: true,
        billingCycle: true,
        storeId: true,
      },
    })

    if (!plan) {
      return apiError("Plan not found or inactive", 404)
    }

    if (plan.storeId && requestedStoreId && requestedStoreId !== plan.storeId) {
      return apiError("Requested store does not match the plan scope", 400)
    }

    const resolvedStoreId = plan.storeId ?? requestedStoreId
    if (!resolvedStoreId) {
      return apiError("storeId is required for plans without store scope", 400)
    }

    const store = await prisma.store.findFirst({
      where: {
        id: resolvedStoreId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!store) {
      return apiError("Store not found or inactive", 404)
    }

    const existing = await prisma.subscription.findFirst({
      where: {
        userId: auth.id,
        planId: plan.id,
        storeId: resolvedStoreId,
        status: {
          in: ["ACTIVE", "PAYMENT_PENDING"],
        },
      },
      include: {
        plan: true,
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      return apiSuccess(
        {
          subscription: toSubscriptionResponse(existing),
          message: "Existing active/pending subscription returned",
        },
        200
      )
    }

    const startAt = new Date()
    const renewAt = addRenewDate(startAt, plan.billingCycle)

    const subscription = await prisma.subscription.create({
      data: {
        userId: auth.id,
        planId: plan.id,
        storeId: resolvedStoreId,
        status: activateNow ? "ACTIVE" : "PAYMENT_PENDING",
        startAt,
        renewAt,
        autoRenew,
      },
      include: {
        plan: true,
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    })

    return apiSuccess({ subscription: toSubscriptionResponse(subscription) }, 201)
  } catch (error) {
    console.error("Error creating subscription:", error)
    return apiError("Internal server error", 500)
  }
}
