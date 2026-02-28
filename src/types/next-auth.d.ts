import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    franchiseId?: string | null
    storeId?: string | null
    managedFranchises?: any[]
    managedStores?: any[]
  }

  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: UserRole
      franchiseId?: string | null
      storeId?: string | null
      managedFranchises?: any[]
      managedStores?: any[]
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    firstName: string
    lastName: string
    franchiseId?: string | null
    storeId?: string | null
    managedFranchises?: any[]
    managedStores?: any[]
  }
}
