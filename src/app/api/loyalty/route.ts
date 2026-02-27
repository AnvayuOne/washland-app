import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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
    const isInternalCall = hasValidInternalKey(req)
    const session = isInternalCall ? null : await getServerSession(authOptions)
    const role = session?.user?.role as string | undefined
    const sessionUserId = session?.user?.id

    if (!isInternalCall) {
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (role !== 'CUSTOMER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { action } = body

    if (action === 'add-points') {
      // Only internal trusted callers can grant points.
      if (!isInternalCall) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { userId, points, source = 'ORDER', expiresInDays } = body
      if (!userId || !points) {
        return NextResponse.json({ error: 'missing userId or points' }, { status: 400 })
      }

      const expiresAt = expiresInDays
        ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
        : undefined

      const lp = await prisma.loyaltyPoint.create({
        data: { userId, points: Number(points), source, expiresAt }
      })
      return NextResponse.json(lp, { status: 201 })
    }

    if (action === 'redeem') {
      const { userId, pointsToRedeem } = body
      const resolvedUserId = isInternalCall ? userId : sessionUserId

      if (!resolvedUserId || !pointsToRedeem) {
        return NextResponse.json({ error: 'missing userId or pointsToRedeem' }, { status: 400 })
      }
      if (!isInternalCall && userId && userId !== sessionUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const now = new Date()
      const pts = await prisma.loyaltyPoint.findMany({
        where: {
          userId: resolvedUserId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      })
      const total = pts.reduce((sum: number, point: { points: number }) => sum + point.points, 0)
      if (total < pointsToRedeem) {
        return NextResponse.json({ error: 'not enough points' }, { status: 400 })
      }

      const redemption = await prisma.loyaltyPoint.create({
        data: {
          userId: resolvedUserId,
          points: -Math.abs(Number(pointsToRedeem)),
          source: 'REDEMPTION'
        }
      })

      const creditAmount = Number(pointsToRedeem)
      const wallet = await prisma.wallet.upsert({
        where: { userId: resolvedUserId },
        update: { balance: { decrement: creditAmount } as never },
        create: { userId: resolvedUserId, balance: -creditAmount as never }
      })

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: creditAmount as never,
          source: 'POINTS_REDEMPTION'
        }
      })

      return NextResponse.json({ redemption }, { status: 200 })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
