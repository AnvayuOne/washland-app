import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/loyalty/config
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        let config = await prisma.loyaltyConfiguration.findFirst()

        if (!config) {
            // Create default if not exists
            config = await prisma.loyaltyConfiguration.create({
                data: {
                    pointsPerOrderCurrency: 1,
                    pointsForSignUp: 50,
                    pointsForReferral: 100,
                    minOrderForPoints: 100
                }
            })
        }

        return NextResponse.json({
            success: true,
            config
        })

    } catch (error) {
        console.error('Error fetching loyalty config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/admin/loyalty/config - Update config
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const body = await request.json()
        const {
            pointsPerOrderCurrency,
            pointsForSignUp,
            pointsForReferral,
            minOrderForPoints,
            isActive
        } = body

        // Validate inputs (ensure positive integers)
        if (
            pointsPerOrderCurrency < 0 ||
            pointsForSignUp < 0 ||
            pointsForReferral < 0 ||
            minOrderForPoints < 0
        ) {
            return NextResponse.json(
                { error: 'Values must be non-negative' },
                { status: 400 }
            )
        }

        // Upsert equivalent logic since we only want one row
        const firstConfig = await prisma.loyaltyConfiguration.findFirst()

        let config
        if (firstConfig) {
            config = await prisma.loyaltyConfiguration.update({
                where: { id: firstConfig.id },
                data: {
                    pointsPerOrderCurrency,
                    pointsForSignUp,
                    pointsForReferral,
                    minOrderForPoints,
                    isActive
                }
            })
        } else {
            config = await prisma.loyaltyConfiguration.create({
                data: {
                    pointsPerOrderCurrency,
                    pointsForSignUp,
                    pointsForReferral,
                    minOrderForPoints,
                    isActive
                }
            })
        }

        return NextResponse.json({
            success: true,
            config,
            message: 'Loyalty configuration updated successfully'
        })

    } catch (error) {
        console.error('Error updating loyalty config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
