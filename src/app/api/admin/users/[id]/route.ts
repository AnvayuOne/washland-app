import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../../src/lib/hybrid-auth'
import { UserRole } from '@prisma/client'

const userResponseSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  franchiseId: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
  managedFranchises: {
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  },
  managedStores: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      franchise: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  },
  _count: {
    select: {
      orders: true
    }
  }
} as const

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: userResponseSelect
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json(user)
  } catch (err) {
    console.error('user GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    const body = await req.json()
    const { 
      firstName,
      lastName,
      email,
      phone,
      role,
      isActive,
      franchiseId,
      storeId
    } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true
      }
    })
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })
      
      if (emailExists) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
      }
    }

    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      isActive?: boolean;
    } = {}
    
    // Update basic user info
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role as UserRole
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userResponseSelect
    })

    // Handle role-specific assignments
    if (role === 'FRANCHISE_ADMIN' && franchiseId) {
      // Update franchise to use this admin
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: { adminId: updatedUser.id },
        select: { id: true }
      })
    }

    if (role === 'STORE_ADMIN' && storeId) {
      // Update store to use this admin
      await prisma.store.update({
        where: { id: storeId },
        data: { adminId: updatedUser.id }
      })
    }

    return NextResponse.json(updatedUser)
  } catch (err) {
    console.error('user PUT error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    const body = await req.json()
    const { isActive } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true
      }
    })
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deactivating super admin
    if (existingUser.role === 'SUPER_ADMIN' && isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate super admin users' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userResponseSelect
    })

    return NextResponse.json(updatedUser)
  } catch (err) {
    console.error('user PATCH error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        managedFranchises: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        },
        managedStores: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a SUPER_ADMIN
    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Cannot delete super admin users' 
      }, { status: 400 })
    }

    // Check if user has orders
    if (existingUser._count.orders > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user with existing orders. Please transfer orders first.' 
      }, { status: 400 })
    }

    // Check if user manages franchises
    if (existingUser.managedFranchises.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user who manages franchises. Please assign a new admin first.' 
      }, { status: 400 })
    }

    // Check if user manages stores
    if (existingUser.managedStores.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user who manages stores. Please assign a new manager first.' 
      }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    console.error('user DELETE error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
