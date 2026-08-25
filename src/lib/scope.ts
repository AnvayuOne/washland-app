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
  storeId: string | null
  managedStoreIds: string[]
}

export function getScope(user: SessionUser): TenantScope {
  const managedStoreIds = normalizeIdList((user.managedStores ?? []) as SelectOption[])
  const storeId = user.storeId ?? managedStoreIds[0] ?? null

  return {
    userId: user.id,
    role: user.role,
    storeId,
    managedStoreIds,
  }
}

export function scopeWhereForStores(scope: TenantScope): Prisma.StoreWhereInput {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return {}
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
    throw new Error("Store is outside your scope")
  }
}
