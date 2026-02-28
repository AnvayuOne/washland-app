import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isOrderStatus } from "@/lib/orderStatus"
import { assertStoreBelongsToFranchise } from "@/lib/tenant"
import { getFranchiseApiContext, isValidDateInput } from "@/app/api/franchise/_helpers"

export async function GET(request: NextRequest) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")
    const storeId = searchParams.get("storeId")
    const dateFromParam = searchParams.get("dateFrom")
    const dateToParam = searchParams.get("dateTo")

    const whereClause: any = {
      store: {
        franchiseId: context.franchiseId,
      },
    }

    if (statusParam) {
      if (!isOrderStatus(statusParam)) {
        return NextResponse.json({ success: false, error: "Invalid status filter" }, { status: 400 })
      }
      whereClause.status = statusParam
    }

    if (storeId) {
      await assertStoreBelongsToFranchise(storeId, context.franchiseId)
      whereClause.storeId = storeId
    }

    if (dateFromParam || dateToParam) {
      whereClause.createdAt = {}
      if (isValidDateInput(dateFromParam)) {
        whereClause.createdAt.gte = new Date(dateFromParam)
      }
      if (isValidDateInput(dateToParam)) {
        whereClause.createdAt.lte = new Date(dateToParam)
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
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
            city: true,
            state: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        totalItems: order.items.reduce((acc, item) => acc + item.quantity, 0),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        store: order.store,
        customer: order.user
          ? {
              id: order.user.id,
              fullName: `${order.user.firstName} ${order.user.lastName}`,
              email: order.user.email,
              phone: order.user.phone,
            }
          : null,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Store does not belong to your franchise") {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error("franchise orders GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 }
    )
  }
}
