import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActiveLoyaltyConfig } from '@/lib/loyaltyRules'

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(['CUSTOMER'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const points = Number(body?.points)

    if (!Number.isInteger(points) || points <= 0) {
      return NextResponse.json(
        { success: false, error: 'points must be a positive integer' },
        { status: 400 }
      )
    }

    const rules = await getActiveLoyaltyConfig(prisma)

    if (points < rules.minRedeemPoints) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum redeem points is ${rules.minRedeemPoints}`,
        },
        { status: 400 }
      )
    }

    const userId = authResult.id

    const pointsBalanceAgg = await prisma.loyaltyPoint.aggregate({
      where: { userId },
      _sum: { points: true },
    })
    const pointsBalance = pointsBalanceAgg._sum.points ?? 0

    if (pointsBalance < points) {
      return NextResponse.json(
        { success: false, error: 'Insufficient loyalty points' },
        { status: 400 }
      )
    }

    const creditAmountNumber = Number((points * rules.redeemRate).toFixed(2))
    if (creditAmountNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid redemption amount' },
        { status: 400 }
      )
    }

    const creditAmount = new Prisma.Decimal(creditAmountNumber)

    const result = await prisma.$transaction(async (tx) => {
      const latestPointsBalance = await tx.loyaltyPoint.aggregate({
        where: { userId },
        _sum: { points: true },
      })
      const latestBalance = latestPointsBalance._sum.points ?? 0
      if (latestBalance < points) {
        throw new Error('INSUFFICIENT_POINTS')
      }

      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: { balance: { increment: creditAmount } },
        create: {
          userId,
          balance: creditAmount,
        },
      })

      const redemptionSource = `LOYALTY_REDEEM:${Date.now()}`

      await tx.loyaltyPoint.create({
        data: {
          userId,
          points: -Math.abs(points),
          source: redemptionSource,
        },
      })

      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: creditAmount,
          source: 'LOYALTY_REDEMPTION',
          metadata: {
            pointsRedeemed: points,
            redeemRate: rules.redeemRate,
            status: 'COMPLETED',
          },
        },
      })

      return {
        walletBalance: wallet.balance.toNumber(),
        walletTransactionId: walletTransaction.id,
      }
    })

    return NextResponse.json({
      success: true,
      redemption: {
        pointsRedeemed: points,
        creditedAmount: creditAmountNumber,
        walletBalance: result.walletBalance,
        walletTransactionId: result.walletTransactionId,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_POINTS') {
      return NextResponse.json(
        { success: false, error: 'Insufficient loyalty points' },
        { status: 400 }
      )
    }

    console.error('customer loyalty redeem POST error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to redeem loyalty points' },
      { status: 500 }
    )
  }
}
