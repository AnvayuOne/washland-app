"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"
import { statusLabel, type OrderStatusValue } from "@/lib/orderStatus"

interface OrderRecord {
  id: string
  orderNumber: string
  status: OrderStatusValue
  paymentStatus: string
  totalAmount: number
  createdAt: string
  user?: {
    firstName: string
    lastName: string
    phone?: string | null
  } | null
}

const HISTORY_STATUSES: OrderStatusValue[] = ["DELIVERED", "COMPLETED", "CANCELLED"]

export default function AdminOrderHistoryPage() {
  const router = useRouter()
  const toast = useToast()

  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<OrderRecord[]>([])

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const selectedStoreId = localStorage.getItem("storeId")
    const email = localStorage.getItem("userEmail")

    if (role !== "STORE_ADMIN" && role !== "store-admin") {
      router.push("/admin/login")
      return
    }

    if (!selectedStoreId) {
      toast.error("Error", "No store selected. Please login again.")
      router.push("/admin/login")
      return
    }

    setUserRole(role)
    setUserEmail(email || "")
    setStoreId(selectedStoreId)

    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) setUserName(e.detail.name)
      if (e.detail?.storeName) setStoreName(e.detail.storeName)
    }

    window.addEventListener("auth:session", handleAuthUpdate as EventListener)
    return () => {
      window.removeEventListener("auth:session", handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  useEffect(() => {
    if (!storeId) return

    let active = true
    const loadOrders = async () => {
      setLoading(true)
      try {
        const statusParam = encodeURIComponent(HISTORY_STATUSES.join(","))
        const response = await fetch(`/api/admin/orders?storeId=${encodeURIComponent(storeId)}&status=${statusParam}&limit=300`)
        const payload = response.ok ? await response.json() : { orders: [] }
        if (!active) return
        setOrders(Array.isArray(payload.orders) ? payload.orders : [])
      } catch (error) {
        console.error("Failed to load order history:", error)
        if (active) {
          toast.error("Order History", "Failed to load past orders.")
          setOrders([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrders()
    return () => {
      active = false
    }
  }, [storeId, toast])

  const visibleOrders = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter((order) => {
      const customerName = `${order.user?.firstName || ""} ${order.user?.lastName || ""}`.toLowerCase()
      return order.orderNumber.toLowerCase().includes(q) || customerName.includes(q) || (order.user?.phone || "").includes(q)
    })
  }, [orders, search])

  function handleSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("storeId")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    router.push("/")
  }

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName || "Store Admin"}
      userEmail={userEmail}
      storeName={storeName}
      onSignOut={handleSignOut}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>Order History</h1>
            <p style={{ color: "#6b7280" }}>Delivered, completed, and cancelled orders for this store.</p>
          </div>
          <Link
            href="/admin/orders"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              color: "#1f2937",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View Active Orders
          </Link>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.75rem",
            display: "flex",
            gap: "0.7rem",
            alignItems: "center",
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order number, customer name, or phone"
            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 0.75rem", width: "100%" }}
          />
          <div style={{ color: "#64748b", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
            {visibleOrders.length} order{visibleOrders.length === 1 ? "" : "s"}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "1rem", color: "#64748b" }}>Loading order history...</div>
          ) : visibleOrders.length === 0 ? (
            <div style={{ padding: "1rem", color: "#64748b" }}>No historical orders found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={thStyle}>Order</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Payment</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>#{order.orderNumber}</td>
                      <td style={tdStyle}>
                        {order.user ? `${order.user.firstName} ${order.user.lastName}` : "Guest Customer"}
                      </td>
                      <td style={tdStyle}>{statusLabel(order.status)}</td>
                      <td style={tdStyle}>{order.paymentStatus}</td>
                      <td style={tdStyle}>INR {Number(order.totalAmount || 0).toLocaleString()}</td>
                      <td style={tdStyle}>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <Link href={`/admin/orders/${order.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StoreAdminLayout>
  )
}

const thStyle: CSSProperties = {
  padding: "0.75rem",
  fontSize: "0.78rem",
  color: "#475569",
  fontWeight: 700,
}

const tdStyle: CSSProperties = {
  padding: "0.75rem",
  fontSize: "0.9rem",
  color: "#0f172a",
}
