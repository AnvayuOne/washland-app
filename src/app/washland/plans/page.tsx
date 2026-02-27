"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"
import { api } from "@/lib/api-client"
import { useToast } from "@/components/ToastProvider"

type Plan = {
  id: string
  name: string
  description: string | null
  planType: "PREMIUM_CARE" | "RECURRING_LINENS" | "CUSTOM"
  billingCycle: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  price: number
  currency: string
  isActive: boolean
  storeId: string | null
  store: {
    id: string
    name: string
    city?: string
    state?: string
  } | null
  subscriptionsCount: number
  createdAt: string
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

export default function WashlandPlansPage() {
  const router = useRouter()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const role = localStorage.getItem("userRole") || ""
    const email = localStorage.getItem("userEmail") || ""

    if (role !== "SUPER_ADMIN" && role !== "washland") {
      router.push("/washland/login")
      return
    }

    setUserRole(role)
    setUserEmail(email)
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!ready) return
    void fetchPlans()
  }, [ready])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get("/api/admin/plans?includeInactive=true")
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to load plans")
        toast.error("Plans", data.error || "Failed to load plans")
        return
      }

      setPlans(Array.isArray(data?.data?.plans) ? data.data.plans : [])
    } catch (requestError) {
      console.error("Error loading plans:", requestError)
      setError("Failed to load plans")
      toast.error("Plans", "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (plan: Plan) => {
    try {
      const response = await api.patch(`/api/admin/plans/${plan.id}`, {
        isActive: !plan.isActive,
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to update plan")
        toast.error("Plans", data.error || "Failed to update plan")
        return
      }

      setPlans((prev) =>
        prev.map((item) => (item.id === plan.id ? { ...item, isActive: !plan.isActive } : item))
      )
      toast.success("Plans", `Plan ${plan.isActive ? "deactivated" : "activated"}`)
    } catch (requestError) {
      console.error("Error updating plan:", requestError)
      setError("Failed to update plan")
      toast.error("Plans", "Failed to update plan")
    }
  }

  const deletePlan = async (plan: Plan) => {
    const confirmed = window.confirm(`Delete "${plan.name}"?`)
    if (!confirmed) return

    try {
      const response = await api.delete(`/api/admin/plans/${plan.id}`)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to delete plan")
        toast.error("Plans", data.error || "Failed to delete plan")
        return
      }

      setPlans((prev) => prev.filter((item) => item.id !== plan.id))
      toast.success("Plans", "Plan deleted")
    } catch (requestError) {
      console.error("Error deleting plan:", requestError)
      setError("Failed to delete plan")
      toast.error("Plans", "Failed to delete plan")
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  if (!ready) return null

  return (
    <DashboardLayout userRole={userRole} userName="Washland Admin" userEmail={userEmail} onSignOut={handleSignOut}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#111827" }}>Subscription Plans</h1>
            <p style={{ marginTop: "0.35rem", color: "#6b7280" }}>Manage global and store-scoped plans.</p>
          </div>
          <Link
            href="/washland/plans/new"
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              textDecoration: "none",
              padding: "0.7rem 1rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
            }}
          >
            Create Plan
          </Link>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>Loading plans...</div>
          ) : plans.length === 0 ? (
            <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
              No plans found. <Link href="/washland/plans/new">Create your first plan</Link>.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Cycle</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Scope</th>
                  <th style={thStyle}>Subscriptions</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{plan.name}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{plan.description || "No description"}</div>
                    </td>
                    <td style={tdStyle}>{labelize(plan.planType)}</td>
                    <td style={tdStyle}>{labelize(plan.billingCycle)}</td>
                    <td style={tdStyle}>
                      {plan.currency === "INR"
                        ? currencyFormatter.format(plan.price)
                        : `${plan.currency} ${plan.price.toFixed(2)}`}
                    </td>
                    <td style={tdStyle}>
                      {plan.store
                        ? `${plan.store.name}${plan.store.city ? ` (${plan.store.city})` : ""}`
                        : "Global"}
                    </td>
                    <td style={tdStyle}>{plan.subscriptionsCount}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: plan.isActive ? "#dcfce7" : "#fee2e2",
                          color: plan.isActive ? "#166534" : "#991b1b",
                        }}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <Link href={`/washland/plans/${plan.id}`} style={linkButtonStyle}>
                          Edit
                        </Link>
                        <button onClick={() => toggleActive(plan)} style={plainButtonStyle}>
                          {plan.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => deletePlan(plan)} style={{ ...plainButtonStyle, color: "#dc2626" }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem 1rem",
  fontSize: "0.75rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const tdStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.9rem 1rem",
  fontSize: "0.9rem",
  color: "#374151",
  verticalAlign: "top",
}

const linkButtonStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.85rem",
}

const plainButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "#4b5563",
  fontWeight: 600,
  fontSize: "0.85rem",
  cursor: "pointer",
  padding: 0,
}
