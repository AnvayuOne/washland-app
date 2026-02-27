import { NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'
import requireAdminHybrid from '../../../../../src/lib/hybrid-auth'

export async function GET(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const whereClause = {
      ...(category && category !== 'all' && { category }),
      ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' })
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        storeServices: {
          include: {
            store: {
              include: {
                franchise: true
              }
            }
          }
        },
        _count: {
          select: {
            orderItems: true,
            storeServices: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(services)
  } catch (err) {
    console.error('services GET error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminHybrid(req, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (auth instanceof NextResponse && auth.status === 401) return auth

    const body = await req.json()
    const {
      name,
      description,
      basePrice,
      categoryId, // Expect categoryId
      category,   // Optional fallback/legacy
      isActive = true
    } = body

    if (!name || !basePrice) {
      return NextResponse.json({ error: 'Name and base price are required' }, { status: 400 })
    }

    if (!categoryId && !category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Validate basePrice is a valid number
    const price = parseFloat(basePrice)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Base price must be a valid positive number' }, { status: 400 })
    }

    // Resolve Category Name if only ID is provided (for legacy field) or vice versa
    let resolvedCategoryName = category;
    let resolvedCategoryId = categoryId;

    if (categoryId) {
      const cat = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
      if (cat) resolvedCategoryName = cat.name;
    } else if (category) {
      // Attempt to find by name or fallback (ideally we push users to use IDs now)
      const cat = await prisma.serviceCategory.findUnique({ where: { name: category } });
      if (cat) resolvedCategoryId = cat.id;
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || '',
        basePrice: price,
        categoryId: resolvedCategoryId,
        category: resolvedCategoryName || 'Uncategorized', // Maintain legacy field
        isActive
      },
      include: {
        serviceCategory: true,
        storeServices: {
          include: {
            store: {
              include: {
                franchise: true
              }
            }
          }
        },
        _count: {
          select: {
            orderItems: true,
            storeServices: true
          }
        }
      }
    })

    return NextResponse.json(service)
  } catch (err) {
    console.error('services POST error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 500 })
  }
}