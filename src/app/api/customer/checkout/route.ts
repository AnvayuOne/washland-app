import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeOrderItems, computeOrderTotals, normalizeCurrencyCode } from "@/lib/order-totals"

function generateOrderNumber() {
  return `WL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function POST(request: NextRequest) {
  let idempotencyKey = ""
  let customerUserId = ""

  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) return auth
    customerUserId = auth.id

    const body = await request.json()
    idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : ""
    const addressId = typeof body?.addressId === "string" ? body.addressId.trim() : ""

    if (!idempotencyKey) {
      return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 })
    }

    if (!addressId) {
      return NextResponse.json({ error: "addressId is required" }, { status: 400 })
    }

    // Idempotency: if this key already produced an order for this user, return it.
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: customerUserId,
        idempotencyKey,
      },
      select: {
        id: true,
        status: true,
        total: true,
        totalAmount: true,
        currency: true,
      },
    })

    if (existingOrder) {
      return NextResponse.json({
        orderId: existingOrder.id,
        status: existingOrder.status,
        amount: Number(existingOrder.total || existingOrder.totalAmount),
        currency: existingOrder.currency,
      })
    }

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: customerUserId,
      },
      select: { id: true },
    })

    if (!address) {
      return NextResponse.json({ error: "Address not found for customer" }, { status: 404 })
    }

    const activeCart = await prisma.cart.findFirst({
      where: {
        userId: customerUserId,
        status: "ACTIVE",
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!activeCart) {
      return NextResponse.json({ error: "No active cart found" }, { status: 400 })
    }

    if (!activeCart.storeId) {
      return NextResponse.json({ error: "Please select a store before checkout" }, { status: 400 })
    }

    if (activeCart.items.length < 1) {
      return NextResponse.json({ error: "Cart must contain at least one item" }, { status: 400 })
    }

    const store = await prisma.store.findFirst({
      where: {
        id: activeCart.storeId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!store) {
      return NextResponse.json({ error: "Selected store is invalid or inactive" }, { status: 400 })
    }

    const computedItems = computeOrderItems(
      activeCart.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    )
    const totals = computeOrderTotals(computedItems, {
      currency: normalizeCurrencyCode(activeCart.currency)
    })

    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          idempotencyKey,
          userId: customerUserId,
          storeId: activeCart.storeId as string,
          addressId: address.id,
          status: "PAYMENT_PENDING",
          paymentStatus: "PENDING",
          currency: totals.currency,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          totalAmount: totals.totalAmount,
          items: {
            create: activeCart.items.map((item, index) => ({
              serviceId: item.serviceId,
              quantity: computedItems[index].quantity,
              unitPrice: computedItems[index].unitPrice,
              lineTotal: computedItems[index].lineTotal,
              price: computedItems[index].unitPrice,
            })),
          },
        },
        select: {
          id: true,
          status: true,
          total: true,
          totalAmount: true,
          currency: true,
        },
      })

      await tx.cart.update({
        where: { id: activeCart.id },
        data: { status: "CONVERTED" },
      })

      return order
    })

    return NextResponse.json({
      orderId: createdOrder.id,
      status: createdOrder.status,
      amount: Number(createdOrder.total || createdOrder.totalAmount),
      currency: createdOrder.currency,
    })
  } catch (error: any) {
    // In concurrent retries, unique constraint can fire. Return existing idempotent order.
    if (error?.code === "P2002" && customerUserId && idempotencyKey) {
      try {
        const existingOrder = await prisma.order.findFirst({
          where: {
            userId: customerUserId,
            idempotencyKey,
          },
          select: {
            id: true,
            status: true,
            total: true,
            totalAmount: true,
            currency: true,
          },
        })
        if (existingOrder) {
          return NextResponse.json({
            orderId: existingOrder.id,
            status: existingOrder.status,
            amount: Number(existingOrder.total || existingOrder.totalAmount),
            currency: existingOrder.currency,
          })
        }
      } catch {
        // Fall through to generic error response
      }
    }

    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
