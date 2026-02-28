import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems, getOrCreateActiveCart, recomputeCartSubtotal } from "@/lib/cart"
import { prisma } from "@/lib/prisma"
import { getEffectiveServiceForStore } from "@/lib/service-pricing"

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

    const cart = await getOrCreateActiveCart(auth.id)
    let unitPrice = new Prisma.Decimal(0)

    if (cart.storeId) {
      const effective = await getEffectiveServiceForStore(serviceId, cart.storeId)
      if (!effective || !effective.record.isAvailable) {
        return NextResponse.json(
          { error: "Service is not available for the selected store" },
          { status: 400 }
        )
      }
      unitPrice = new Prisma.Decimal(effective.record.effectivePrice)
    } else {
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

      unitPrice = new Prisma.Decimal(service.basePrice)
    }

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
          unitPrice,
          lineTotal: unitPrice.mul(newQuantity),
        },
      })
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          serviceId,
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
