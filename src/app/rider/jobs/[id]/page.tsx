"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import OrderTimeline from "@/components/orders/OrderTimeline"
import { canTransition, statusLabel, type OrderStatusValue } from "@/lib/orderStatus"
import { useToast } from "@/components/ToastProvider"

interface RiderJobDetail {
  id: string
  orderNumber: string
  status: OrderStatusValue
  pickupDate?: string | null
  deliveryDate?: string | null
  specialInstructions?: string | null
  totalAmount: number
  user: {
    id: string
    firstName: string
    lastName: string
    phone?: string | null
    email?: string | null
  } | null
  store: {
    id: string
    name: string
    phone?: string | null
    city?: string | null
    state?: string | null
    address?: string | null
  }
  address: {
    id: string
    title?: string | null
    street: string
    city: string
    state: string
    zipCode: string
  } | null
  items: Array<{
    id: string
    quantity: number
    service: {
      id: string
      name: string
    } | null
  }>
  latestRiderUpdate?: {
    id: string
    description: string
    createdAt: string
  } | null
}

const ACTIONS: Array<{
  id: "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED"
  label: string
  targetStatus: OrderStatusValue
}> = [
  { id: "PICKED_UP", label: "Mark Picked Up", targetStatus: "IN_PROGRESS" },
  { id: "OUT_FOR_DELIVERY", label: "Mark Out for Delivery", targetStatus: "READY_FOR_PICKUP" },
  { id: "DELIVERED", label: "Mark Delivered", targetStatus: "DELIVERED" },
]

export default function RiderJobDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session, status } = useSession()
  const toast = useToast()
  const [job, setJob] = useState<RiderJobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push("/rider/login")
      return
    }

    if (session.user.role !== "RIDER") {
      router.push("/")
      return
    }

    if (!params?.id) return
    void fetchJob(params.id)
  }, [params?.id, router, session, status])

  async function fetchJob(jobId: string) {
    try {
      setLoading(true)
      const response = await fetch(`/api/rider/jobs/${jobId}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load job details")
      }
      setJob(payload.job)
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to load job details")
      setJob(null)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(nextStatus: "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED") {
    if (!job) return
    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/rider/jobs/${job.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update status")
      }

      await fetchJob(job.id)
      toast.success("Status Updated", `Order moved to ${statusLabel(payload.job.status)}`)
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const allowedActions = useMemo(() => {
    if (!job) return []
    return ACTIONS.filter((action) => canTransition(job.status, action.targetStatus))
  }, [job])

  const itemsCount = useMemo(() => {
    if (!job) return 0
    return job.items.reduce((sum, item) => sum + item.quantity, 0)
  }, [job])

  return (
    <div style={{ maxWidth: 1050, margin: "1.75rem auto", padding: "1rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827" }}>Job Detail</h1>
          <p style={{ marginTop: "0.35rem", color: "#64748b" }}>{job ? `#${job.orderNumber}` : "Loading..."}</p>
        </div>
        <Link href="/rider/dashboard" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
          Back to My Jobs
        </Link>
      </div>

      {loading ? (
        <section style={{ padding: "2rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white", color: "#64748b" }}>
          Loading job details...
        </section>
      ) : !job ? (
        <section style={{ padding: "2rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white", color: "#64748b" }}>
          Job not found.
        </section>
      ) : (
        <>
          <section style={{ padding: "1rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "1rem" }}>Status Timeline</h2>
            <OrderTimeline status={job.status} />
          </section>

          <section style={{ padding: "1rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "1rem" }}>Actions</h2>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {allowedActions.length === 0 ? (
                <span style={{ color: "#64748b" }}>No status actions available.</span>
              ) : (
                allowedActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => updateStatus(action.id)}
                    disabled={updatingStatus}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      padding: "0.55rem 0.9rem",
                      background: "#2563eb",
                      color: "white",
                      cursor: updatingStatus ? "not-allowed" : "pointer",
                    }}
                  >
                    {action.label}
                  </button>
                ))
              )}
            </div>
          </section>

          <section style={{ padding: "1rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "1rem" }}>Pickup Address</h2>
            <div style={{ color: "#0f172a" }}>
              {job.address
                ? `${job.address.street}, ${job.address.city}, ${job.address.state} ${job.address.zipCode}`
                : "Address not available"}
            </div>
            {job.user?.phone ? (
              <div style={{ marginTop: "0.5rem" }}>
                Customer: <a href={`tel:${job.user.phone}`} style={{ color: "#2563eb" }}>{job.user.phone}</a>
              </div>
            ) : null}
            {job.store?.phone ? (
              <div style={{ marginTop: "0.3rem" }}>
                Store: <a href={`tel:${job.store.phone}`} style={{ color: "#2563eb" }}>{job.store.phone}</a>
              </div>
            ) : null}
          </section>

          <section style={{ padding: "1rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "white" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: "1rem" }}>Items Summary</h2>
            <div style={{ marginBottom: "0.5rem", color: "#64748b" }}>Total Items: {itemsCount}</div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {job.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem" }}>
                  <span>{item.service?.name || "Service"}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
