import { prisma } from "@/lib/prisma"
import { Prisma, type PrismaClient } from "@prisma/client"

export interface FranchiseContext {
  franchiseId: string
  franchiseName: string
  commissionRate: number
}

type TenantDbClient = PrismaClient | Prisma.TransactionClient

export async function requireFranchiseContext(
  sessionOrUserId: { id?: string } | string,
  prismaClient: TenantDbClient = prisma
): Promise<FranchiseContext> {
  const userId = typeof sessionOrUserId === "string" ? sessionOrUserId : sessionOrUserId.id

  if (!userId) {
    throw new Error("Missing authenticated user id")
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      managedFranchises: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          commissionRate: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  })

  if (!user || user.role !== "FRANCHISE_ADMIN") {
    throw new Error("Franchise admin access required")
  }

  const managedFranchise = user.managedFranchises[0]
  if (!managedFranchise) {
    throw new Error("Account not linked to a franchise")
  }

  return {
    franchiseId: managedFranchise.id,
    franchiseName: managedFranchise.name,
    commissionRate: Number(managedFranchise.commissionRate ?? 0),
  }
}

export async function assertStoreBelongsToFranchise(
  storeId: string,
  franchiseId: string,
  prismaClient: TenantDbClient = prisma
) {
  const store = await prismaClient.store.findFirst({
    where: {
      id: storeId,
      franchiseId,
    },
    select: {
      id: true,
      name: true,
      franchiseId: true,
    },
  })

  if (!store) {
    throw new Error("Store does not belong to your franchise")
  }

  return store
}
