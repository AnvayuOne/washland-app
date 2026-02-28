"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  user: {
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
  } | null
  store: {
    name: string
    city?: string
    state?: string
    franchise?: { name: string } | null
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

interface ActivityItem {
  id: string
  type: string
  description: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
  } | null
}

export default function FranchiseOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    if (!params?.id) return
    void loadOrder(params.id)
  }, [params?.id])

  async function loadOrder(orderId: string) {
    try {
      setLoading(true)
      setError("")
      const response = await fetch(`/api/franchise/orders/${orderId}`)
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load order")
      }
      setOrder(payload.order)
      setActivities(payload.activities || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load order")
    } finally {
      setLoading(false)
    }
  }

  const subtotal = useMemo(() => {
    if (!order) return 0
    return order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  }, [order])

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1050px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827", fontSize: "1.55rem" }}>Order Detail</h1>
          <p style={{ marginTop: "0.35rem", color: "#64748b" }}>{order ? `#${order.orderNumber}` : "Loading..."}</p>
        </div>
        <Link href="/franchise/orders" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          Back to Orders
        </Link>
      </div>

      {loading ? <div style={{ color: "#64748b" }}>Loading order...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading && !error && order ? (
        <>
          <Panel title="Status Timeline">
            <OrderTimeline status={order.status} />
          </Panel>

          <Panel title="Order Summary">
            <SummaryRow label="Order Number" value={order.orderNumber} />
            <SummaryRow label="Status" value={statusLabel(order.status)} />
            <SummaryRow label="Payment Status" value={order.paymentStatus} />
            <SummaryRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
            <SummaryRow label="Updated" value={new Date(order.updatedAt).toLocaleString()} />
          </Panel>

          <Panel title="Store, Customer, Address">
            <SummaryRow label="Store" value={`${order.store.name}${order.store.city ? `, ${order.store.city}` : ""}`} />
            <SummaryRow label="Customer" value={order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest"} />
            <SummaryRow label="Customer Phone" value={order.user?.phone || "-"} />
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
            <div style={{ textAlign: "right", marginTop: "0.7rem", fontWeight: 700 }}>
              Total: INR {subtotal.toLocaleString("en-IN")}
            </div>
          </Panel>

          <Panel title="Activity Trail">
            {activities.length < 1 ? (
              <div style={{ color: "#64748b" }}>No activity logged for this order yet.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.45rem" }}>
                {activities.map((activity) => (
                  <div key={activity.id} style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.6rem" }}>
                    <div style={{ color: "#0f172a", fontWeight: 600 }}>{activity.description}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {activity.type} - {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
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
    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "0.45rem", marginBottom: "0.45rem" }}>
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
