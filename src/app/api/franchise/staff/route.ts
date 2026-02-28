import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertStoreBelongsToFranchise } from "@/lib/tenant"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

function staffScopeWhere(franchiseId: string) {
  return {
    OR: [
      {
        managedStores: {
          some: {
            franchiseId,
          },
        },
      },
      {
        pickupOrders: {
          some: {
            store: {
              franchiseId,
            },
          },
        },
      },
      {
        deliveryOrders: {
          some: {
            store: {
              franchiseId,
            },
          },
        },
      },
    ],
  }
}

export async function GET() {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ["STORE_ADMIN", "RIDER"],
        },
        ...staffScopeWhere(context.franchiseId),
      },
      orderBy: [
        { role: "asc" },
        { firstName: "asc" },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isAvailable: true,
        createdAt: true,
        managedStores: {
          where: {
            franchiseId: context.franchiseId,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      staff,
    })
  } catch (error) {
    console.error("franchise staff GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load staff" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const body = await request.json()
    const userId = typeof body?.userId === "string" ? body.userId.trim() : ""
    const isActive = body?.isActive
    const storeId = body?.storeId

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const staffMember = await prisma.user.findFirst({
      where: {
        id: userId,
        role: {
          in: ["STORE_ADMIN", "RIDER"],
        },
        ...staffScopeWhere(context.franchiseId),
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (!staffMember) {
      return NextResponse.json({ success: false, error: "Staff member not found in your franchise" }, { status: 404 })
    }

    const shouldUpdateActive = typeof isActive === "boolean"
    const shouldAssignStore = storeId !== undefined

    if (!shouldUpdateActive && !shouldAssignStore) {
      return NextResponse.json(
        { success: false, error: "No supported mutation fields provided" },
        { status: 400 }
      )
    }

    if (shouldAssignStore) {
      if (staffMember.role !== "STORE_ADMIN") {
        return NextResponse.json(
          { success: false, error: "Store assignment is currently supported only for STORE_ADMIN" },
          { status: 400 }
        )
      }

      if (typeof storeId !== "string" || !storeId.trim()) {
        return NextResponse.json({ success: false, error: "A valid storeId is required" }, { status: 400 })
      }
    }

    await prisma.$transaction(async (tx) => {
      if (shouldUpdateActive) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive },
        })
      }

      if (shouldAssignStore && typeof storeId === "string") {
        const normalizedStoreId = storeId.trim()
        await assertStoreBelongsToFranchise(normalizedStoreId, context.franchiseId, tx)
        await tx.store.update({
          where: { id: normalizedStoreId },
          data: {
            adminId: userId,
          },
        })
      }
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isAvailable: true,
        managedStores: {
          where: {
            franchiseId: context.franchiseId,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      staff: updated,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Store does not belong to your franchise") {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }

    console.error("franchise staff POST error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update staff" },
      { status: 500 }
    )
  }
}
