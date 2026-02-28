import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope, scopeWhereForStores } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import { getEffectiveServiceForStore } from "@/lib/service-pricing"

function parsePrice(input: unknown) {
  if (input === null || input === undefined || input === "") return null
  const value = Number(input)
  if (Number.isNaN(value) || value < 0) return undefined
  return value
}

async function resolveStoreId(requestedStoreId: string | null, scope: ReturnType<typeof getScope>) {
  if (scope.role === "SUPER_ADMIN") {
    if (!requestedStoreId) {
      throw new Error("storeId is required for super admin")
    }

    const store = await prisma.store.findUnique({
      where: { id: requestedStoreId },
      select: { id: true },
    })
    if (!store) {
      throw new Error("Store not found")
    }
    return requestedStoreId
  }

  const stores = await prisma.store.findMany({
    where: {
      ...scopeWhereForStores(scope),
    },
    select: {
      id: true,
    },
    take: 2,
  })

  if (!stores.length) {
    throw new Error("No store is assigned to this account")
  }

  if (requestedStoreId && !stores.some((store) => store.id === requestedStoreId)) {
    throw new Error("Store is outside your scope")
  }

  return requestedStoreId ?? stores[0].id
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const auth = await requireRole(["SUPER_ADMIN", "STORE_ADMIN"])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const body = await request.json()
    const { serviceId } = await params
    const clearOverride = body?.clearOverride === true
    const parsedPrice = parsePrice(body?.price)
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined

    if (!clearOverride && isActive === undefined && parsedPrice === null) {
      return NextResponse.json(
        { success: false, error: "Provide isActive, price, or clearOverride" },
        { status: 400 }
      )
    }

    if (parsedPrice === undefined) {
      return NextResponse.json({ success: false, error: "price must be >= 0" }, { status: 400 })
    }

    const requestedStoreId = typeof body?.storeId === "string" ? body.storeId : null
    const storeId = await resolveStoreId(requestedStoreId, scope)

    const effective = await getEffectiveServiceForStore(serviceId, storeId)
    if (!effective) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 })
    }

    if (isActive === true) {
      if (!effective.record.service.isActive) {
        return NextResponse.json(
          { success: false, error: "Cannot enable a globally inactive service at store level" },
          { status: 400 }
        )
      }

      if (effective.record.franchiseConfig && !effective.record.franchiseConfig.isActive) {
        return NextResponse.json(
          { success: false, error: "Cannot enable a franchise-disabled service at store level" },
          { status: 400 }
        )
      }
    }

    if (clearOverride) {
      await prisma.storeService.deleteMany({
        where: {
          storeId,
          serviceId,
        },
      })
    } else {
      const createPrice = parsedPrice ?? Number(effective.record.effectivePrice)
      const updatePrice =
        parsedPrice ??
        (effective.record.storeOverride ? Number(effective.record.storeOverride.price) : Number(effective.record.effectivePrice))

      await prisma.storeService.upsert({
        where: {
          storeId_serviceId: {
            storeId,
            serviceId,
          },
        },
        update: {
          ...(isActive !== undefined ? { isActive } : {}),
          price: updatePrice,
        },
        create: {
          storeId,
          serviceId,
          isActive: isActive ?? true,
          price: createPrice,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("store service PATCH error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update store service" },
      { status: 400 }
    )
  }
}
