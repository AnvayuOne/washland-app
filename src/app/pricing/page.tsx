"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ToastProvider"

type Service = {
  id: string
  title: string
  description?: string
  price: number
  unit?: string
}

type ServiceIconKind = "shirt" | "linen" | "shoe" | "bag" | "express"

type Store = {
  id: string
  name: string
  city?: string
  state?: string
}

type Plan = {
  id: string
  name: string
  description: string | null
  planType: string
  billingCycle: string
  price: number
  currency: string
  benefitsJson: any
  isActive: boolean
  storeId: string | null
  store: Store | null
}

function detectServiceIcon(name: string, description: string): ServiceIconKind {
  const tokens = `${name} ${description}`.toLowerCase()

  if (tokens.includes("shoe") || tokens.includes("sneaker")) return "shoe"
  if (tokens.includes("bag") || tokens.includes("handbag") || tokens.includes("leather")) return "bag"
  if (
    tokens.includes("bed") ||
    tokens.includes("linen") ||
    tokens.includes("blanket") ||
    tokens.includes("comforter") ||
    tokens.includes("pillow") ||
    tokens.includes("curtain") ||
    tokens.includes("sofa")
  ) {
    return "linen"
  }
  if (tokens.includes("express") || tokens.includes("same day") || tokens.includes("steam")) return "express"
  return "shirt"
}

function ServiceIcon({ kind }: { kind: ServiceIconKind }) {
  const common = {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#1e40af",
    strokeWidth: "1.8",
  }

  if (kind === "linen") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 13h6" />
      </svg>
    )
  }

  if (kind === "shoe") {
    return (
      <svg {...common}>
        <path d="M3 15c2 0 3-2 5-2s3 2 5 2h8v3H3z" />
        <path d="M6 13V9l4 2" />
      </svg>
    )
  }

  if (kind === "bag") {
    return (
      <svg {...common}>
        <rect x="5" y="8" width="14" height="11" rx="2" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
    )
  }

  if (kind === "express") {
    return (
      <svg {...common}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M8 4l2 3h4l2-3 3 2-2 4v9H5v-9L3 6z" />
    </svg>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const toast = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [servicesRes, plansRes, storesRes] = await Promise.all([
          fetch("/api/pricing"),
          fetch("/api/plans"),
          fetch("/api/public/stores"),
        ])

        const servicesData = servicesRes.ok ? await servicesRes.json() : { data: [] }
        const plansData = plansRes.ok ? await plansRes.json() : { data: { plans: [] } }
        const storesData = storesRes.ok ? await storesRes.json() : []

        if (!mounted) return

        setServices(Array.isArray(servicesData?.data) ? servicesData.data : [])
        setPlans(Array.isArray(plansData?.data?.plans) ? plansData.data.plans : [])
        const normalizedStores = Array.isArray(storesData) ? storesData : []
        setStores(normalizedStores)
        if (normalizedStores.length > 0) {
          setSelectedStoreId(normalizedStores[0].id)
        }
      } catch (fetchError) {
        if (!mounted) return
        const message = String(fetchError)
        setError(message)
        toast.error("Pricing", "Failed to load pricing and plans")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadData()

    return () => {
      mounted = false
    }
  }, [])

  const hasGlobalPlans = useMemo(() => plans.some((plan) => !plan.storeId), [plans])

  const buyPlan = async (plan: Plan) => {
    const resolvedStoreId = plan.storeId || selectedStoreId
    if (!resolvedStoreId) {
      setError("Please select a store before buying a plan.")
      toast.error("Plans", "Please select a store before buying a plan.")
      return
    }

    try {
      setBuyingPlanId(plan.id)
      setError(null)
      const response = await fetch("/api/customer/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          storeId: resolvedStoreId,
          activateNow: false,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Plans", "Sign in to buy a plan.")
          router.push("/auth/signin")
          return
        }
        setError(data.error || "Failed to start subscription")
        toast.error("Plans", data.error || "Failed to start subscription")
        return
      }

      toast.success("Plans", "Subscription created. Continue in subscriptions.")
      router.push("/customer/subscriptions")
    } catch (purchaseError) {
      console.error("Error purchasing plan:", purchaseError)
      setError("Failed to start subscription")
      toast.error("Plans", "Failed to start subscription")
    } finally {
      setBuyingPlanId(null)
    }
  }

  if (loading) {
    return <main style={{ padding: "4rem 1rem", textAlign: "center" }}>Loading pricing...</main>
  }

  if (error) {
    return (
      <main style={{ padding: "4rem 1rem", textAlign: "center", color: "#b91c1c" }}>
        Error: {error}
      </main>
    )
  }

  const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  })

  return (
    <main style={{ padding: "3rem 1rem" }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", display: "grid", gap: "2.5rem" }}>
        <section>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Subscription Plans
            </h1>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Choose a plan and start with flexible, recurring laundry coverage.
            </p>
          </div>

          {hasGlobalPlans && (
            <div style={{ maxWidth: "520px", margin: "0 auto 1.25rem auto" }}>
              <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600, color: "#374151" }}>
                Select Store for Global Plans
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  padding: "0.65rem 0.75rem",
                }}
              >
                <option value="">Choose store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.city ? ` (${store.city}${store.state ? `, ${store.state}` : ""})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {plans.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "0.75rem", backgroundColor: "white" }}>
              No active subscription plans yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {plans.map((plan) => {
                const planFormatter = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: plan.currency || "INR",
                  maximumFractionDigits: 2,
                })
                const benefits = Array.isArray(plan.benefitsJson) ? plan.benefitsJson : []
                const scopeLabel = plan.store
                  ? `${plan.store.name}${plan.store.city ? ` (${plan.store.city})` : ""}`
                  : "Global plan"

                return (
                  <article key={plan.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.9rem", backgroundColor: "white", padding: "1rem", display: "grid", gap: "0.7rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                      <h3 style={{ margin: 0, color: "#111827", fontSize: "1.15rem" }}>{plan.name}</h3>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", backgroundColor: "#dbeafe", borderRadius: "999px", padding: "0.25rem 0.6rem" }}>
                        {labelize(plan.planType)}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "#6b7280", minHeight: "2.3rem" }}>{plan.description || "No description"}</p>
                    <div style={{ color: "#111827", fontWeight: 700, fontSize: "1.4rem" }}>
                      {planFormatter.format(plan.price)}
                      <span style={{ fontSize: "0.85rem", color: "#6b7280", marginLeft: "0.4rem", fontWeight: 500 }}>
                        / {labelize(plan.billingCycle)}
                      </span>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                      Scope: {scopeLabel}
                    </div>
                    {benefits.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#374151" }}>
                        {benefits.slice(0, 4).map((benefit: string, index: number) => (
                          <li key={`${plan.id}-benefit-${index}`}>{benefit}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => buyPlan(plan)}
                      disabled={buyingPlanId === plan.id}
                      style={{
                        border: "none",
                        borderRadius: "0.55rem",
                        backgroundColor: buyingPlanId === plan.id ? "#93c5fd" : "#2563eb",
                        color: "white",
                        padding: "0.65rem 0.9rem",
                        fontWeight: 700,
                        cursor: buyingPlanId === plan.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {buyingPlanId === plan.id ? "Starting..." : "Buy Plan"}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Service Pricing
            </h2>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Transparent per-item rates for one-off service requests.
            </p>
          </div>

          <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {services.map((service) => {
              const iconKind = detectServiceIcon(service.title, service.description || "")
              return (
              <div
                key={service.id}
                style={{
                  padding: "1.15rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#dbeafe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.8rem",
                  }}
                >
                  <ServiceIcon kind={iconKind} />
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: 0, marginBottom: "0.45rem", color: "#111827", lineHeight: 1.25 }}>
                  {service.title}
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "0.9rem", minHeight: "2.3rem" }}>
                  {service.description || ""}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e40af" }}>
                    {inrFormatter.format(Number(service.price))}
                  </div>
                  <div style={{ color: "#6b7280" }}>{service.unit ? `${service.unit}` : ""}</div>
                </div>
              </div>
            )})}
          </div>
        </section>
      </div>
    </main>
  )
}

function labelize(value: string) {
  if (!value || value === "-") return value
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}
