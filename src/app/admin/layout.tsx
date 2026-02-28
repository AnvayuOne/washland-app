"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  const isLoginRoute = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginRoute || status === "loading") return

    if (!session?.user) {
      router.replace("/auth/signin")
      return
    }

    if (!["SUPER_ADMIN", "STORE_ADMIN"].includes(session.user.role)) {
      router.replace("/denied")
    }
  }, [isLoginRoute, router, session, status])

  if (isLoginRoute) {
    return <>{children}</>
  }

  if (status === "loading") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading...</div>
  }

  if (!session?.user || !["SUPER_ADMIN", "STORE_ADMIN"].includes(session.user.role)) {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Redirecting...</div>
  }

  return <>{children}</>
}

