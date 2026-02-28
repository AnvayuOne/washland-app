import { NextResponse } from 'next/server'
import { prisma } from '../../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../../src/lib/hybrid-auth'
import { UserRole } from '@prisma/client'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params
    
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        franchise: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })
    
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    
    return NextResponse.json(store)
  } catch (err) {
    console.error('store GET error', err)
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
      name, 
      address, 
      city, 
      state, 
      zipCode, 
      phone, 
      franchiseId,
      managerFirstName,
      managerLastName,
      managerEmail,
      managerPhone,
      isActive
    } = body

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id }
    })
    
    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const updateData: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      franchiseId?: string;
      adminId?: string;
      isActive?: boolean;
    } = {}
    
    // Update basic store info
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zipCode !== undefined) updateData.zipCode = zipCode
    if (phone !== undefined) updateData.phone = phone
    if (franchiseId !== undefined) updateData.franchiseId = franchiseId
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle manager update
    if (managerEmail && managerFirstName && managerLastName) {
      let admin = await prisma.user.findUnique({
        where: { email: managerEmail },
        select: {
          id: true,
          phone: true,
          role: true
        }
      })
      
      if (admin) {
        // Update existing user to be store admin if needed
        if (admin.role !== 'STORE_ADMIN') {
          admin = await prisma.user.update({
            where: { id: admin.id },
            data: { 
              role: UserRole.STORE_ADMIN,
              firstName: managerFirstName,
              lastName: managerLastName,
              phone: managerPhone || admin.phone
            },
            select: {
              id: true,
              phone: true,
              role: true
            }
          })
        }
      } else {
        // Create new store admin
        admin = await prisma.user.create({
          data: {
            email: managerEmail,
            password: '', // Manager should set password via onboarding
            firstName: managerFirstName,
            lastName: managerLastName,
            phone: managerPhone || '',
            role: UserRole.STORE_ADMIN,
            isActive: true
          },
          select: {
            id: true,
            phone: true,
            role: true
          }
        })
      }
      
      updateData.adminId = admin.id
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: updateData,
      include: {
        franchise: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    return NextResponse.json(updatedStore)
  } catch (err) {
    console.error('store PUT error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { id } = await params

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    })
    
    if (!existingStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Check if store has orders
    if (existingStore._count.orders > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete store with existing orders. Please transfer or complete all orders first.' 
      }, { status: 400 })
    }

    await prisma.store.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Store deleted successfully' })
  } catch (err) {
    console.error('store DELETE error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}
