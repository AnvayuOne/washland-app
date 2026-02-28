import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActiveLoyaltyConfig } from '@/lib/loyaltyRules'

function hasValidInternalKey(req: Request) {
  const internalKey = process.env.INTERNAL_API_KEY
  if (!internalKey) return false

  const headerKey = req.headers.get('x-internal-api-key')
  const authHeader = req.headers.get('authorization')
  const bearerKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  return headerKey === internalKey || bearerKey === internalKey
}

export async function POST(req: Request) {
  try {
    if (!hasValidInternalKey(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const action = typeof body?.action === 'string' ? body.action : ''

    if (action === 'add-points') {
      const userId = body?.userId as string | undefined
      const points = Number(body?.points)
      const source = typeof body?.source === 'string' && body.source.trim().length > 0
        ? body.source.trim()
        : 'MANUAL_ADJUSTMENT'

      if (!userId || !Number.isFinite(points) || points === 0) {
        return NextResponse.json({ success: false, error: 'missing userId or valid points' }, { status: 400 })
      }

      const lp = await prisma.loyaltyPoint.create({
        data: {
          userId,
          points: Math.trunc(points),
          source,
        },
      })

      return NextResponse.json({ success: true, loyaltyPoint: lp }, { status: 201 })
    }

    if (action === 'redeem') {
      const userId = body?.userId as string | undefined
      const pointsToRedeem = Number(body?.pointsToRedeem)

      if (!userId || !Number.isFinite(pointsToRedeem) || pointsToRedeem <= 0) {
        return NextResponse.json({ success: false, error: 'missing userId or valid pointsToRedeem' }, { status: 400 })
      }

      const rules = await getActiveLoyaltyConfig(prisma)
      if (pointsToRedeem < rules.minRedeemPoints) {
        return NextResponse.json(
          { success: false, error: `Minimum redeem points is ${rules.minRedeemPoints}` },
          { status: 400 }
        )
      }

      const pointsAgg = await prisma.loyaltyPoint.aggregate({
        where: { userId },
        _sum: { points: true },
      })
      const availablePoints = pointsAgg._sum.points ?? 0

      if (availablePoints < pointsToRedeem) {
        return NextResponse.json({ success: false, error: 'not enough points' }, { status: 400 })
      }

      const creditAmountNumber = Number((pointsToRedeem * rules.redeemRate).toFixed(2))
      const creditAmount = new Prisma.Decimal(creditAmountNumber)

      const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId },
          update: { balance: { increment: creditAmount } },
          create: { userId, balance: creditAmount },
        })

        const redemption = await tx.loyaltyPoint.create({
          data: {
            userId,
            points: -Math.abs(Math.trunc(pointsToRedeem)),
            source: `LOYALTY_REDEEM_INTERNAL:${Date.now()}`,
          },
        })

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: creditAmount,
            source: 'LOYALTY_REDEMPTION',
            metadata: {
              status: 'COMPLETED',
              pointsRedeemed: Math.trunc(pointsToRedeem),
              redeemRate: rules.redeemRate,
            },
          },
        })

        return {
          redemption,
          creditedAmount: creditAmountNumber,
          walletBalance: Number(wallet.balance),
        }
      })

      return NextResponse.json({ success: true, ...result }, { status: 200 })
    }

    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
