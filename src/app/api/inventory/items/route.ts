import { InventoryItemType, Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/rbac"
import { getScope } from "@/lib/scope"
import { prisma } from "@/lib/prisma"
import {
  INVENTORY_ALLOWED_ROLES,
  inventoryItemWhereInput,
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
    const includeInactive = searchParams.get("includeInactive") === "true"
    const search = searchParams.get("search")
    const type = searchParams.get("type")

    const { stores, storeIds } = await resolveAccessibleStores(scope, storeId)
    const where = inventoryItemWhereInput({ storeIds, includeInactive, search, type })

    const items = await prisma.inventoryItem.findMany({
      where,
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
        _count: {
          select: {
            movements: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({
      success: true,
      items,
      stores,
    })
  } catch (error) {
    console.error("inventory items GET error", error)
    return errorResponse(error instanceof Error ? error.message : "Failed to load inventory", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(INVENTORY_ALLOWED_ROLES)
    if (auth instanceof NextResponse) return auth
    const scope = getScope(auth)

    const body = await request.json()
    const {
      storeId,
      name,
      sku,
      type = InventoryItemType.CONSUMABLE,
      unit = "UNIT",
      currentStock = 0,
      reorderLevel = 0,
      maxStockLevel,
      costPerUnit,
      notes,
      isActive = true,
    } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return errorResponse("Item name is required")
    }

    if (!unit || typeof unit !== "string" || !unit.trim()) {
      return errorResponse("Unit is required")
    }

    if (!Object.values(InventoryItemType).includes(type)) {
      return errorResponse("Invalid item type")
    }

    const parsedCurrentStock = parseNumericInput(currentStock)
    const parsedReorderLevel = parseNumericInput(reorderLevel)
    const parsedMaxStockLevel = parseNumericInput(maxStockLevel)
    const parsedCostPerUnit = parseNumericInput(costPerUnit)

    if (parsedCurrentStock === null || parsedCurrentStock < 0) {
      return errorResponse("Current stock must be 0 or greater")
    }

    if (parsedReorderLevel === null || parsedReorderLevel < 0) {
      return errorResponse("Reorder level must be 0 or greater")
    }

    if (parsedMaxStockLevel !== null && parsedMaxStockLevel < 0) {
      return errorResponse("Max stock level must be 0 or greater")
    }

    if (parsedCostPerUnit !== null && parsedCostPerUnit < 0) {
      return errorResponse("Cost per unit must be 0 or greater")
    }

    const { selectedStore } = await resolveAccessibleStores(scope, storeId)
    if (!selectedStore) {
      return errorResponse("storeId is required")
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          storeId: selectedStore.id,
          name: name.trim(),
          sku: typeof sku === "string" && sku.trim() ? sku.trim() : null,
          type,
          unit: unit.trim().toUpperCase(),
          currentStock: parsedCurrentStock,
          reorderLevel: parsedReorderLevel,
          maxStockLevel: parsedMaxStockLevel,
          costPerUnit: parsedCostPerUnit,
          notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
          isActive: Boolean(isActive),
          createdById: auth.id,
        },
      })

      if (parsedCurrentStock > 0) {
        const totalCost =
          parsedCostPerUnit !== null ? new Prisma.Decimal(parsedCostPerUnit * parsedCurrentStock) : null

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            storeId: selectedStore.id,
            type: "STOCK_IN",
            quantity: parsedCurrentStock,
            stockBefore: 0,
            stockAfter: parsedCurrentStock,
            unitCost: parsedCostPerUnit,
            totalCost,
            note: "Initial stock created",
            reference: "INITIAL_CREATE",
            createdById: auth.id,
          },
        })
      }

      return item
    })

    return NextResponse.json(
      {
        success: true,
        item: result,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("inventory items POST error", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("An item with this name already exists for this store")
    }
    return errorResponse(error instanceof Error ? error.message : "Failed to create item", 500)
  }
}
