import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function extractTransactionStatus(metadata: unknown) {
  if (metadata && typeof metadata === 'object' && 'status' in (metadata as Record<string, unknown>)) {
    const value = (metadata as Record<string, unknown>).status
    if (typeof value === 'string') {
      return value
    }
  }
  return 'COMPLETED'
}

export async function GET() {
  try {
    const authResult = await requireRole(['CUSTOMER'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const userId = authResult.id

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    const walletBalance = wallet ? Number(wallet.balance) : 0

    const transactions = (wallet?.transactions ?? []).map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      source: transaction.source ?? 'N/A',
      status: extractTransactionStatus(transaction.metadata),
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
    }))

    const pendingTopups = transactions
      .filter((transaction) => transaction.source === 'WALLET_TOPUP_PENDING' && transaction.status === 'PENDING')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const totalSpent = transactions
      .filter((transaction) => transaction.type === 'DEBIT')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    return NextResponse.json({
      success: true,
      wallet: {
        walletBalance,
        pendingTopups,
        totalSpent,
        transactions,
      },
    })
  } catch (error) {
    console.error('customer wallet GET error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch wallet data' },
      { status: 500 }
    )
  }
}
