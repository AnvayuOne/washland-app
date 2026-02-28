import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"
import { assertStoreBelongsToFranchise } from "@/lib/tenant"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const { id } = await params
    await assertStoreBelongsToFranchise(id, context.franchiseId)

    const [store, ordersCount, activeOrdersCount, paidOrdersAggregate] = await Promise.all([
      prisma.store.findFirst({
        where: {
          id,
          franchiseId: context.franchiseId,
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          storeId: id,
        },
      }),
      prisma.order.count({
        where: {
          storeId: id,
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          storeId: id,
          paymentStatus: "PAID",
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
    ])

    if (!store) {
      return NextResponse.json({ success: false, error: "Store not found" }, { status: 404 })
    }

    const paidRevenue = Number(paidOrdersAggregate._sum.totalAmount ?? 0)
    const paidOrdersCount = paidOrdersAggregate._count._all

    return NextResponse.json({
      success: true,
      store: {
        ...store,
        addressSummary: `${store.address}, ${store.city}, ${store.state} ${store.zipCode}`,
      },
      kpis: {
        ordersCount,
        activeOrdersCount,
        revenue: paidRevenue,
        avgOrderValue: paidOrdersCount > 0 ? Number((paidRevenue / paidOrdersCount).toFixed(2)) : 0,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Store does not belong to your franchise") {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error("franchise store detail GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load store" },
      { status: 500 }
    )
  }
}
