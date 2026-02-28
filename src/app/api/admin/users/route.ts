import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'
import { checkUserDuplicates, getDuplicateErrorMessage } from '../../../../../src/lib/user-validation'
import { UserRole } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const franchiseId = searchParams.get('franchiseId')

    const whereClause = {
      ...(role && role !== 'all' && { role: role as UserRole })
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        managedFranchises: true,
        managedStores: {
          include: {
            franchise: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(users)
  } catch (err) {
    console.error('users GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const body = await req.json()
    const { 
      firstName,
      lastName,
      email,
      phone,
      role,
      franchiseId,
      storeId
    } = body

    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json({ error: 'First name, last name, email, and role are required' }, { status: 400 })
    }

    // Check for duplicate email and phone
    const duplicateCheck = await checkUserDuplicates(email, phone)
    if (duplicateCheck.isDuplicate) {
      const errorMessage = getDuplicateErrorMessage(duplicateCheck)
      return NextResponse.json({ 
        error: errorMessage,
        field: duplicateCheck.field,
        type: 'duplicate'
      }, { status: 400 })
    }

    // Create user
    const userData = {
      firstName,
      lastName,
      email,
      phone: phone || '',
      role: role as UserRole,
      password: '', // User should set password via onboarding
      isActive: true
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        managedFranchises: true,
        managedStores: {
          include: {
            franchise: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    // Update franchise admin if specified
    if (role === 'FRANCHISE_ADMIN' && franchiseId) {
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: { adminId: user.id }
      })
    }

    // Update store manager if specified
    if (role === 'STORE_ADMIN' && storeId) {
      await prisma.store.update({
        where: { id: storeId },
        data: { adminId: user.id }
      })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error('users POST error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
