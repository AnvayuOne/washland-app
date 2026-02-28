import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

export async function GET() {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const stores = await prisma.store.findMany({
      where: {
        franchiseId: context.franchiseId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        isActive: true,
        createdAt: true,
      },
    })

    const storeIds = stores.map((store) => store.id)
    const ordersByStore = storeIds.length
      ? await prisma.order.findMany({
          where: {
            storeId: { in: storeIds },
          },
          select: {
            storeId: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
          },
        })
      : []

    const metricsMap = new Map<string, { ordersCount: number; activeOrdersCount: number; revenue: number }>()
    for (const order of ordersByStore) {
      const metrics = metricsMap.get(order.storeId) ?? { ordersCount: 0, activeOrdersCount: 0, revenue: 0 }
      metrics.ordersCount += 1
      if (order.status !== "COMPLETED" && order.status !== "CANCELLED") {
        metrics.activeOrdersCount += 1
      }
      if (order.paymentStatus === "PAID") {
        metrics.revenue += Number(order.totalAmount)
      }
      metricsMap.set(order.storeId, metrics)
    }

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
        ...store,
        addressSummary: `${store.address}, ${store.city}, ${store.state} ${store.zipCode}`,
        kpis: metricsMap.get(store.id) ?? { ordersCount: 0, activeOrdersCount: 0, revenue: 0 },
      })),
    })
  } catch (error) {
    console.error("franchise stores GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load stores" },
      { status: 500 }
    )
  }
}
