"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useEffect, type ReactNode } from "react"

function dashboardForRole(role?: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/washland/dashboard"
    case "STORE_ADMIN":
      return "/admin/dashboard"
    case "CUSTOMER":
      return "/customer/dashboard"
    case "RIDER":
      return "/rider/dashboard"
    case "FRANCHISE_ADMIN":
      return "/franchise/dashboard"
    default:
      return "/denied"
  }
}

export default function FranchiseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  const isLoginRoute = pathname === "/franchise/login"

  useEffect(() => {
    if (isLoginRoute || status === "loading") {
      return
    }

    const role = session?.user?.role

    if (!session?.user) {
      router.replace("/franchise/login")
      return
    }

    if (role !== "FRANCHISE_ADMIN") {
      router.replace("/denied")
    }
  }, [isLoginRoute, session, status, router])

  if (isLoginRoute) {
    return <>{children}</>
  }

  if (status === "loading") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading...</div>
  }

  if (!session?.user || session.user.role !== "FRANCHISE_ADMIN") {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Redirecting...</div>
  }

  const managedFranchises = session.user.managedFranchises || []
  const franchiseName = managedFranchises[0]?.name || "Franchise"

  if (managedFranchises.length < 1) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "560px", width: "100%", background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
          <h1 style={{ marginTop: 0, color: "#111827" }}>Account Not Linked to a Franchise</h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Your account is authenticated as a franchise admin, but no franchise mapping was found. Contact Washland super admin to assign your account.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/franchise/login" })}
            style={{
              marginTop: "0.75rem",
              padding: "0.6rem 0.95rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const links = [
    { href: "/franchise/dashboard", label: "Dashboard" },
    { href: "/franchise/stores", label: "Stores" },
    { href: "/franchise/orders", label: "Orders" },
    { href: "/franchise/staff", label: "Staff" },
    { href: "/franchise/reports/commissions", label: "Commissions" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "64px", borderBottom: "1px solid #e2e8f0", background: "white", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem" }}>
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>Franchise Portal</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{franchiseName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#334155", fontSize: "0.9rem" }}>{session.user.firstName} {session.user.lastName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/franchise/login" })}
            style={{
              padding: "0.45rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "white",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <aside style={{ position: "fixed", top: "64px", left: 0, width: "230px", bottom: 0, borderRight: "1px solid #e2e8f0", background: "white", padding: "0.75rem" }}>
        <nav style={{ display: "grid", gap: "0.35rem" }}>
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: active ? "#1d4ed8" : "#334155",
                  background: active ? "#eff6ff" : "transparent",
                  border: active ? "1px solid #bfdbfe" : "1px solid transparent",
                  borderRadius: "8px",
                  padding: "0.55rem 0.65rem",
                  fontWeight: active ? 600 : 500,
                  fontSize: "0.92rem",
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <main style={{ marginTop: "64px", marginLeft: "230px", padding: "1rem" }}>
        {children}
      </main>
    </div>
  )
}
