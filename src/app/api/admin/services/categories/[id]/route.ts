import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/services/categories/[id] - Update Category
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const { id } = await params
        const body = await request.json()
        const { name, description, imageUrl, isActive } = body

        const updated = await prisma.serviceCategory.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl,
                isActive
            }
        })

        return NextResponse.json({
            success: true,
            category: updated
        })

    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/services/categories/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const { id } = await params

        // Check if services depend on this
        const dependencies = await prisma.service.count({
            where: { categoryId: id }
        })

        if (dependencies > 0) {
            return NextResponse.json(
                { error: 'Cannot delete category with assigned services. Reassign them first.' },
                { status: 400 }
            )
        }

        await prisma.serviceCategory.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: 'Category deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
