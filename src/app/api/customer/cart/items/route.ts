import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems, getOrCreateActiveCart, recomputeCartSubtotal } from "@/lib/cart"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const serviceId = typeof body?.serviceId === "string" ? body.serviceId : ""
    const quantity = Number(body?.quantity)

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId is required" }, { status: 400 })
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "quantity must be an integer >= 1" }, { status: 400 })
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        isActive: true,
      },
      select: {
        id: true,
        basePrice: true,
      },
    })

    if (!service) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 })
    }

    const cart = await getOrCreateActiveCart(auth.id)

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_serviceId: {
          cartId: cart.id,
          serviceId,
        },
      },
    })

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          lineTotal: existingItem.unitPrice.mul(newQuantity),
        },
      })
    } else {
      const unitPrice = new Prisma.Decimal(service.basePrice)
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          serviceId: service.id,
          quantity,
          unitPrice,
          lineTotal: unitPrice.mul(quantity),
        },
      })
    }

    await recomputeCartSubtotal(cart.id)

    const updatedCart = await getActiveCartWithItems(auth.id)
    return NextResponse.json({
      success: true,
      cart: cartResponse(updatedCart),
    })
  } catch (error) {
    console.error("Error adding item to cart:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

