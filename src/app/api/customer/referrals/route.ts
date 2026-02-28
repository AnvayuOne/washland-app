// Fixed malformed structure: removed nested imports and nested GET declaration,
// and replaced with a single valid GET handler that returns a safe placeholder payload.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const user = await prisma.user.findUnique({
      where: { id: scope.userId },
      select: {
        referralCode: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const config = await prisma.loyaltyConfiguration.findFirst({
      select: { pointsForReferral: true }
    })

    return NextResponse.json({
      success: true,
      referral: {
        referralCode: user.referralCode || 'GENERATE-ME',
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        referralHistory: [],
        bonusStructure: [
          {
            condition: 'Your friend completes their first order',
            bonus: config?.pointsForReferral || 100,
            type: 'POINTS'
          }
        ]
      },
      note: 'Temporary safe placeholder response while referral implementation is being repaired.'
    })
  } catch (error) {
    console.error('Error fetching referral data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
