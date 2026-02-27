import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const DEFAULT_ORDER_CURRENCY = "INR"

export interface MonetaryItemInput {
  quantity: number
  unitPrice: Prisma.Decimal | string | number
}

export interface ComputedMonetaryItem {
  quantity: number
  unitPrice: Prisma.Decimal
  lineTotal: Prisma.Decimal
}

export interface ComputedOrderTotals {
  subtotal: Prisma.Decimal
  discount: Prisma.Decimal
  tax: Prisma.Decimal
  total: Prisma.Decimal
  totalAmount: Prisma.Decimal
  currency: string
}

function toDecimal(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0)
  }
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value)
}

export function normalizeCurrencyCode(currency: unknown) {
  if (typeof currency !== "string") {
    return DEFAULT_ORDER_CURRENCY
  }
  const normalized = currency.trim().toUpperCase()
  return normalized || DEFAULT_ORDER_CURRENCY
}

export function computeOrderItems(items: MonetaryItemInput[]): ComputedMonetaryItem[] {
  return items.map((item) => {
    const quantity = Number(item.quantity)
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
    const unitPrice = toDecimal(item.unitPrice)
    return {
      quantity: safeQuantity,
      unitPrice,
      lineTotal: unitPrice.mul(safeQuantity),
    }
  })
}

export function computeOrderTotals(
  items: ComputedMonetaryItem[],
  options?: {
    discount?: Prisma.Decimal | string | number
    tax?: Prisma.Decimal | string | number
    currency?: string
  }
): ComputedOrderTotals {
  const subtotal = items.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0))
  const discount = toDecimal(options?.discount)
  const tax = toDecimal(options?.tax)
  const total = subtotal.sub(discount).add(tax)
  const currency = normalizeCurrencyCode(options?.currency)

  return {
    subtotal,
    discount,
    tax,
    total,
    totalAmount: total,
    currency,
  }
}

function resolveLegacyUnitPrice(item: { unitPrice: Prisma.Decimal; price: Prisma.Decimal }) {
  if (!item.unitPrice.eq(0)) return item.unitPrice
  return item.price
}

export async function recomputeOrderTotals(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        currency: true,
        discount: true,
        tax: true,
      },
    })

    if (!order) {
      throw new Error("Order not found for totals recomputation")
    }

    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        price: true,
      },
    })

    const normalizedItems = orderItems.map((item) => {
      const unitPrice = resolveLegacyUnitPrice(item)
      const lineTotal = unitPrice.mul(item.quantity)
      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      }
    })

    for (const item of normalizedItems) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          price: item.unitPrice,
        },
      })
    }

    const totals = computeOrderTotals(
      normalizedItems.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      {
        discount: order.discount,
        tax: order.tax,
        currency: order.currency,
      }
    )

    return tx.order.update({
      where: { id: orderId },
      data: {
        currency: totals.currency,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        totalAmount: totals.totalAmount,
      },
    })
  })
}

