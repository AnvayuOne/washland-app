import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(['CUSTOMER'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await request.json()
    const amount = Number(body?.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required' }, { status: 400 })
    }

    if (amount < 10) {
      return NextResponse.json({ success: false, error: 'Minimum amount is 10' }, { status: 400 })
    }

    if (amount > 10000) {
      return NextResponse.json({ success: false, error: 'Maximum amount is 10,000' }, { status: 400 })
    }

    const decimalAmount = new Prisma.Decimal(Number(amount.toFixed(2)))
    const userId = authResult.id

    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        balance: new Prisma.Decimal(0),
      },
    })

    const topupTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount: decimalAmount,
        source: 'WALLET_TOPUP_PENDING',
          metadata: {
            status: 'PENDING',
            mode: 'TOPUP_REQUEST',
            requestedAmount: decimalAmount.toNumber(),
            note: 'Payment integration pending',
          },
        },
    })

    return NextResponse.json({
      success: true,
      topup: {
        topupId: topupTransaction.id,
        status: 'PENDING',
        amount: topupTransaction.amount.toNumber(),
      },
      message: 'Top-up request created. Payment integration pending.',
    })
  } catch (error) {
    console.error('customer wallet add-money POST error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create wallet top-up request' },
      { status: 500 }
    )
  }
}
