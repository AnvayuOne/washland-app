import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems } from "@/lib/cart"

export async function GET() {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const cart = await getActiveCartWithItems(auth.id)

    return NextResponse.json({
      success: true,
      cart: cartResponse(cart),
    })
  } catch (error) {
    console.error("Error fetching customer cart:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

