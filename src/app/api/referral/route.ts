import { NextResponse } from 'next/server'
import { createReferralForReferrer, applyReferralCode, creditReferral } from '@/lib/referral'

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

    if (action === 'create') {
      const referrerId = body?.referrerId as string | undefined
      if (!referrerId) {
        return NextResponse.json({ success: false, error: 'missing referrerId' }, { status: 400 })
      }

      const referral = await createReferralForReferrer(referrerId)
      return NextResponse.json({ success: true, referral }, { status: 201 })
    }

    if (action === 'apply') {
      const code = body?.code as string | undefined
      const referredUserId = body?.referredUserId as string | undefined

      if (!code || !referredUserId) {
        return NextResponse.json({ success: false, error: 'missing code or referredUserId' }, { status: 400 })
      }

      const updated = await applyReferralCode(code, referredUserId)
      return NextResponse.json({ success: true, referral: updated }, { status: 200 })
    }

    if (action === 'credit') {
      const referralId = body?.referralId as string | undefined
      const referrerAmount = Number(body?.referrerAmount ?? 100)
      const referredAmount = Number(body?.referredAmount ?? 50)

      if (!referralId) {
        return NextResponse.json({ success: false, error: 'missing referralId' }, { status: 400 })
      }

      const result = await creditReferral(referralId, referrerAmount, referredAmount)
      return NextResponse.json({ success: true, referral: result }, { status: 200 })
    }

    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
