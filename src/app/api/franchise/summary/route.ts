import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

export async function GET() {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLast30Days = new Date(now)
    startOfLast30Days.setDate(now.getDate() - 29)
    startOfLast30Days.setHours(0, 0, 0, 0)

    const [
      storeCount,
      activeOrdersCount,
      todayOrdersCount,
      monthlyRevenue,
      topServiceBuckets,
      recentOrders,
      revenueSeriesOrders,
    ] = await Promise.all([
      prisma.store.count({
        where: {
          franchiseId: context.franchiseId,
        },
      }),
      prisma.order.count({
        where: {
          store: { franchiseId: context.franchiseId },
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
      }),
      prisma.order.count({
        where: {
          store: { franchiseId: context.franchiseId },
          createdAt: {
            gte: startOfToday,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          store: { franchiseId: context.franchiseId },
          createdAt: {
            gte: startOfMonth,
          },
          OR: [
            { paymentStatus: "PAID" },
            { status: "CONFIRMED" },
            { status: "IN_PROGRESS" },
            { status: "READY_FOR_PICKUP" },
            { status: "DELIVERED" },
            { status: "COMPLETED" },
          ],
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ["serviceId"],
        where: {
          order: {
            store: { franchiseId: context.franchiseId },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          store: { franchiseId: context.franchiseId },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          updatedAt: true,
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          store: { franchiseId: context.franchiseId },
          createdAt: { gte: startOfLast30Days },
          OR: [
            { paymentStatus: "PAID" },
            { status: "CONFIRMED" },
            { status: "IN_PROGRESS" },
            { status: "READY_FOR_PICKUP" },
            { status: "DELIVERED" },
            { status: "COMPLETED" },
          ],
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      }),
    ])

    const topServiceIds = topServiceBuckets.map((bucket) => bucket.serviceId)
    const topServicesById = topServiceIds.length
      ? await prisma.service.findMany({
          where: {
            id: { in: topServiceIds },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

    const topServicesNameMap = new Map(topServicesById.map((service) => [service.id, service.name]))

    const topServices = topServiceBuckets.map((bucket) => ({
      serviceId: bucket.serviceId,
      serviceName: topServicesNameMap.get(bucket.serviceId) ?? "Unknown Service",
      totalQuantity: bucket._sum.quantity ?? 0,
    }))

    const revenueByDayMap = new Map<string, number>()
    for (const order of revenueSeriesOrders) {
      const dayKey = order.createdAt.toISOString().slice(0, 10)
      const current = revenueByDayMap.get(dayKey) ?? 0
      revenueByDayMap.set(dayKey, current + Number(order.totalAmount))
    }

    const revenueByDay = Array.from(revenueByDayMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }))

    return NextResponse.json({
      success: true,
      summary: {
        storeCount,
        activeOrdersCount,
        todayOrdersCount,
        revenueThisMonth: Number(monthlyRevenue._sum.totalAmount ?? 0),
      },
      topServices,
      recentActivity: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt,
        store: order.store,
        customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest",
      })),
      revenueByDay,
    })
  } catch (error) {
    console.error("franchise summary GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load summary" },
      { status: 500 }
    )
  }
}
