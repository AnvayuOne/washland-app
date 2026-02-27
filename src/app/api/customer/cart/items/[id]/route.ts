import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems, recomputeCartSubtotal } from "@/lib/cart"
import { prisma } from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const quantity = Number(body?.quantity)

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "quantity must be an integer >= 1" }, { status: 400 })
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id,
        cart: {
          userId: auth.id,
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        cartId: true,
        unitPrice: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity,
        lineTotal: item.unitPrice.mul(quantity),
      },
    })

    await recomputeCartSubtotal(item.cartId)
    const updatedCart = await getActiveCartWithItems(auth.id)

    return NextResponse.json({
      success: true,
      cart: cartResponse(updatedCart),
    })
  } catch (error) {
    console.error("Error updating cart item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    const item = await prisma.cartItem.findFirst({
      where: {
        id,
        cart: {
          userId: auth.id,
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        cartId: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: item.id } })
    await recomputeCartSubtotal(item.cartId)

    const updatedCart = await getActiveCartWithItems(auth.id)
    return NextResponse.json({
      success: true,
      cart: cartResponse(updatedCart),
    })
  } catch (error) {
    console.error("Error deleting cart item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

