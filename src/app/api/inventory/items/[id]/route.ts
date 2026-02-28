import { InventoryItemType, Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import { INVENTORY_ALLOWED_ROLES, parseNumericInput, resolveAccessibleStores } from "@/lib/inventory"

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)
    const { id } = await params

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
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
        movements: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!item) {
      return errorResponse("Inventory item not found", 404)
    }

    await resolveAccessibleStores(scope, item.storeId)

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (error) {
    console.error("inventory item GET error", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to load item", 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)
    const { id } = await params

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        storeId: true,
      },
    })

    if (!existing) {
      return errorResponse("Inventory item not found", 404)
    }

    await resolveAccessibleStores(scope, existing.storeId)

    const body = await request.json()
    const {
      name,
      sku,
      type,
      unit,
      reorderLevel,
      maxStockLevel,
      costPerUnit,
      notes,
      isActive,
    } = body

    const data: Prisma.InventoryItemUpdateInput = {}

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return errorResponse("Name cannot be empty")
      }
      data.name = name.trim()
    }

    if (sku !== undefined) {
      if (sku === null) {
        data.sku = null
      } else if (typeof sku === "string") {
        data.sku = sku.trim() || null
      } else {
        return errorResponse("Invalid SKU value")
      }
    }

    if (type !== undefined) {
      if (!Object.values(InventoryItemType).includes(type)) {
        return errorResponse("Invalid item type")
      }
      data.type = type
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) {
        return errorResponse("Invalid unit")
      }
      data.unit = unit.trim().toUpperCase()
    }

    if (reorderLevel !== undefined) {
      const parsed = parseNumericInput(reorderLevel)
      if (parsed === null || parsed < 0) {
        return errorResponse("Invalid reorder level")
      }
      data.reorderLevel = parsed
    }

    if (maxStockLevel !== undefined) {
      if (maxStockLevel === null || maxStockLevel === "") {
        data.maxStockLevel = null
      } else {
        const parsed = parseNumericInput(maxStockLevel)
        if (parsed === null || parsed < 0) {
          return errorResponse("Invalid max stock level")
        }
        data.maxStockLevel = parsed
      }
    }

    if (costPerUnit !== undefined) {
      if (costPerUnit === null || costPerUnit === "") {
        data.costPerUnit = null
      } else {
        const parsed = parseNumericInput(costPerUnit)
        if (parsed === null || parsed < 0) {
          return errorResponse("Invalid cost per unit")
        }
        data.costPerUnit = parsed
      }
    }

    if (notes !== undefined) {
      if (notes === null) {
        data.notes = null
      } else if (typeof notes === "string") {
        data.notes = notes.trim() || null
      } else {
        return errorResponse("Invalid notes value")
      }
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive)
    }

    const item = await prisma.inventoryItem.update({
      where: { id: existing.id },
      data,
    })

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (error) {
    console.error("inventory item PATCH error", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("An item with this name already exists for this store")
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to update item", 500)
  }
}
