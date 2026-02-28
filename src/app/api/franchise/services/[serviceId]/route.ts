import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

function parsePrice(input: unknown) {
  if (input === null || input === undefined || input === "") return null
  const parsed = Number(input)
  if (Number.isNaN(parsed) || parsed < 0) return undefined
  return parsed
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const { serviceId } = await params
    const body = await request.json()
    const clearOverride = body?.clearOverride === true
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined
    const parsedPrice = parsePrice(body?.defaultPrice)

    if (!clearOverride && isActive === undefined && parsedPrice === null) {
      return NextResponse.json(
        { success: false, error: "Provide isActive, defaultPrice, or clearOverride" },
        { status: 400 }
      )
    }

    if (parsedPrice === undefined) {
      return NextResponse.json({ success: false, error: "defaultPrice must be >= 0" }, { status: 400 })
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        isActive: true,
      },
    })

    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 })
    }

    if (isActive === true && !service.isActive) {
      return NextResponse.json(
        { success: false, error: "Cannot enable a globally inactive service at franchise level" },
        { status: 400 }
      )
    }

    if (clearOverride) {
      await prisma.franchiseService.deleteMany({
        where: {
          franchiseId: context.franchiseId,
          serviceId,
        },
      })
    } else {
      await prisma.franchiseService.upsert({
        where: {
          franchiseId_serviceId: {
            franchiseId: context.franchiseId,
            serviceId,
          },
        },
        update: {
          ...(isActive !== undefined ? { isActive } : {}),
          ...(parsedPrice !== null ? { defaultPrice: parsedPrice } : {}),
        },
        create: {
          franchiseId: context.franchiseId,
          serviceId,
          isActive: isActive ?? true,
          defaultPrice: parsedPrice,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("franchise service PATCH error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update franchise service" },
      { status: 500 }
    )
  }
}
