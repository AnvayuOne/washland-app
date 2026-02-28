"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/DashboardLayout"
import {
  ORDER_STATUS_SEQUENCE,
  canTransition,
  statusLabel,
  type OrderStatusValue,
} from "@/lib/orderStatus"

interface OrderRecord {
  id: string
  orderNumber: string
  status: OrderStatusValue
  totalAmount: number
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
  } | null
  store: {
    name: string
    franchise?: {
      name: string
    } | null
  }
  items: Array<{
    id: string
    quantity: number
    service?: {
      name: string
    } | null
  }>
}

const STATUS_COLORS: Record<OrderStatusValue, string> = {
  PAYMENT_PENDING: "#ea580c",
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  READY_FOR_PICKUP: "#14b8a6",
  DELIVERED: "#10b981",
  COMPLETED: "#64748b",
  CANCELLED: "#ef4444",
}

export default function WashlandOrdersPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState("all")

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
    if (!ready) return
    void fetchOrders()
  }, [ready, selectedStatus, userRole, userEmail])

  async function fetchOrders() {
    try {
      setLoading(true)
      const query = selectedStatus !== "all" ? `?status=${selectedStatus}` : ""
      const roleHeader = userRole === "washland" ? "SUPER_ADMIN" : userRole
      const response = await fetch(`/api/admin/orders${query}`, {
        headers: {
        },
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load orders")
      }
      setOrders(Array.isArray(payload?.orders) ? payload.orders : [])
    } catch (error) {
      console.error("Failed to fetch washland orders:", error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  async function updateOrderStatus(orderId: string, from: OrderStatusValue, to: OrderStatusValue) {
    try {
      const roleHeader = userRole === "washland" ? "SUPER_ADMIN" : userRole
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: to, force: true }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to update status")
      }
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: to } : order)))
    } catch (error) {
      console.error("Failed to update status:", error)
      window.alert(error instanceof Error ? error.message : `Unable to move ${statusLabel(from)} to ${statusLabel(to)}`)
    }
  }

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  const stats = useMemo(() => {
    const active = orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)).length
    const completed = orders.filter((order) => order.status === "COMPLETED").length
    const revenue = orders
      .filter((order) => order.status === "COMPLETED")
      .reduce((sum, order) => sum + Number(order.totalAmount), 0)
    return {
      total: orders.length,
      active,
      completed,
      revenue,
    }
  }, [orders])

  if (!ready) return null

  return (
    <DashboardLayout
      userRole={userRole}
      userName="Washland Admin"
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#111827" }}>Order Management</h1>
          <p style={{ color: "#6b7280" }}>Track and manage network-wide orders</p>
        </div>

        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>Filter by status</label>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "white",
            }}
          >
            <option value="all">All</option>
            {ORDER_STATUS_SEQUENCE.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <StatCard title="Total Orders" value={stats.total.toString()} />
          <StatCard title="Active Orders" value={stats.active.toString()} />
          <StatCard title="Completed" value={stats.completed.toString()} />
          <StatCard title="Revenue" value={`INR ${stats.revenue.toLocaleString("en-IN")}`} />
        </div>

        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No orders found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Store</Th>
                  <Th>Items</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextStatuses = ORDER_STATUS_SEQUENCE.filter(
                    (candidate) => candidate !== order.status && canTransition(order.status, candidate)
                  )
                  return (
                    <tr key={order.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <Td>#{order.orderNumber}</Td>
                      <Td>
                        <div>{order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest"}</div>
                        <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{order.user?.email || "No email"}</div>
                      </Td>
                      <Td>
                        <div>{order.store?.name || "-"}</div>
                        <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{order.store?.franchise?.name || "-"}</div>
                      </Td>
                      <Td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</Td>
                      <Td>INR {Number(order.totalAmount).toLocaleString("en-IN")}</Td>
                      <Td>
                        <span
                          style={{
                            padding: "0.2rem 0.6rem",
                            borderRadius: "999px",
                            background: `${STATUS_COLORS[order.status]}1a`,
                            color: STATUS_COLORS[order.status],
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </Td>
                      <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <Link href={`/washland/orders/${order.id}`} style={{ color: "#2563eb", fontSize: "0.85rem" }}>
                            View Details
                          </Link>
                          {nextStatuses.length > 0 && order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
                            <select
                              value={order.status}
                              onChange={(event) => updateOrderStatus(order.id, order.status, event.target.value as OrderStatusValue)}
                              style={{
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                background: "white",
                              }}
                            >
                              <option value={order.status}>{statusLabel(order.status)}</option>
                              {nextStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", padding: "1rem", border: "1px solid #e5e7eb" }}>
      <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{title}</div>
      <div style={{ color: "#111827", fontWeight: 700, fontSize: "1.25rem" }}>{value}</div>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#111827" }}>{children}</td>
}
