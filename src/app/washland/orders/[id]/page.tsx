"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"
import OrderTimeline from "@/components/orders/OrderTimeline"
import { ORDER_STATUS_SEQUENCE, statusLabel, type OrderStatusValue } from "@/lib/orderStatus"

interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatusValue
  paymentStatus: string
  totalAmount: number
  createdAt: string
  updatedAt: string
  pickupDate?: string | null
  deliveryDate?: string | null
  specialInstructions?: string | null
  user: {
    id: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
  } | null
  store: {
    id: string
    name: string
    phone?: string | null
    city?: string
    state?: string
    franchise?: { id: string; name: string } | null
  }
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  } | null
  items: Array<{
    id: string
    quantity: number
    price: number
    service: {
      id: string
      name: string
    } | null
  }>
  pickupRider?: {
    firstName: string
    lastName: string
    phone?: string | null
  } | null
  deliveryRider?: {
    firstName: string
    lastName: string
    phone?: string | null
  } | null
}

interface ActivityRecord {
  id: string
  type: string
  description: string
  createdAt: string
}

export default function WashlandOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [status, setStatus] = useState<OrderStatusValue | "">("")
  const [note, setNote] = useState("")

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const email = localStorage.getItem("userEmail")
    if (role !== "SUPER_ADMIN" && role !== "washland") {
      router.push("/washland/login")
      return
    }
    setUserRole(role || "")
    setUserEmail(email || "")
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!ready || !params?.id) return
    void Promise.all([fetchOrder(), fetchActivities()])
  }, [ready, params?.id, userRole, userEmail])

  async function fetchOrder() {
    try {
      setLoading(true)
      const roleHeader = userRole === "washland" ? "SUPER_ADMIN" : userRole
      const response = await fetch(`/api/admin/orders/${params.id}`, {
        headers: {
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch order")
      setOrder(payload.order)
      setStatus(payload.order.status)
    } catch (error) {
      console.error(error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch(`/api/admin/activities?limit=200`)
      const payload = await response.json()
      if (!response.ok) return
      const list = Array.isArray(payload.activities) ? payload.activities : []
      const orderActivities = list.filter((item: any) => item?.metadata?.orderId === params.id)
      setActivities(orderActivities)
    } catch (error) {
      console.error("Failed to load activities:", error)
    }
  }

  async function submitStatus() {
    if (!order || !status) return
    try {
      setSaving(true)
      const roleHeader = userRole === "washland" ? "SUPER_ADMIN" : userRole
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          note,
          force: true,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update status")
      }
      setOrder(payload.order)
      setStatus(payload.order.status)
      setNote("")
      await fetchActivities()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  const itemSubtotal = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  }, [order])

  if (!ready) return null

  return (
    <DashboardLayout userRole={userRole} userName="Washland Admin" userEmail={userEmail} onSignOut={handleSignOut}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#111827" }}>Order Details</h1>
            <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
              {order ? `#${order.orderNumber}` : "Loading order..."}
            </p>
          </div>
          <Link href="/washland/orders" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            Back to Orders
          </Link>
        </div>

        {loading ? (
          <Panel title="Loading">Loading order details...</Panel>
        ) : !order ? (
          <Panel title="Not Found">Order not found.</Panel>
        ) : (
          <>
            <Panel title="Status Timeline">
              <OrderTimeline status={order.status} />
            </Panel>

            <Panel title="Status Control (Override)">
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 2fr auto" }}>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrderStatusValue)}
                  style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
                >
                  {ORDER_STATUS_SEQUENCE.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note for audit trail"
                  style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
                />
                <button
                  onClick={submitStatus}
                  disabled={saving || !status}
                  style={{
                    padding: "0.5rem 0.9rem",
                    border: "none",
                    borderRadius: "6px",
                    background: "#2563eb",
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Update"}
                </button>
              </div>
            </Panel>

            <Panel title="Order Summary">
              <SummaryRow label="Order Number" value={order.orderNumber} />
              <SummaryRow label="Status" value={statusLabel(order.status)} />
              <SummaryRow label="Payment Status" value={order.paymentStatus} />
              <SummaryRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
              <SummaryRow label="Updated" value={new Date(order.updatedAt).toLocaleString()} />
              <SummaryRow label="Pickup Date" value={order.pickupDate ? new Date(order.pickupDate).toLocaleString() : "-"} />
              <SummaryRow label="Delivery Date" value={order.deliveryDate ? new Date(order.deliveryDate).toLocaleString() : "-"} />
              <SummaryRow label="Instructions" value={order.specialInstructions || "-"} />
            </Panel>

            <Panel title="People and Location">
              <SummaryRow
                label="Customer"
                value={order.user ? `${order.user.firstName} ${order.user.lastName} (${order.user.email || "No email"})` : "Guest"}
              />
              <SummaryRow
                label="Store"
                value={`${order.store.name}${order.store.franchise ? ` (${order.store.franchise.name})` : ""}`}
              />
              <SummaryRow
                label="Address"
                value={order.address ? `${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}` : "-"}
              />
              <SummaryRow
                label="Pickup Rider"
                value={order.pickupRider ? `${order.pickupRider.firstName} ${order.pickupRider.lastName}` : "Not assigned"}
              />
              <SummaryRow
                label="Delivery Rider"
                value={order.deliveryRider ? `${order.deliveryRider.firstName} ${order.deliveryRider.lastName}` : "Not assigned"}
              />
            </Panel>

            <Panel title="Items and Totals">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <Th>Service</Th>
                    <Th>Qty</Th>
                    <Th>Unit Price</Th>
                    <Th>Line Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td>{item.service?.name || "Unknown Service"}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>INR {Number(item.price).toLocaleString("en-IN")}</Td>
                      <Td>INR {(Number(item.price) * item.quantity).toLocaleString("en-IN")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "0.75rem", textAlign: "right", fontWeight: 700 }}>
                Total: INR {itemSubtotal.toLocaleString("en-IN")}
              </div>
            </Panel>

            <Panel title="Audit Trail">
              {activities.length === 0 ? (
                <div style={{ color: "#64748b" }}>No activity records for this order yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {activities.map((activity) => (
                    <div key={activity.id} style={{ padding: "0.6rem", borderRadius: "8px", background: "#f8fafc" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{activity.description}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {activity.type} • {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
      <h2 style={{ marginTop: 0, marginBottom: "0.8rem", fontSize: "1rem", color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <strong style={{ color: "#334155" }}>{label}</strong>
      <span style={{ color: "#0f172a" }}>{value}</span>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.5rem", fontSize: "0.9rem", color: "#0f172a" }}>{children}</td>
}
