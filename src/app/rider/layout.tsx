"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function RiderLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  const isLoginRoute = pathname === "/rider/login"

  useEffect(() => {
    if (isLoginRoute || status === "loading") return

    if (!session?.user) {
      router.replace("/rider/login")
      return
    }

    if (session.user.role !== "RIDER") {
      router.replace("/denied")
    }
  }, [isLoginRoute, router, session, status])

  if (isLoginRoute) {
    return <>{children}</>
  }

  if (status === "loading") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading...</div>
  }

  if (!session?.user || session.user.role !== "RIDER") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Redirecting...</div>
  }

  return <>{children}</>
}

