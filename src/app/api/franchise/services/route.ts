import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFranchiseApiContext } from "@/app/api/franchise/_helpers"

function asNumber(value: unknown) {
  if (value === null || value === undefined) return null
  return Number(value)
}

export async function GET() {
  try {
    const context = await getFranchiseApiContext()
    if (context instanceof NextResponse) return context

    const services = await prisma.service.findMany({
      include: {
        serviceCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })

    const serviceIds = services.map((service) => service.id)
    const configs = serviceIds.length
      ? await prisma.franchiseService.findMany({
          where: {
            franchiseId: context.franchiseId,
            serviceId: { in: serviceIds },
          },
          select: {
            id: true,
            serviceId: true,
            isActive: true,
            defaultPrice: true,
          },
        })
      : []

    const configMap = new Map(configs.map((item) => [item.serviceId, item]))

    const data = services.map((service) => {
      const config = configMap.get(service.id) ?? null
      const effectivePrice = config?.defaultPrice ?? service.basePrice
      const isEnabled = service.isActive && (config?.isActive ?? true)

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.serviceCategory?.name ?? service.category,
        serviceCategory: service.serviceCategory,
        globalBasePrice: Number(service.basePrice),
        globalActive: service.isActive,
        franchiseConfig: config
          ? {
              id: config.id,
              isActive: config.isActive,
              defaultPrice: asNumber(config.defaultPrice),
            }
          : null,
        effectiveFranchisePrice: Number(effectivePrice),
        isEnabledForFranchise: isEnabled,
      }
    })

    return NextResponse.json({
      success: true,
      franchiseId: context.franchiseId,
      services: data,
    })
  } catch (error) {
    console.error("franchise services GET error", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load franchise services" },
      { status: 500 }
    )
  }
}
