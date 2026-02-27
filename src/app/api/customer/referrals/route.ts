import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    import { NextRequest, NextResponse } from 'next/server'
    import { prisma } from '@/lib/prisma'

    export async function GET(request: NextRequest) {
      try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || userRole !== 'CUSTOMER') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch User with Referral Data
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            referralCode: true,
            referralsSent: {
              include: {
                referred: {
                  select: {
                    email: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            referralReceived: {
              include: {
                referrer: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            loyaltyPoints: {
              where: { source: 'REFERRAL_REWARD' }
            }
          }
        })

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get Config
        const config = await prisma.loyaltyConfiguration.findFirst()
        const referralBonus = config?.pointsForReferral || 100

        // Calculate Stats
        const totalReferrals = user.referralsSent.length
        const successfulReferrals = user.referralsSent.filter(r => r.status === 'REWARDED').length
        const pendingReferrals = user.referralsSent.filter(r => r.status === 'PENDING').length

        // Calculate Earnings (Mock logic for now - assuming 1 point = ₹0.5 or just points count)
        // In a real scenario, we might sum up the 'points' from loyaltyPoints where source is REFERRAL
        const totalEarnings = user.loyaltyPoints.reduce((sum, p) => sum + p.points, 0)

        const referralHistory = user.referralsSent.map(r => ({
          id: r.id,
          refereeEmail: r.referred?.email || 'Unknown',
          refereeName: r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : undefined,
          status: r.status,
          bonusEarned: r.status === 'REWARDED' ? referralBonus : 0,
          dateReferred: r.createdAt.toISOString(),
          dateCompleted: r.rewardedAt?.toISOString()
        }))

        const referralData = {
          referralCode: user.referralCode || 'GENERATE-ME', // Fallback if old user
          totalReferrals,
          successfulReferrals,
          pendingReferrals,
          totalEarnings,
          referralHistory,
          bonusStructure: [
            {
              condition: 'Your friend completes their first order',
              bonus: referralBonus,
              type: 'POINTS'
            }
          ]
        }

        return NextResponse.json({
          success: true,
          referral: referralData
        })

      } catch (error) {
        console.error('Error fetching referral data:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }