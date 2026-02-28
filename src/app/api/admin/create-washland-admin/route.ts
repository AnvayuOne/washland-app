import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

type Body = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: string
  secret?: string
}

export async function POST(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_CLI_SECRET
    const body: Body = await req.json()

    // Secret protection: require ADMIN_CLI_SECRET header or body.secret
    const provided = (req.headers.get('x-admin-cli-secret') as string) || body.secret
    if (!adminSecret || provided !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized - missing or invalid secret' }, { status: 401 })
    }

    const { email, password, firstName = 'Washland', lastName = 'Admin', role = 'SUPER_ADMIN' } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        firstName,
        lastName,
        role: role as UserRole,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    })

    // Do not return password hash
    // return minimal identity
    const { id } = user
    return NextResponse.json({ id, email, role })
  } catch (err) {
    console.error('create-washland-admin error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'create failed' }, { status: 500 })
  }
}
