import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import { inventoryItemWhereInput, INVENTORY_ALLOWED_ROLES, resolveAccessibleStores } from "@/lib/inventory"

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    const { stores, storeIds, selectedStore } = await resolveAccessibleStores(scope, storeId)
    const where = inventoryItemWhereInput({
      storeIds,
      includeInactive: false,
    })

    const [items, totalsByType] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          storeId: true,
          currentStock: true,
          reorderLevel: true,
          costPerUnit: true,
        },
      }),
      prisma.inventoryItem.groupBy({
        by: ["type"],
        where,
        _count: {
          _all: true,
        },
      }),
    ])

    let lowStockCount = 0
    let outOfStockCount = 0
    let totalStockValue = 0
    const byStore: Record<string, { itemCount: number; lowStockCount: number; stockValue: number }> = {}

    for (const item of items) {
      const currentStock = Number(item.currentStock || 0)
      const reorderLevel = Number(item.reorderLevel || 0)
      const costPerUnit = Number(item.costPerUnit || 0)

      if (currentStock <= 0) {
        outOfStockCount += 1
      }
      if (currentStock <= reorderLevel) {
        lowStockCount += 1
      }

      const stockValue = currentStock * costPerUnit
      totalStockValue += stockValue

      if (!byStore[item.storeId]) {
        byStore[item.storeId] = { itemCount: 0, lowStockCount: 0, stockValue: 0 }
      }
      byStore[item.storeId].itemCount += 1
      byStore[item.storeId].stockValue += stockValue
      if (currentStock <= reorderLevel) {
        byStore[item.storeId].lowStockCount += 1
      }
    }

    const storeSummary = stores.map((store) => ({
      storeId: store.id,
      storeName: store.name,
      franchiseId: store.franchise.id,
      franchiseName: store.franchise.name,
      itemCount: byStore[store.id]?.itemCount || 0,
      lowStockCount: byStore[store.id]?.lowStockCount || 0,
      stockValue: byStore[store.id]?.stockValue || 0,
    }))

    return NextResponse.json({
      success: true,
      summary: {
        selectedStoreId: selectedStore?.id || null,
        selectedStoreName: selectedStore?.name || null,
        totals: {
          storesInScope: storeIds.length,
          items: items.length,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          stockValue: totalStockValue,
        },
        byType: totalsByType.map((row) => ({
          type: row.type,
          count: row._count._all,
        })),
        byStore: storeSummary,
      },
    })
  } catch (error) {
    console.error("inventory summary GET error", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to load summary", 500)
  }
}
