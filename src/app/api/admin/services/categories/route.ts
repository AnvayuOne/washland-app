import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/services/categories - Get all categories with counts
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const categories = await prisma.serviceCategory.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { services: true }
                }
            }
        })

        const formatted = categories.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            imageUrl: c.imageUrl,
            isActive: c.isActive,
            count: c._count.services
        }))

        return NextResponse.json({
            success: true,
            categories: formatted
        })

    } catch (error) {
        console.error('Error fetching service categories:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/admin/services/categories - Create new category
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdminHybrid(request, 'SUPER_ADMIN')
        if (authResult instanceof NextResponse) {
            return authResult
        }

        const body = await request.json()
        const { name, description, imageUrl } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const category = await prisma.serviceCategory.create({
            data: {
                name,
                description,
                imageUrl,
                isActive: true
            }
        })

        return NextResponse.json({
            success: true,
            category
        })

    } catch (error: any) {
        console.error('Error creating category:', error)
        if (error.code === 'P2002') { // Unique constraint
            return NextResponse.json({ error: 'Category name already exists' }, { status: 400 })
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT (Rename/Update) and DELETE are best handled in [id]/route.ts,
// but for simplicity we can handle bulk update here or single update if we parse ID from body?
// Better to follow REST -> Create a [id]/route.ts for specific changes.
