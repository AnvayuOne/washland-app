import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    // Fetch customer addresses
    const addresses = await prisma.address.findMany({
      where: { userId: scope.userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      addresses
    })

  } catch (error) {
    console.error('Error fetching customer addresses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const body = await request.json()
    const { type, address, landmark, city, state, pincode, isDefault } = body

    // Validate required fields
    if (!type || !address || !city || !state || !pincode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate address type
    if (!['HOME', 'WORK', 'OTHER'].includes(type)) {
      return NextResponse.json({ error: 'Invalid address type' }, { status: 400 })
    }

    // Validate pincode format
    if (!/^[0-9]{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Invalid pincode format' }, { status: 400 })
    }

    // If setting as default, first unset all other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: scope.userId,
          isDefault: true
        },
        data: { isDefault: false }
      })
    }

    // Create new address
    const newAddress = await prisma.address.create({
      data: {
        userId: scope.userId,
        title: type as 'HOME' | 'WORK' | 'OTHER',
        street: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: pincode.trim(),
        isDefault: isDefault || false
      }
    })

    return NextResponse.json({
      success: true,
      address: newAddress,
      message: 'Address added successfully'
    })

  } catch (error) {
    console.error('Error creating customer address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
