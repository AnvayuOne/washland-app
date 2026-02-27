import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeOrderItems, computeOrderTotals, normalizeCurrencyCode } from "@/lib/order-totals"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["CUSTOMER"])
    if (auth instanceof NextResponse) {
      return auth
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: auth.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const normalizedItems = order.items.map((item) => {
      const unitPrice = !item.unitPrice.eq(0) ? item.unitPrice : item.price
      const lineTotal = !item.lineTotal.eq(0) ? item.lineTotal : unitPrice.mul(item.quantity)
      return {
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service?.name || "Unknown Service",
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
        lineTotal: Number(lineTotal),
        notes: item.notes,
      }
    })

    const currency = normalizeCurrencyCode(order.currency)
    const recomputed = computeOrderTotals(
      computeOrderItems(
        normalizedItems.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      ),
      {
        currency,
        discount: order.discount,
        tax: order.tax,
      }
    )

    const subtotal = Number(order.subtotal && !order.subtotal.eq(0) ? order.subtotal : recomputed.subtotal)
    const discount = Number(order.discount || 0)
    const tax = Number(order.tax || 0)
    const total = Number(order.total && !order.total.eq(0) ? order.total : recomputed.total)

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceNumber: `INV-${order.orderNumber}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        issuedAt: new Date().toISOString(),
        orderDate: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        currency,
        customer: order.user
          ? {
              id: order.user.id,
              name: `${order.user.firstName} ${order.user.lastName}`.trim(),
              email: order.user.email,
              phone: order.user.phone,
            }
          : null,
        store: {
          id: order.store.id,
          name: order.store.name,
          address: `${order.store.address}, ${order.store.city}, ${order.store.state} ${order.store.zipCode}`,
          phone: order.store.phone,
          email: order.store.email,
        },
        deliveryAddress: order.address
          ? `${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}`
          : null,
        items: normalizedItems,
        totals: {
          subtotal,
          discount,
          tax,
          total,
        },
      },
    })
  } catch (error) {
    console.error("invoice preview GET error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate invoice preview" },
      { status: 500 }
    )
  }
}
