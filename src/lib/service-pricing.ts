import { Prisma, type Service } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type ServiceWithCategory = Service & {
  serviceCategory: {
    id: string
    name: string
  } | null
}

export interface EffectiveServiceRecord {
  service: ServiceWithCategory
  franchiseConfig: {
    id: string
    isActive: boolean
    defaultPrice: Prisma.Decimal | null
  } | null
  storeOverride: {
    id: string
    isActive: boolean
    price: Prisma.Decimal
  } | null
  isAvailable: boolean
  effectivePrice: Prisma.Decimal
  priceSource: "STORE_OVERRIDE" | "FRANCHISE_DEFAULT" | "GLOBAL_BASE"
}

function computeEffectiveRecord(
  service: ServiceWithCategory,
  franchiseConfig: {
    id: string
    isActive: boolean
    defaultPrice: Prisma.Decimal | null
  } | null,
  storeOverride: {
    id: string
    isActive: boolean
    price: Prisma.Decimal
  } | null
): EffectiveServiceRecord {
  const isAvailable =
    service.isActive &&
    (franchiseConfig?.isActive ?? true) &&
    (storeOverride?.isActive ?? true)

  if (storeOverride?.price !== undefined && storeOverride?.price !== null) {
    return {
      service,
      franchiseConfig,
      storeOverride,
      isAvailable,
      effectivePrice: storeOverride.price,
      priceSource: "STORE_OVERRIDE",
    }
  }

  if (franchiseConfig?.defaultPrice !== undefined && franchiseConfig?.defaultPrice !== null) {
    return {
      service,
      franchiseConfig,
      storeOverride,
      isAvailable,
      effectivePrice: franchiseConfig.defaultPrice,
      priceSource: "FRANCHISE_DEFAULT",
    }
  }

  return {
    service,
    franchiseConfig,
    storeOverride,
    isAvailable,
    effectivePrice: service.basePrice,
    priceSource: "GLOBAL_BASE",
  }
}

export async function assertStoreExistsAndActive(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      isActive: true,
      franchiseId: true,
      franchise: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  })

  if (!store || !store.isActive || !store.franchise.isActive) {
    return null
  }

  return store
}

export async function listEffectiveServicesForStore(
  storeId: string,
  options?: {
    includeInactive?: boolean
    categoryName?: string | null
    search?: string | null
  }
) {
  const store = await assertStoreExistsAndActive(storeId)
  if (!store) {
    throw new Error("Store not found or inactive")
  }

  const includeInactive = options?.includeInactive ?? false
  const search = options?.search?.trim()
  const categoryName = options?.categoryName?.trim()

  const where: Prisma.ServiceWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoryName && categoryName !== "all"
      ? {
          OR: [{ category: categoryName }, { serviceCategory: { name: categoryName } }],
        }
      : {}),
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      serviceCategory: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })

  const serviceIds = services.map((service) => service.id)

  const [franchiseConfigs, storeOverrides] = serviceIds.length
    ? await Promise.all([
        prisma.franchiseService.findMany({
          where: {
            franchiseId: store.franchiseId,
            serviceId: { in: serviceIds },
          },
          select: {
            id: true,
            serviceId: true,
            isActive: true,
            defaultPrice: true,
          },
        }),
        prisma.storeService.findMany({
          where: {
            storeId: store.id,
            serviceId: { in: serviceIds },
          },
          select: {
            id: true,
            serviceId: true,
            isActive: true,
            price: true,
          },
        }),
      ])
    : [[], []]

  const franchiseMap = new Map(franchiseConfigs.map((item) => [item.serviceId, item]))
  const storeMap = new Map(storeOverrides.map((item) => [item.serviceId, item]))

  const records = services.map((service) =>
    computeEffectiveRecord(service, franchiseMap.get(service.id) ?? null, storeMap.get(service.id) ?? null)
  )

  return {
    store,
    records,
  }
}

export async function getEffectiveServiceForStore(serviceId: string, storeId: string) {
  const store = await assertStoreExistsAndActive(storeId)
  if (!store) {
    throw new Error("Store not found or inactive")
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      serviceCategory: {
        select: { id: true, name: true },
      },
    },
  })

  if (!service) {
    return null
  }

  const [franchiseConfig, storeOverride] = await Promise.all([
    prisma.franchiseService.findUnique({
      where: {
        franchiseId_serviceId: {
          franchiseId: store.franchiseId,
          serviceId,
        },
      },
      select: {
        id: true,
        isActive: true,
        defaultPrice: true,
      },
    }),
    prisma.storeService.findUnique({
      where: {
        storeId_serviceId: {
          storeId: store.id,
          serviceId,
        },
      },
      select: {
        id: true,
        isActive: true,
        price: true,
      },
    }),
  ])

  return {
    store,
    record: computeEffectiveRecord(service, franchiseConfig, storeOverride),
  }
}

