import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { getScope } from '@/lib/scope'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { id: addressId } = await params
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

    // Check if address belongs to customer
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId: scope.userId
      }
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // If setting as default, first unset all other default addresses
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: scope.userId,
          isDefault: true 
        },
        data: { isDefault: false }
      })
    }

    // Update address
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
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
      address: updatedAddress,
      message: 'Address updated successfully'
    })

  } catch (error) {
    console.error('Error updating customer address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['CUSTOMER'])
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { id: addressId } = await params

    // Check if address belongs to customer
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId: scope.userId 
      }
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Check if there are any orders using this address
    const ordersWithAddress = await prisma.order.findFirst({
      where: { addressId: addressId }
    })

    if (ordersWithAddress) {
      return NextResponse.json({ 
        error: 'Cannot delete address that has been used in orders' 
      }, { status: 400 })
    }

    // Delete address
    await prisma.address.delete({
      where: { id: addressId }
    })

    // If deleted address was default, make another address default if available
    if (existingAddress.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId: scope.userId },
        orderBy: { createdAt: 'asc' }
      })

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting customer address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
