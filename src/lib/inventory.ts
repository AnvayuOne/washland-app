import { InventoryMovementType, Prisma, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { TenantScope } from "@/lib/scope"
import { scopeWhereForStores } from "@/lib/scope"

export const INVENTORY_ALLOWED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FRANCHISE_ADMIN,
  UserRole.STORE_ADMIN,
]

export interface AccessibleStore {
  id: string
  name: string
  franchiseId: string
  franchise: {
    id: string
    name: string
  }
}

export async function resolveAccessibleStores(scope: TenantScope, requestedStoreId?: string | null) {
  const stores = await prisma.store.findMany({
    where: scopeWhereForStores(scope),
    select: {
      id: true,
      name: true,
      franchiseId: true,
      franchise: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ franchise: { name: "asc" } }, { name: "asc" }],
  })

  if (!stores.length) {
    throw new Error("No stores available in your tenant scope")
  }

  if (requestedStoreId) {
    const match = stores.find((store) => store.id === requestedStoreId)
    if (!match) {
      throw new Error("Store is outside your tenant scope")
    }
    return {
      stores: [match] as AccessibleStore[],
      storeIds: [match.id],
      selectedStore: match as AccessibleStore,
    }
  }

  if (scope.role === UserRole.STORE_ADMIN) {
    const preferred = stores.find((store) => store.id === scope.storeId) ?? stores[0]
    return {
      stores: [preferred] as AccessibleStore[],
      storeIds: [preferred.id],
      selectedStore: preferred as AccessibleStore,
    }
  }

  return {
    stores: stores as AccessibleStore[],
    storeIds: stores.map((store) => store.id),
    selectedStore: null,
  }
}

export function parseNumericInput(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const next = Number(value)
  if (!Number.isFinite(next)) return null
  return next
}

export function applyMovement(
  stockBefore: number,
  type: InventoryMovementType,
  quantity: number,
  adjustTo?: number | null
) {
  let delta = 0

  if (type === InventoryMovementType.STOCK_IN || type === InventoryMovementType.TRANSFER_IN) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0")
    }
    delta = quantity
  } else if (
    type === InventoryMovementType.STOCK_OUT ||
    type === InventoryMovementType.TRANSFER_OUT ||
    type === InventoryMovementType.WASTAGE ||
    type === InventoryMovementType.MAINTENANCE
  ) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0")
    }
    delta = -quantity
  } else if (type === InventoryMovementType.ADJUSTMENT) {
    if (adjustTo !== null && adjustTo !== undefined) {
      delta = adjustTo - stockBefore
    } else if (quantity !== 0) {
      delta = quantity
    } else {
      throw new Error("Adjustment needs adjustTo or non-zero quantity")
    }
  }

  const stockAfter = stockBefore + delta
  if (stockAfter < 0) {
    throw new Error("Stock cannot go below 0")
  }

  return { delta, stockAfter }
}

export function inventoryItemWhereInput(options: {
  storeIds: string[]
  includeInactive?: boolean
  search?: string | null
  type?: string | null
}) {
  const where: Prisma.InventoryItemWhereInput = {
    storeId: { in: options.storeIds },
  }

  if (!options.includeInactive) {
    where.isActive = true
  }

  if (options.search?.trim()) {
    const query = options.search.trim()
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ]
  }

  if (options.type && options.type !== "all") {
    where.type = options.type as any
  }

  return where
}
