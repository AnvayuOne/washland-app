import { Prisma, UserRole } from "@prisma/client"
import type { SessionUser } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

type SelectOption = { id?: string } | string

function normalizeIdList(values: SelectOption[] | undefined): string[] {
  if (!values) return []

  return values
    .map((value) => {
      if (typeof value === "string") return value
      return value.id
    })
    .filter((value): value is string => Boolean(value))
}

export interface TenantScope {
  userId: string
  role: UserRole
  franchiseId: string | null
  storeId: string | null
  managedFranchiseIds: string[]
  managedStoreIds: string[]
}

export function getScope(user: SessionUser): TenantScope {
  const managedFranchiseIds = normalizeIdList((user.managedFranchises ?? []) as SelectOption[])
  const managedStoreIds = normalizeIdList((user.managedStores ?? []) as SelectOption[])

  const franchiseId = user.franchiseId ?? managedFranchiseIds[0] ?? null
  const storeId = user.storeId ?? managedStoreIds[0] ?? null

  return {
    userId: user.id,
    role: user.role,
    franchiseId,
    storeId,
    managedFranchiseIds,
    managedStoreIds,
  }
}

export function scopeWhereForStores(scope: TenantScope): Prisma.StoreWhereInput {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return {}
  }

  if (scope.role === UserRole.FRANCHISE_ADMIN) {
    const franchiseIds = [scope.franchiseId, ...scope.managedFranchiseIds].filter(
      (value): value is string => Boolean(value)
    )
    return franchiseIds.length
      ? { franchiseId: { in: Array.from(new Set(franchiseIds)) } }
      : { id: "__forbidden__" }
  }

  if (scope.role === UserRole.STORE_ADMIN) {
    const storeIds = [scope.storeId, ...scope.managedStoreIds].filter(
      (value): value is string => Boolean(value)
    )
    return storeIds.length ? { id: { in: Array.from(new Set(storeIds)) } } : { id: "__forbidden__" }
  }

  return { id: "__forbidden__" }
}

export function scopeWhereForOrders(scope: TenantScope): Prisma.OrderWhereInput {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return {}
  }

  if (scope.role === UserRole.FRANCHISE_ADMIN) {
    const franchiseIds = [scope.franchiseId, ...scope.managedFranchiseIds].filter(
      (value): value is string => Boolean(value)
    )
    return franchiseIds.length
      ? { store: { franchiseId: { in: Array.from(new Set(franchiseIds)) } } }
      : { id: "__forbidden__" }
  }

  if (scope.role === UserRole.STORE_ADMIN) {
    const storeIds = [scope.storeId, ...scope.managedStoreIds].filter(
      (value): value is string => Boolean(value)
    )
    return storeIds.length ? { storeId: { in: Array.from(new Set(storeIds)) } } : { id: "__forbidden__" }
  }

  if (scope.role === UserRole.CUSTOMER) {
    return { userId: scope.userId }
  }

  if (scope.role === UserRole.RIDER) {
    return {
      OR: [{ pickupRiderId: scope.userId }, { deliveryRiderId: scope.userId }],
    }
  }

  return { id: "__forbidden__" }
}

export async function assertStoreInScope(storeId: string, scope: TenantScope) {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ...scopeWhereForStores(scope),
    },
    select: { id: true },
  })

  if (!store) {
    throw new Error("Store is outside your tenant scope")
  }
}

export async function assertFranchiseInScope(franchiseId: string, scope: TenantScope) {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return
  }

  if (scope.role !== UserRole.FRANCHISE_ADMIN) {
    throw new Error("Franchise is outside your tenant scope")
  }

  const allowedIds = new Set([scope.franchiseId, ...scope.managedFranchiseIds].filter(Boolean))
  if (!allowedIds.has(franchiseId)) {
    throw new Error("Franchise is outside your tenant scope")
  }
}
