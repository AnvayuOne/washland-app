import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminHybrid } from '@/lib/hybrid-auth'
import { getScope } from '@/lib/scope'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Scope enforcement: NextAuth role check first, then tenant scope filter by store.
    const authResult = await requireAdminHybrid(request, [UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN])
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const scope = getScope(authResult)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const requestedStoreId = searchParams.get('storeId')?.trim() || null

    const activityWhere: any = {}
    let effectiveStoreId: string | null = null

    if (scope.role === UserRole.STORE_ADMIN) {
      const allowedStoreIds = Array.from(new Set([scope.storeId, ...scope.managedStoreIds].filter(Boolean)))
      if (!allowedStoreIds.length) {
        return NextResponse.json({ error: 'Store context missing for this account' }, { status: 403 })
      }

      if (requestedStoreId && !allowedStoreIds.includes(requestedStoreId)) {
        return NextResponse.json({ error: 'Store is outside your tenant scope' }, { status: 403 })
      }

      effectiveStoreId = requestedStoreId || allowedStoreIds[0]
    } else if (requestedStoreId) {
      effectiveStoreId = requestedStoreId
    }

    if (effectiveStoreId) {
      activityWhere.OR = [
        {
          metadata: {
            path: ['storeId'],
            equals: effectiveStoreId,
          },
        },
      ]
    }

    // Fetch recent activities with user information
    const activities = await prisma.activity.findMany({
      where: activityWhere,
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Transform activities for frontend consumption
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      user: activity.user ? {
        name: `${activity.user.firstName} ${activity.user.lastName}`,
        email: activity.user.email,
        role: activity.user.role
      } : null,
      metadata: activity.metadata,
      createdAt: activity.createdAt.toISOString()
    }))

    return NextResponse.json({
      activities: transformedActivities,
      total: await prisma.activity.count({ where: activityWhere })
    })

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
