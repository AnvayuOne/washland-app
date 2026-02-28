import { type UserRole } from "@prisma/client"
import { type NextResponse } from "next/server"
import { requireRole, type SessionUser } from "@/lib/rbac"

/**
 * Deprecated name kept for backward compatibility.
 * This now enforces NextAuth session-only auth with explicit roles.
 */
export async function requireHybridAdmin(
  _request: Request | undefined,
  allowedRoles: UserRole[] | UserRole
): Promise<SessionUser | NextResponse> {
  const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  if (!allowedRolesArray.length) {
    throw new Error("requireHybridAdmin requires explicit allowed roles")
  }

  return requireRole(allowedRolesArray)
}

/**
 * Deprecated name kept for backward compatibility.
 * This now enforces NextAuth session-only auth with explicit roles.
 */
export async function requireAdminHybrid(
  request: Request | undefined,
  allowedRoles: UserRole[] | UserRole
): Promise<SessionUser | NextResponse> {
  return requireHybridAdmin(request, allowedRoles)
}

export default requireAdminHybrid

