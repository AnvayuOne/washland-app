import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    // Fetch customer profile
    const customer = await prisma.user.findUnique({
      where: { id: scope.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: customer
    })

  } catch (error) {
    console.error('Error fetching customer profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const body = await request.json()
    const { firstName, lastName, phone } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Validate phone format if provided
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Update customer profile
    const updatedCustomer = await prisma.user.update({
      where: { id: scope.userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      profile: updatedCustomer,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating customer profile:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
