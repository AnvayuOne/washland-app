import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "./prisma"

/**
 * Hybrid authentication helper that checks both NextAuth session and API key/header auth
 * This supports both session-based and localStorage-based authentication
 */
export async function requireHybridAdmin(
  request: Request,
  allowedRoles: UserRole[] | UserRole = ["SUPER_ADMIN"]
) {
  const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  // First, try NextAuth session (preferred method)
  const session = await getServerSession(authOptions)
  if (session?.user?.role) {
    const role = session.user.role as UserRole
    if (allowedRolesArray.includes(role)) {
      return { user: session.user, method: 'session' }
    }
  }

  // Fallback: Check for email/role in headers (for localStorage auth)
  const userEmail = request.headers.get('x-user-email')
  const userRole = request.headers.get('x-user-role')
  
  if (userEmail && userRole) {
    const role = userRole as UserRole
    if (allowedRolesArray.includes(role)) {
      // Verify the user exists in database
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true, role: true, isActive: true }
      })
      
      if (user && user.isActive && user.role === role) {
        return { 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          }, 
          method: 'header' 
        }
      }
    }
  }

  // No valid authentication found
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/**
 * Backward compatible version of requireAdmin with hybrid support
 */
export async function requireAdminHybrid(
  request?: Request,
  allowedRoles: UserRole[] | UserRole = ["SUPER_ADMIN"]
) {
  const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  // If no request provided, fall back to NextAuth only (for backward compatibility)
  if (!request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role as UserRole | undefined
    if (!role || !allowedRolesArray.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return session.user
  }

  // Use hybrid authentication
  const result = await requireHybridAdmin(request, allowedRolesArray)
  if ('user' in result) {
    return result.user
  }
  
  return result // This is the NextResponse error
}

export default requireAdminHybrid
