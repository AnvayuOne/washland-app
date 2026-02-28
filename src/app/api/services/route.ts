import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { listEffectiveServicesForStore } from "@/lib/service-pricing"
import { sanitizePublicServiceDescription } from "@/lib/public-service-description"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (storeId) {
      const { records } = await listEffectiveServicesForStore(storeId, {
        includeInactive: false,
      })

      const formattedServices = records
        .filter((record) => record.isAvailable)
        .map((record) => ({
          id: record.service.id,
          name: record.service.name,
          price: `From INR ${Number(record.effectivePrice)}`,
          description:
            sanitizePublicServiceDescription(record.service.description) ||
            `${record.service.serviceCategory?.name || record.service.category} service`,
          category: record.service.serviceCategory?.name || record.service.category,
          basePrice: Number(record.service.basePrice),
          effectivePrice: Number(record.effectivePrice),
          priceSource: record.priceSource,
        }))

      return NextResponse.json(formattedServices)
    }

    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        category: true,
      },
      orderBy: { name: "asc" },
    })

    const formattedServices = services.map((service) => ({
      id: service.id,
      name: service.name,
      price: `From INR ${Number(service.basePrice)}`,
      description:
        sanitizePublicServiceDescription(service.description) ||
        `${service.category} service`,
      category: service.category,
      basePrice: Number(service.basePrice),
      effectivePrice: Number(service.basePrice),
      priceSource: "GLOBAL_BASE",
    }))

    return NextResponse.json(formattedServices)
  } catch (error) {
    console.error("Services GET error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
