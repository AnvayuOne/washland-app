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

    // First unset all default addresses for this customer
    await prisma.address.updateMany({
      where: { 
        userId: scope.userId,
        isDefault: true 
      },
      data: { isDefault: false }
    })

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    })

    return NextResponse.json({
      success: true,
      address: updatedAddress,
      message: 'Default address updated successfully'
    })

  } catch (error) {
    console.error('Error setting default address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
