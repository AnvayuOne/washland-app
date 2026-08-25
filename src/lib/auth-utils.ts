import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

type UserRole = "CUSTOMER" | "STORE_ADMIN" | "FRANCHISE_ADMIN" | "SUPER_ADMIN" | "RIDER"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === "SUPER_ADMIN"
}

export function isFranchiseAdmin(userRole: UserRole): boolean {
  return userRole === "SUPER_ADMIN" || (userRole as string) === "FRANCHISE_ADMIN"
}

export function isStoreAdmin(userRole: UserRole): boolean {
  return userRole === "STORE_ADMIN" || userRole === "SUPER_ADMIN" || (userRole as string) === "FRANCHISE_ADMIN"
}

export function isCustomer(userRole: UserRole): boolean {
  return userRole === "CUSTOMER"
}

export function canManageStores(userRole: UserRole): boolean {
  return userRole === "SUPER_ADMIN" || userRole === "STORE_ADMIN"
}

export function canViewOrders(userRole: UserRole): boolean {
  return true
}

export function canManageOrders(userRole: UserRole): boolean {
  return userRole === "STORE_ADMIN" || userRole === "SUPER_ADMIN" || (userRole as string) === "FRANCHISE_ADMIN"
}

// Role hierarchy - higher number means more permissions
export const ROLE_HIERARCHY: Record<string, number> = {
  "CUSTOMER": 1,
  "RIDER": 2,
  "STORE_ADMIN": 3,
  "FRANCHISE_ADMIN": 3,
  "SUPER_ADMIN": 4
}

export function hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0)
}