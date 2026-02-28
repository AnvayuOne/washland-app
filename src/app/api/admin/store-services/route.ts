import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope, scopeWhereForStores } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import { listEffectiveServicesForStore } from "@/lib/service-pricing"

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(["SUPER_ADMIN", "STORE_ADMIN"])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { searchParams } = new URL(request.url)
    const requestedStoreId = searchParams.get("storeId")
    const includeInactive = searchParams.get("includeInactive") === "true"
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    const storeId = await resolveStoreId(requestedStoreId, scope)
    const { store, records } = await listEffectiveServicesForStore(storeId, {
      includeInactive,
      categoryName: category,
      search,
    })

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        franchiseId: store.franchiseId,
      },
      services: records.map((record) => ({
        id: record.service.id,
        name: record.service.name,
        description: record.service.description,
        category: record.service.serviceCategory?.name ?? record.service.category,
        categoryId: record.service.categoryId,
        globalBasePrice: Number(record.service.basePrice),
        globalActive: record.service.isActive,
        franchiseConfig: record.franchiseConfig
          ? {
              id: record.franchiseConfig.id,
              isActive: record.franchiseConfig.isActive,
              defaultPrice:
                record.franchiseConfig.defaultPrice !== null
                  ? Number(record.franchiseConfig.defaultPrice)
                  : null,
            }
          : null,
        storeOverride: record.storeOverride
          ? {
              id: record.storeOverride.id,
              isActive: record.storeOverride.isActive,
              price: Number(record.storeOverride.price),
            }
          : null,
        effectivePrice: Number(record.effectivePrice),
        priceSource: record.priceSource,
        isAvailable: record.isAvailable,
      })),
    })
  } catch (error) {
    console.error("store services GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load store services" },
      { status: 400 }
    )
  }
}
