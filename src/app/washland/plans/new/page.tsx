"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"
import { api } from "@/lib/api-client"
import { useToast } from "@/components/ToastProvider"

type PlanType = "PREMIUM_CARE" | "RECURRING_LINENS" | "CUSTOM"
type BillingCycle = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"

type StoreOption = {
  id: string
  name: string
  city?: string
  state?: string
}

type PlanPayload = {
  name: string
  description: string
  planType: PlanType
  billingCycle: BillingCycle
  price: string
  currency: string
  benefitsText: string
  isActive: boolean
  storeId: string
}

const planTypeOptions: { value: PlanType; label: string }[] = [
  { value: "PREMIUM_CARE", label: "Premium Care" },
  { value: "RECURRING_LINENS", label: "Recurring Linens" },
  { value: "CUSTOM", label: "Custom" },
]

const billingOptions: { value: BillingCycle; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
]

export default function PlanFormPage({ params }: { params: Promise<{ id: string }> | undefined }) {
  const router = useRouter()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [stores, setStores] = useState<StoreOption[]>([])

  const [formData, setFormData] = useState<PlanPayload>({
    name: "",
    description: "",
    planType: "PREMIUM_CARE",
    billingCycle: "MONTHLY",
    price: "",
    currency: "INR",
    benefitsText: "",
    isActive: true,
    storeId: "",
  })

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
    void initialize()
  }, [ready])

  const pageTitle = useMemo(() => (planId ? "Edit Plan" : "Create Plan"), [planId])

  const initialize = async () => {
    try {
      setLoading(true)
      setError(null)

      let editingId: string | null = null
      if (params) {
        const resolved = await params
        if (resolved?.id) {
          editingId = resolved.id
          setPlanId(resolved.id)
        }
      }

      const storesResponse = await api.get("/api/admin/stores")
      const storesData = await storesResponse.json()
      if (storesResponse.ok && Array.isArray(storesData)) {
        setStores(
          storesData.map((store: any) => ({
            id: String(store.id),
            name: store.name,
            city: store.city,
            state: store.state,
          }))
        )
      } else if (!storesResponse.ok) {
        toast.error("Plans", storesData.error || "Failed to load stores")
      }

      if (editingId) {
        const planResponse = await api.get(`/api/admin/plans/${editingId}`)
        const planData = await planResponse.json()
        if (!planResponse.ok) {
          setError(planData.error || "Failed to load plan")
          toast.error("Plans", planData.error || "Failed to load plan")
          return
        }

        const plan = planData?.data?.plan
        const benefitsText = Array.isArray(plan?.benefitsJson)
          ? plan.benefitsJson.join("\n")
          : typeof plan?.benefitsJson === "string"
            ? plan.benefitsJson
            : plan?.benefitsJson
              ? JSON.stringify(plan.benefitsJson, null, 2)
              : ""

        setFormData({
          name: plan.name || "",
          description: plan.description || "",
          planType: plan.planType || "PREMIUM_CARE",
          billingCycle: plan.billingCycle || "MONTHLY",
          price: String(plan.price ?? ""),
          currency: plan.currency || "INR",
          benefitsText,
          isActive: Boolean(plan.isActive),
          storeId: plan.storeId || "",
        })
      }
    } catch (requestError) {
      console.error("Error initializing plan form:", requestError)
      setError("Failed to load form data")
      toast.error("Plans", "Failed to load form data")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  const handleChange = (field: keyof PlanPayload, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const parseBenefits = () => {
    const raw = formData.benefitsText.trim()
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      return parsed
    } catch {
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        planType: formData.planType,
        billingCycle: formData.billingCycle,
        price: Number(formData.price),
        currency: formData.currency.trim().toUpperCase(),
        benefitsJson: parseBenefits(),
        isActive: formData.isActive,
        storeId: formData.storeId || null,
      }

      const endpoint = planId ? `/api/admin/plans/${planId}` : "/api/admin/plans"
      const method = planId ? api.patch : api.post
      const response = await method(endpoint, payload)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save plan")
        toast.error("Plans", data.error || "Failed to save plan")
        return
      }

      toast.success("Plans", planId ? "Plan updated" : "Plan created")
      router.push("/washland/plans")
    } catch (requestError) {
      console.error("Error saving plan:", requestError)
      setError("Failed to save plan")
      toast.error("Plans", "Failed to save plan")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) return null

  return (
    <DashboardLayout userRole={userRole} userName="Washland Admin" userEmail={userEmail} onSignOut={handleSignOut}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "2rem", color: "#111827" }}>{pageTitle}</h1>
          <Link href="/washland/plans" style={{ color: "#2563eb", textDecoration: "none" }}>
            Back to plans
          </Link>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            Loading plan form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem", display: "grid", gap: "1rem" }}>
            <Field label="Plan Name" required>
              <input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} style={inputStyle} placeholder="Example: Premium Care Monthly" required />
            </Field>

            <Field label="Description">
              <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} placeholder="Plan summary and customer value." />
            </Field>

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Field label="Plan Type" required>
                <select value={formData.planType} onChange={(e) => handleChange("planType", e.target.value as PlanType)} style={inputStyle} required>
                  {planTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Billing Cycle" required>
                <select value={formData.billingCycle} onChange={(e) => handleChange("billingCycle", e.target.value as BillingCycle)} style={inputStyle} required>
                  {billingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Field label="Price" required>
                <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => handleChange("price", e.target.value)} style={inputStyle} placeholder="999" required />
              </Field>

              <Field label="Currency" required>
                <input value={formData.currency} onChange={(e) => handleChange("currency", e.target.value)} style={inputStyle} placeholder="INR" required />
              </Field>
            </div>

            <Field label="Plan Scope (optional store)">
              <select value={formData.storeId} onChange={(e) => handleChange("storeId", e.target.value)} style={inputStyle}>
                <option value="">Global plan (all stores)</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.city ? ` (${store.city}${store.state ? `, ${store.state}` : ""})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Benefits (JSON or one line per benefit)">
              <textarea
                value={formData.benefitsText}
                onChange={(e) => handleChange("benefitsText", e.target.value)}
                style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
                placeholder={"Free pickup and delivery\nPriority processing\n10% off premium fabrics"}
              />
            </Field>

            <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", fontWeight: 600, color: "#374151" }}>
              <input type="checkbox" checked={formData.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} />
              Active plan
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Link href="/washland/plans" style={{ ...buttonStyle, textDecoration: "none", backgroundColor: "#f3f4f6", color: "#374151" }}>
                Cancel
              </Link>
              <button type="submit" disabled={saving} style={{ ...buttonStyle, border: "none", backgroundColor: saving ? "#93c5fd" : "#2563eb", color: "white", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Save Plan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "0.5rem",
  padding: "0.65rem 0.75rem",
  fontSize: "0.95rem",
  outline: "none",
}

const buttonStyle: React.CSSProperties = {
  padding: "0.65rem 1rem",
  borderRadius: "0.5rem",
  fontWeight: 600,
  fontSize: "0.9rem",
}
