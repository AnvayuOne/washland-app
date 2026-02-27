import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/orders/analytics - Get order statistics
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const today = new Date()
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 7)

        // 1. Total Revenue (Sum of all PAID orders)
        const revenueResult = await prisma.order.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                paymentStatus: 'PAID'
            }
        })

        // 2. Orders by Status
        const ordersByStatus = await prisma.order.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        })

        // 3. Last 7 Days Revenue (Daily breakdown)
        // Prisma doesn't support sophisticated date grouping easily in all DBs.
        // simpler approach: fetch paid orders from last 7 days and group in JS.
        const recentOrders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: last7Days
                },
                paymentStatus: 'PAID'
            },
            select: {
                createdAt: true,
                totalAmount: true
            }
        })

        // Process daily revenue
        const dailyRevenue: Record<string, number> = {}
        // Initialize last 7 days with 0
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            // Format YYYY-MM-DD for key
            const key = d.toISOString().split('T')[0]
            dailyRevenue[key] = 0
        }

        recentOrders.forEach(order => {
            const key = new Date(order.createdAt).toISOString().split('T')[0]
            if (dailyRevenue[key] !== undefined) {
                // prisma returns Decimal, need to convert
                dailyRevenue[key] += Number(order.totalAmount)
            }
        })

        // Formatting for frontend chart
        const dailyRevenueArray = Object.entries(dailyRevenue)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(item => ({
                ...item,
                displayDate: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
            }))


        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue: Number(revenueResult._sum.totalAmount) || 0,
                ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count.id })),
                dailyRevenue: dailyRevenueArray
            }
        })

    } catch (error) {
        console.error('Error fetching order analytics:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
