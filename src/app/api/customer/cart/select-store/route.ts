import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems, getOrCreateActiveCart } from "@/lib/cart"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const storeId = typeof body?.storeId === "string" ? body.storeId : ""

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 })
    }

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 })
    }

    const cart = await getOrCreateActiveCart(auth.id)
    await prisma.cart.update({
      where: { id: cart.id },
      data: { storeId: store.id },
    })

    const updatedCart = await getActiveCartWithItems(auth.id)
    return NextResponse.json({
      success: true,
      cart: cartResponse(updatedCart),
    })
  } catch (error) {
    console.error("Error selecting cart store:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

