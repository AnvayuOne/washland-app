import { type UserRole } from "@prisma/client"
import type { Session } from "next-auth"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export type SessionUser = Session["user"]

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbid(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export const forbidden = forbid

export async function requireSession(): Promise<SessionUser | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return unauthorized()
  }

  return session.user
}

export async function requireRole(roles: UserRole[]): Promise<SessionUser | NextResponse> {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error("requireRole expects at least one role")
  }

  const sessionUser = await requireSession()
  if (sessionUser instanceof NextResponse) {
    return sessionUser
  }

  if (!roles.includes(sessionUser.role)) {
    return forbid()
  }

  return sessionUser
}

export async function requireAnyRole(...roles: UserRole[]): Promise<SessionUser | NextResponse> {
  return requireRole(roles)
}

