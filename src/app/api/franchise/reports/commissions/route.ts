import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext, isValidDateInput } from "@/app/api/franchise/_helpers"

function getDefaultPeriod() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("dateFrom")
    const toParam = searchParams.get("dateTo")

    const defaultPeriod = getDefaultPeriod()
    const periodFrom = isValidDateInput(fromParam) ? new Date(fromParam) : defaultPeriod.from
    const periodTo = isValidDateInput(toParam) ? new Date(toParam) : defaultPeriod.to

    const stores = await prisma.store.findMany({
      where: {
        franchiseId: context.franchiseId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const paidOrders = await prisma.order.findMany({
      where: {
        store: {
          franchiseId: context.franchiseId,
        },
        paymentStatus: "PAID",
        createdAt: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      select: {
        id: true,
        storeId: true,
        totalAmount: true,
      },
    })

    const revenueByStore = new Map<string, number>()
    for (const order of paidOrders) {
      const current = revenueByStore.get(order.storeId) ?? 0
      revenueByStore.set(order.storeId, current + Number(order.totalAmount))
    }

    const storeBreakdown = stores.map((store) => {
      const storeRevenue = revenueByStore.get(store.id) ?? 0
      const storeCommission = storeRevenue * context.commissionRate
      return {
        storeId: store.id,
        storeName: store.name,
        storeRevenue,
        storeCommission: Number(storeCommission.toFixed(2)),
      }
    })

    const totalRevenue = storeBreakdown.reduce((sum, row) => sum + row.storeRevenue, 0)
    const commissionDue = Number((totalRevenue * context.commissionRate).toFixed(2))

    return NextResponse.json({
      success: true,
      period: {
        dateFrom: periodFrom.toISOString(),
        dateTo: periodTo.toISOString(),
      },
      commissionRate: context.commissionRate,
      totals: {
        totalRevenue,
        commissionDue,
      },
      stores: storeBreakdown,
    })
  } catch (error) {
    console.error("franchise commissions GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load commission report" },
      { status: 500 }
    )
  }
}
