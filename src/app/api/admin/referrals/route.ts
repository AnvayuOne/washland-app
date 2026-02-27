import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/referrals - Get all referrals
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    const referrals = await prisma.referral.findMany({
      where: whereClause,
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        referred: {
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
      referrals
    })

  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}