"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import CustomerDashboardLayout from "@/components/CustomerDashboardLayout"
import { useToast } from "@/components/ToastProvider"

type Subscription = {
  id: string
  status: "ACTIVE" | "PAYMENT_PENDING" | "PAUSED" | "CANCELLED" | "EXPIRED"
  startAt: string
  endAt: string | null
  renewAt: string | null
  autoRenew: boolean
  plan: {
    id: string
    name: string
    description: string | null
    planType: string
    billingCycle: string
    price: number
    currency: string
    benefitsJson: any
  } | null
  store: {
    id: string
    name: string
    city?: string
    state?: string
  } | null
}

export default function CustomerSubscriptionsPage() {
  const toast = useToast()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || "")
    setUserName(localStorage.getItem("userName") || "Customer")
    void fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/customer/subscriptions")
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in again to view subscriptions.")
          toast.error("Subscriptions", "Please sign in again to view subscriptions.")
          return
        }
        setError(data.error || "Failed to load subscriptions")
        toast.error("Subscriptions", data.error || "Failed to load subscriptions")
        return
      }

      setSubscriptions(Array.isArray(data?.data?.subscriptions) ? data.data.subscriptions : [])
    } catch (requestError) {
      console.error("Error loading subscriptions:", requestError)
      setError("Failed to load subscriptions")
      toast.error("Subscriptions", "Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }

  const cancelSubscription = async (id: string) => {
    const confirmed = window.confirm("Cancel this subscription?")
    if (!confirmed) return

    try {
      setProcessingId(id)
      const response = await fetch(`/api/customer/subscriptions/${id}/cancel`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to cancel subscription")
        toast.error("Subscriptions", data.error || "Failed to cancel subscription")
        return
      }

      setSubscriptions((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "CANCELLED",
                autoRenew: false,
                endAt: new Date().toISOString(),
              }
            : item
        )
      )
      toast.success("Subscriptions", "Subscription cancelled")
    } catch (requestError) {
      console.error("Error cancelling subscription:", requestError)
      setError("Failed to cancel subscription")
      toast.error("Subscriptions", "Failed to cancel subscription")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <CustomerDashboardLayout currentPage="subscriptions" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#111827" }}>My Subscriptions</h1>
            <p style={{ marginTop: "0.4rem", color: "#6b7280" }}>Track plan status, renewals, and cancellations.</p>
          </div>
          <Link href="/pricing" style={{ color: "white", textDecoration: "none", backgroundColor: "#2563eb", borderRadius: "0.5rem", padding: "0.65rem 1rem", fontWeight: 600 }}>
            Browse Plans
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "2rem", color: "#6b7280", textAlign: "center" }}>
            Loading subscriptions...
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "2rem", color: "#6b7280", textAlign: "center" }}>
            You do not have any subscriptions yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {subscriptions.map((subscription) => {
              const benefits = Array.isArray(subscription.plan?.benefitsJson)
                ? subscription.plan?.benefitsJson
                : []

              const canCancel =
                subscription.status === "ACTIVE" || subscription.status === "PAYMENT_PENDING"

              return (
                <div key={subscription.id} style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#111827" }}>
                        {subscription.plan?.name || "Plan"}
                      </h3>
                      <p style={{ marginTop: "0.35rem", marginBottom: 0, color: "#6b7280" }}>
                        {subscription.plan?.description || "No description"}
                      </p>
                    </div>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "0.25rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: statusColor(subscription.status).bg,
                        color: statusColor(subscription.status).fg,
                      }}
                    >
                      {labelize(subscription.status)}
                    </span>
                  </div>

                  <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", fontSize: "0.9rem", color: "#374151" }}>
                    <div>
                      <strong>Price:</strong>{" "}
                      {subscription.plan
                        ? `${subscription.plan.currency} ${subscription.plan.price.toFixed(2)}`
                        : "-"}
                    </div>
                    <div>
                      <strong>Cycle:</strong> {labelize(subscription.plan?.billingCycle || "-")}
                    </div>
                    <div>
                      <strong>Store:</strong>{" "}
                      {subscription.store
                        ? `${subscription.store.name}${subscription.store.city ? ` (${subscription.store.city})` : ""}`
                        : "Unassigned"}
                    </div>
                    <div>
                      <strong>Auto Renew:</strong> {subscription.autoRenew ? "Enabled" : "Disabled"}
                    </div>
                    <div>
                      <strong>Start:</strong> {new Date(subscription.startAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Renew:</strong>{" "}
                      {subscription.renewAt ? new Date(subscription.renewAt).toLocaleDateString() : "-"}
                    </div>
                  </div>

                  {benefits.length > 0 && (
                    <ul style={{ marginTop: "0.8rem", marginBottom: 0, color: "#374151" }}>
                      {benefits.map((benefit: string, index: number) => (
                        <li key={`${subscription.id}-benefit-${index}`}>{benefit}</li>
                      ))}
                    </ul>
                  )}

                  {canCancel && (
                    <div style={{ marginTop: "0.9rem" }}>
                      <button
                        onClick={() => cancelSubscription(subscription.id)}
                        disabled={processingId === subscription.id}
                        style={{
                          border: "none",
                          backgroundColor: processingId === subscription.id ? "#fca5a5" : "#dc2626",
                          color: "white",
                          borderRadius: "0.45rem",
                          padding: "0.55rem 0.85rem",
                          cursor: processingId === subscription.id ? "not-allowed" : "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {processingId === subscription.id ? "Cancelling..." : "Cancel Subscription"}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CustomerDashboardLayout>
  )
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function statusColor(status: Subscription["status"]) {
  if (status === "ACTIVE") return { bg: "#dcfce7", fg: "#166534" }
  if (status === "PAYMENT_PENDING") return { bg: "#ffedd5", fg: "#9a3412" }
  if (status === "CANCELLED") return { bg: "#fee2e2", fg: "#991b1b" }
  if (status === "EXPIRED") return { bg: "#e5e7eb", fg: "#374151" }
  return { bg: "#e0e7ff", fg: "#3730a3" }
}
