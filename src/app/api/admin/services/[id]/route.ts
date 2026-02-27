import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        serviceCategory: true
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      basePrice,
      categoryId,
      category,
      isActive
    } = body

    // Optional updates
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice)
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle Category update
    if (categoryId) {
      updateData.categoryId = categoryId
      const cat = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
      if (cat) updateData.category = cat.name; // Keep legacy sync
    } else if (category) {
      updateData.category = category
      // Try to sync ID if possible
      const cat = await prisma.serviceCategory.findUnique({ where: { name: category } });
      if (cat) updateData.categoryId = cat.id;
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: { serviceCategory: true }
    })

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { id } = await params

    // Check usage in OrderItems
    const usage = await prisma.orderItem.count({
      where: { serviceId: id }
    })

    if (usage > 0) {
      // Soft delete instead? Or forbid?
      // For now, toggle active false is safer, but if they explicitly DELETE, we check.
      // Let's just return error for now.
      return NextResponse.json({
        error: `Cannot delete service used in ${usage} existing orders. Deactivate it instead.`
      }, { status: 400 })
    }

    await prisma.service.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Service deleted' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}