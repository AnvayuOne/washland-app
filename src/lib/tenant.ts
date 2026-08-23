import { prisma } from "@/lib/prisma"
import { Prisma, type PrismaClient } from "@prisma/client"

export interface StoreContext {
  storeId: string
  storeName: string
}

type TenantDbClient = PrismaClient | Prisma.TransactionClient

export async function getPrimaryStore(prismaClient: TenantDbClient = prisma) {
  const store = await prismaClient.store.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  })

  if (!store) {
    throw new Error("No active store found in database")
  }

  return store
}

export async function getPrimaryStoreId(prismaClient: TenantDbClient = prisma): Promise<string> {
  const store = await getPrimaryStore(prismaClient)
  return store.id
}

export async function assertStoreActive(
  storeId: string,
  prismaClient: TenantDbClient = prisma
) {
  const store = await prismaClient.store.findFirst({
    where: {
      id: storeId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!store) {
    throw new Error("Store is not active or does not exist")
  }

  return store
}
