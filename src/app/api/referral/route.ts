import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    if (action === 'create') {
      const { referrerId } = body
      const resolvedReferrerId = isInternalCall ? referrerId : sessionUserId

      if (!resolvedReferrerId) {
        return NextResponse.json({ error: 'missing referrerId' }, { status: 400 })
      }
      if (!isInternalCall && referrerId && referrerId !== sessionUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const referral = await createReferralForReferrer(resolvedReferrerId)
      return NextResponse.json(referral, { status: 201 })
    }

    if (action === 'apply') {
      const { code, referredUserId } = body
      const resolvedReferredUserId = isInternalCall ? referredUserId : sessionUserId

      if (!code || !resolvedReferredUserId) {
        return NextResponse.json({ error: 'missing code or referredUserId' }, { status: 400 })
      }
      if (!isInternalCall && referredUserId && referredUserId !== sessionUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const updated = await applyReferralCode(code, resolvedReferredUserId)
      return NextResponse.json(updated, { status: 200 })
    }

    if (action === 'credit') {
      // Crediting referral rewards must be internal-only.
      if (!isInternalCall) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { referralId, referrerAmount = 100, referredAmount = 50 } = body
      if (!referralId) {
        return NextResponse.json({ error: 'missing referralId' }, { status: 400 })
      }

      const result = await creditReferral(referralId, referrerAmount, referredAmount)
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
