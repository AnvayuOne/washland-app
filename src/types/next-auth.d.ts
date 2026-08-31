import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    storeId?: string | null
    managedStoreIds?: string[]
  }

  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: UserRole
      storeId?: string | null
      managedStoreIds?: string[]
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    firstName: string
    lastName: string
    storeId?: string | null
    managedStoreIds?: string[]
  }
}
