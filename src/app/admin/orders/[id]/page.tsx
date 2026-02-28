"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"
import OrderTimeline from "@/components/orders/OrderTimeline"
import {
  getAllowedTransitions,
  statusLabel,
  type OrderStatusValue,
} from "@/lib/orderStatus"

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
    city?: string
    state?: string
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
    id: string
    firstName: string
    lastName: string
    phone?: string | null
  } | null
  deliveryRider?: {
    id: string
    firstName: string
    lastName: string
    phone?: string | null
  } | null
  latestRiderUpdate?: {
    id: string
    description: string
    createdAt: string
    user?: {
      id: string
      firstName: string
      lastName: string
    } | null
  } | null
}

export default function StoreAdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("Store Admin")
  const [storeName, setStoreName] = useState("")
  const [nextStatus, setNextStatus] = useState<OrderStatusValue | "">("")
  const [note, setNote] = useState("")

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const email = localStorage.getItem("userEmail")
    const store = localStorage.getItem("storeName")
    const name = localStorage.getItem("userName")

    if (role !== "STORE_ADMIN" && role !== "store-admin") {
      router.push("/admin/login")
      return
    }

    setUserRole(role || "")
    setUserEmail(email || "")
    setStoreName(store || "")
    if (name) setUserName(name)
    void fetchOrder(email || "", role || "")

    const pollingInterval = window.setInterval(() => {
      void fetchOrder(email || "", role || "")
    }, 15000)

    return () => {
      window.clearInterval(pollingInterval)
    }
  }, [params?.id, router])

  async function fetchOrder(email: string, role: string) {
    if (!params?.id) return
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders/${params.id}`, {
        headers: {
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch order")
      setOrder(payload.order)
      setNextStatus(payload.order.status)
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to fetch order")
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus() {
    if (!order || !nextStatus) return
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          note,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to update status")
      setOrder(payload.order)
      setNextStatus(payload.order.status)
      setNote("")
      toast.success("Updated", `Order moved to ${statusLabel(payload.order.status)}`)
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("storeId")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  const subtotal = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  }, [order])

  const allowedStatuses = order ? getAllowedTransitions(order.status) : []

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
      storeName={storeName}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: "1050px", margin: "0 auto", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: "#111827" }}>Order Details</h1>
            <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
              {order ? `#${order.orderNumber}` : "Loading order..."}
            </p>
          </div>
          <Link href="/admin/orders" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            Back to Orders
          </Link>
        </div>

        {loading ? (
          <Panel title="Loading">Loading order details...</Panel>
        ) : !order ? (
          <Panel title="Missing">Order not found.</Panel>
        ) : (
          <>
            <Panel title="Status Timeline">
              <OrderTimeline status={order.status} />
            </Panel>

            <Panel title="Store Admin Actions">
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 2fr auto" }}>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as OrderStatusValue)}
                  style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
                >
                  <option value={order.status}>{statusLabel(order.status)}</option>
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Internal note (optional)"
                  style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
                />
                <button
                  onClick={updateStatus}
                  disabled={saving || !nextStatus}
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
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem" }}>
                <Link href={`/admin/riders/assign?orderId=${order.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                  Assign Rider
                </Link>
              </div>
            </Panel>

            <Panel title="Order Summary">
              <SummaryRow label="Order Number" value={order.orderNumber} />
              <SummaryRow label="Status" value={statusLabel(order.status)} />
              <SummaryRow label="Payment Status" value={order.paymentStatus} />
              <SummaryRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
              <SummaryRow label="Updated" value={new Date(order.updatedAt).toLocaleString()} />
            </Panel>

            <Panel title="Customer and Address">
              <SummaryRow
                label="Customer"
                value={order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest"}
              />
              <SummaryRow label="Email" value={order.user?.email || "-"} />
              <SummaryRow label="Phone" value={order.user?.phone || "-"} />
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
              <SummaryRow
                label="Latest Rider Update"
                value={order.latestRiderUpdate ? `${order.latestRiderUpdate.description} (${new Date(order.latestRiderUpdate.createdAt).toLocaleString()})` : "No rider updates yet"}
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
              <div style={{ textAlign: "right", marginTop: "0.75rem", fontWeight: 700 }}>
                Total: INR {subtotal.toLocaleString("en-IN")}
              </div>
            </Panel>
          </>
        )}
      </div>
    </StoreAdminLayout>
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
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
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
