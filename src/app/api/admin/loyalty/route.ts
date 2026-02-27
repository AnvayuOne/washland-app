import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/loyalty - Get loyalty points history
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const points = await prisma.loyaltyPoint.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      points
    })

  } catch (error) {
    console.error('Error fetching loyalty points:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}