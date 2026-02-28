import { NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { requireFranchiseContext } from "@/lib/tenant"

export interface FranchiseApiContext {
  userId: string
  franchiseId: string
  franchiseName: string
  commissionRate: number
}

export async function getFranchiseApiContext(): Promise<FranchiseApiContext | NextResponse> {
  const auth = await requireRole(["FRANCHISE_ADMIN"])
  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const franchise = await requireFranchiseContext(auth)
    return {
      userId: auth.id,
      franchiseId: franchise.franchiseId,
      franchiseName: franchise.franchiseName,
      commissionRate: franchise.commissionRate,
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Franchise context missing" },
      { status: 403 }
    )
  }
}

export function isValidDateInput(value: string | null): value is string {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}
