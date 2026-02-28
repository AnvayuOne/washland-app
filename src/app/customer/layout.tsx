"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      router.replace("/auth/signin")
      return
    }
    if (session.user.role !== "CUSTOMER") {
      router.replace("/denied")
    }
  }, [router, session, status])

  if (status === "loading") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading...</div>
  }

  if (!session?.user || session.user.role !== "CUSTOMER") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Redirecting...</div>
  }

  return <>{children}</>
}

