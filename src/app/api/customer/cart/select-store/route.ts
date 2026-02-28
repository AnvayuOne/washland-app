import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { cartResponse, getActiveCartWithItems, getOrCreateActiveCart } from "@/lib/cart"
import { prisma } from "@/lib/prisma"
import { getEffectiveServiceForStore } from "@/lib/service-pricing"

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
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const unavailableServices: string[] = []
    const pricedItems: Array<{ id: string; quantity: number; unitPrice: number }> = []

    for (const item of cartItems) {
      const effective = await getEffectiveServiceForStore(item.serviceId, store.id)
      if (!effective || !effective.record.isAvailable) {
        unavailableServices.push(item.service.name)
        continue
      }

      pricedItems.push({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(effective.record.effectivePrice),
      })
    }

    if (unavailableServices.length) {
      return NextResponse.json(
        {
          error: `These services are unavailable for this store: ${unavailableServices.join(", ")}`,
        },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.cart.update({
        where: { id: cart.id },
        data: { storeId: store.id },
      })

      for (const item of pricedItems) {
        await tx.cartItem.update({
          where: { id: item.id },
          data: {
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity,
          },
        })
      }

      const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          subtotal,
        },
      })
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
