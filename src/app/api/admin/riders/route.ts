import { NextRequest, NextResponse } from 'next/server'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { prisma } from '@/lib/prisma'
import { assertStoreInScope, getScope } from '@/lib/scope'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminHybrid(request, ['SUPER_ADMIN', 'STORE_ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const scope = getScope(authResult)

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const isAvailableParam = searchParams.get('isAvailable')

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      )
    }

    try {
      // Verify store exists
      const store = await prisma.store.findUnique({ 
        where: { id: storeId },
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
          }
        }
      })
      
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 })
      }
      await assertStoreInScope(storeId, scope)

      let isAvailableFilter: boolean | undefined
      if (isAvailableParam === 'true') {
        isAvailableFilter = true
      } else if (isAvailableParam === 'false') {
        isAvailableFilter = false
      }

      // Get all active riders
      const riders = await prisma.user.findMany({
        where: {
          role: 'RIDER',
          isActive: true,
          ...(scope.role === 'STORE_ADMIN'
            ? {
                OR: [
                  { pickupOrders: { some: { storeId } } },
                  { deliveryOrders: { some: { storeId } } }
                ]
              }
            : {}),
          ...(isAvailableFilter !== undefined ? { isAvailable: isAvailableFilter } : {})
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isAvailable: true,
          createdAt: true
        },
        orderBy: {
          firstName: 'asc'
        }
      })

      return NextResponse.json({
        success: true,
        riders,
        filters: {
          isAvailable: isAvailableFilter ?? null
        },
        store: {
          id: store.id,
          name: store.name,
          franchise: store.franchise.name
        }
      })
    } catch (dbError) {
      console.error('Database error fetching riders:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch riders from database' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('riders GET error', err)
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 })
  }
}
