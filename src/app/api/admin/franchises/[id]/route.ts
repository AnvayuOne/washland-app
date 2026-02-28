import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../../src/lib/hybrid-auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(request, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    const franchise = await prisma.franchise.findUnique({ where: { id }, include: { stores: true, admin: true } })
    if (!franchise) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(franchise)
  } catch (err) {
    console.error('franchise GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(request, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    const body = await request.json()
    const { name, description, adminEmail } = body

    const data: Record<string, any> = {}
    if (name) data.name = name
    if (description !== undefined) data.description = description

    if (adminEmail) {
      let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
      if (!admin) {
        admin = await prisma.user.create({ data: { email: adminEmail, password: '', firstName: 'Franchise', lastName: 'Admin', role: UserRole.FRANCHISE_ADMIN, isActive: true } })
      }
      data.adminId = admin.id
    }

    const updated = await prisma.franchise.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('franchise PUT error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(request, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    await prisma.franchise.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('franchise DELETE error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
