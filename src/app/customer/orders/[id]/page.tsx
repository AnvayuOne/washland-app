"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import CustomerDashboardLayout from "@/components/CustomerDashboardLayout"
import { useToast } from "@/components/ToastProvider"
import OrderTimeline from "@/components/orders/OrderTimeline"
import { statusLabel, type OrderStatusValue } from "@/lib/orderStatus"

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
  store: {
    id: string
    name: string
    city?: string
    state?: string
    phone?: string | null
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
    notes?: string | null
    service: {
      id: string
      name: string
      description?: string | null
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

const CUSTOMER_CANCELABLE_STATUSES: OrderStatusValue[] = ["PAYMENT_PENDING", "CONFIRMED"]

export default function CustomerOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const toast = useToast()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || "")
    setUserName(localStorage.getItem("userName") || "Customer")
    if (!params?.id) return
    void fetchOrder()
  }, [params?.id])

  async function fetchOrder() {
    if (!params?.id) return
    try {
      setLoading(true)
      const response = await fetch(`/api/customer/orders/${params.id}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch order")
      setOrder(payload.order)
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to fetch order")
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  async function cancelOrder() {
    if (!order) return
    try {
      setSaving(true)
      const response = await fetch(`/api/customer/orders/${order.id}/cancel`, {
        method: "POST",
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Unable to cancel order")
      setOrder(payload.order)
      toast.success("Order Cancelled", "Your order was cancelled successfully")
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Unable to cancel order")
    } finally {
      setSaving(false)
    }
  }

  async function reorder() {
    if (!order) return
    try {
      const response = await fetch("/api/customer/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || "Failed to reorder")
      toast.success("Reorder Ready", "Items added. Continue in Book Service.")
      router.push("/book-service")
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to reorder")
    }
  }

  const subtotal = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  }, [order])

  const canCancel = !!order && CUSTOMER_CANCELABLE_STATUSES.includes(order.status)

  return (
    <CustomerDashboardLayout currentPage="orders" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: "1050px", margin: "0 auto", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: "#111827" }}>Order Details</h1>
            <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
              {order ? `#${order.orderNumber}` : "Loading order..."}
            </p>
          </div>
          <Link href="/customer/orders" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
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

            <Panel title="Actions">
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {canCancel ? (
                  <button
                    disabled={saving}
                    onClick={cancelOrder}
                    style={{
                      padding: "0.5rem 0.9rem",
                      borderRadius: "6px",
                      border: "none",
                      background: "#dc2626",
                      color: "white",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Cancelling..." : "Cancel Order"}
                  </button>
                ) : null}
                <button
                  onClick={reorder}
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderRadius: "6px",
                    border: "1px solid #1d4ed8",
                    background: "white",
                    color: "#1d4ed8",
                    cursor: "pointer",
                  }}
                >
                  Reorder
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

            <Panel title="Store and Delivery">
              <SummaryRow label="Store" value={`${order.store.name}${order.store.city ? `, ${order.store.city}` : ""}`} />
              <SummaryRow label="Store Phone" value={order.store.phone || "-"} />
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
              <div style={{ textAlign: "right", marginTop: "0.75rem", fontWeight: 700 }}>
                Total: INR {subtotal.toLocaleString("en-IN")}
              </div>
            </Panel>
          </>
        )}
      </div>
    </CustomerDashboardLayout>
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
