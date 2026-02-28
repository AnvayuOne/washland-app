import { InventoryMovementType, Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import {
  applyMovement,
  INVENTORY_ALLOWED_ROLES,
  parseNumericInput,
  resolveAccessibleStores,
} from "@/lib/inventory"

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const inventoryItemId = searchParams.get("inventoryItemId")
    const limitRaw = Number(searchParams.get("limit") || 40)
    const limit = Math.max(1, Math.min(limitRaw, 200))

    const { storeIds } = await resolveAccessibleStores(scope, storeId)
    const where: Prisma.InventoryMovementWhereInput = {
      storeId: { in: storeIds },
    }

    if (inventoryItemId) {
      where.inventoryItemId = inventoryItemId
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            franchise: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      movements,
    })
  } catch (error) {
    console.error("inventory movements GET error", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to load stock movements", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const body = await request.json()
    const { inventoryItemId, type, quantity, adjustTo, unitCost, note, reference } = body

    if (!inventoryItemId || typeof inventoryItemId !== "string") {
      return errorResponse("inventoryItemId is required")
    }

    if (!Object.values(InventoryMovementType).includes(type)) {
      return errorResponse("Invalid movement type")
    }

    const parsedQuantity = parseNumericInput(quantity) ?? 0
    const parsedAdjustTo = parseNumericInput(adjustTo)
    const parsedUnitCost = parseNumericInput(unitCost)

    if (parsedUnitCost !== null && parsedUnitCost < 0) {
      return errorResponse("unitCost must be 0 or greater")
    }

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        storeId: true,
        currentStock: true,
        name: true,
      },
    })

    if (!existingItem) {
      return errorResponse("Inventory item not found", 404)
    }

    await resolveAccessibleStores(scope, existingItem.storeId)

    const stockBefore = Number(existingItem.currentStock || 0)
    const { delta, stockAfter } = applyMovement(stockBefore, type, parsedQuantity, parsedAdjustTo)

    const absoluteQty = Math.abs(delta)
    const totalCost = parsedUnitCost !== null ? new Prisma.Decimal(absoluteQty * parsedUnitCost) : null

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: existingItem.id,
          storeId: existingItem.storeId,
          type,
          quantity: absoluteQty,
          stockBefore,
          stockAfter,
          unitCost: parsedUnitCost,
          totalCost,
          note: typeof note === "string" && note.trim() ? note.trim() : null,
          reference: typeof reference === "string" && reference.trim() ? reference.trim() : null,
          createdById: auth.id,
        },
      })

      const item = await tx.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          currentStock: stockAfter,
        },
      })

      return { movement, item }
    })

    return NextResponse.json(
      {
        success: true,
        movement: result.movement,
        item: result.item,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("inventory movements POST error", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to create stock movement", 500)
  }
}
