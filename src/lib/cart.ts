import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const DEFAULT_CURRENCY = "INR"

export async function findActiveCart(userId: string) {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getOrCreateActiveCart(userId: string) {
  const existingCart = await findActiveCart(userId)
  if (existingCart) return existingCart

  try {
    return await prisma.cart.create({
      data: {
        userId,
        status: "ACTIVE",
        currency: DEFAULT_CURRENCY,
        subtotal: new Prisma.Decimal(0),
      },
    })
  } catch (error: any) {
    // One ACTIVE cart per user is enforced at DB level; recover from race.
    if (error?.code === "P2002") {
      const racedCart = await findActiveCart(userId)
      if (racedCart) return racedCart
    }
    throw error
  }
}

export async function recomputeCartSubtotal(cartId: string, tx: typeof prisma = prisma) {
  const aggregate = await tx.cartItem.aggregate({
    where: { cartId },
    _sum: { lineTotal: true },
  })

  const subtotal = aggregate._sum.lineTotal ?? new Prisma.Decimal(0)

  return tx.cart.update({
    where: { id: cartId },
    data: { subtotal },
  })
}

export async function getActiveCartWithItems(userId: string) {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
      items: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              category: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })
}

export function cartResponse(cart: Awaited<ReturnType<typeof getActiveCartWithItems>>) {
  if (!cart) return null

  return {
    id: cart.id,
    userId: cart.userId,
    storeId: cart.storeId,
    status: cart.status,
    currency: cart.currency,
    subtotal: Number(cart.subtotal),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    store: cart.store,
    items: cart.items.map((item) => ({
      id: item.id,
      cartId: item.cartId,
      serviceId: item.serviceId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      service: {
        ...item.service,
        basePrice: Number(item.service.basePrice),
      },
    })),
  }
}
