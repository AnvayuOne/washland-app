import { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { NextResponse } from "next/server"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          select: {
            id: true,
            email: true,
            password: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            managedFranchises: {
              select: {
                id: true,
                name: true
              }
            },
            managedStores: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          franchiseId: user.managedFranchises[0]?.id ?? null,
          storeId: user.managedStores[0]?.id ?? null,
          managedFranchises: user.managedFranchises,
          managedStores: user.managedStores
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.franchiseId = user.franchiseId
        token.storeId = user.storeId
        token.managedFranchises = user.managedFranchises
        token.managedStores = user.managedStores
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.franchiseId = (token.franchiseId as string | null) ?? null
        session.user.storeId = (token.storeId as string | null) ?? null
        session.user.managedFranchises = token.managedFranchises as any[]
        session.user.managedStores = token.managedStores as any[]
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role as UserRole | undefined
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  return session.user
}
