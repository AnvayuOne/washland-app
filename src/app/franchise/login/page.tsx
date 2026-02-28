"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, signIn, signOut } from "next-auth/react"
import Image from "next/image"

function dashboardForRole(role?: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/washland/dashboard"
    case "FRANCHISE_ADMIN":
      return "/franchise/dashboard"
    case "STORE_ADMIN":
      return "/admin/dashboard"
    case "CUSTOMER":
      return "/customer/dashboard"
    case "RIDER":
      return "/rider/dashboard"
    default:
      return "/"
  }
}

export default function FranchiseLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (!result?.ok || result.error) {
        setError("Invalid credentials")
        setIsLoading(false)
        return
      }

      const session = await getSession()
      const role = session?.user?.role

      if (role !== "FRANCHISE_ADMIN") {
        setError("This account does not have franchise admin access")
        await signOut({ redirect: false })
        router.push(dashboardForRole(role))
        return
      }

      const managedFranchises = session?.user?.managedFranchises || []
      if (managedFranchises.length < 1) {
        setError("Account not linked to a franchise. Contact super admin.")
        await signOut({ redirect: false })
        setIsLoading(false)
        return
      }

      router.push("/franchise/dashboard")
    } catch {
      setError("Sign in failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ position: "relative" }}>
      <div
        className="card"
        style={{
          maxWidth: 520,
          width: "100%",
          padding: "1.25rem",
          borderRadius: 12,
          boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <Image src="/logo.png" alt="Washland" width={140} height={56} style={{ objectFit: "contain" }} />
          <p style={{ color: "#6b7280", marginTop: 8 }}>Franchise admin portal sign in</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {error ? (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: 8,
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 14, color: "#374151" }}>
              Email
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              required
            />
          </label>

          <label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 14, color: "#374151" }}>
              Password
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              required
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? "#9ca3af" : "var(--brand-blue)",
                color: "white",
                padding: "0.7rem 1.1rem",
                borderRadius: 8,
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
