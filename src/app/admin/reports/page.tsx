"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Activity, Bike, Clock3, DollarSign, Receipt, Truck } from "lucide-react"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"
import { statusLabel } from "@/lib/orderStatus"

interface DashboardStats {
  todaysOrders: number
  pendingPickups: number
  readyForDelivery: number
  totalCustomers: number
  monthlyRevenue: number
  activeRiders: number
}

interface OrderRecord {
  id: string
  status: string
  totalAmount: number
  paymentStatus: string
  createdAt: string
}

interface ActivityRecord {
  id: string
  type: string
  description: string
  createdAt: string
  user?: {
    name: string
    email: string
    role: string
  } | null
}

const EMPTY_STATS: DashboardStats = {
  todaysOrders: 0,
  pendingPickups: 0,
  readyForDelivery: 0,
  totalCustomers: 0,
  monthlyRevenue: 0,
  activeRiders: 0,
}

function formatTimeAgo(input: string) {
  const now = Date.now()
  const then = new Date(input).getTime()
  const diffMs = Math.max(0, now - then)
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export default function AdminReportsPage() {
  const router = useRouter()
  const toast = useToast()

  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])

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
    const loadReports = async () => {
      setLoading(true)
      try {
        const [statsResp, ordersResp, activityResp] = await Promise.all([
          fetch(`/api/admin/store-analytics?storeId=${encodeURIComponent(storeId)}`),
          fetch(`/api/admin/orders?storeId=${encodeURIComponent(storeId)}&limit=200`),
          fetch(`/api/admin/activities?storeId=${encodeURIComponent(storeId)}&limit=20`),
        ])

        if (!statsResp.ok) {
          throw new Error("Failed to fetch analytics")
        }

        const statsPayload = await statsResp.json()
        const ordersPayload = ordersResp.ok ? await ordersResp.json() : { orders: [] }
        const activityPayload = activityResp.ok ? await activityResp.json() : { activities: [] }

        if (!active) return

        setStats(statsPayload.stats || EMPTY_STATS)
        setOrders(
          Array.isArray(ordersPayload.orders)
            ? ordersPayload.orders.map((order: any) => ({
                id: order.id,
                status: order.status,
                totalAmount: Number(order.totalAmount || 0),
                paymentStatus: order.paymentStatus,
                createdAt: order.createdAt,
              }))
            : []
        )
        setActivities(Array.isArray(activityPayload.activities) ? activityPayload.activities : [])
      } catch (error) {
        console.error("Failed to load reports:", error)
        if (active) {
          toast.error("Reports", "Failed to load report data.")
          setOrders([])
          setActivities([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReports()
    return () => {
      active = false
    }
  }, [storeId, toast])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const order of orders) {
      counts[order.status] = (counts[order.status] || 0) + 1
    }
    return counts
  }, [orders])

  const statusEntries = useMemo(() => {
    return Object.entries(statusCounts).sort(([, countA], [, countB]) => countB - countA)
  }, [statusCounts])

  const paidRevenue = useMemo(() => {
    return orders
      .filter((order) => order.paymentStatus === "PAID")
      .reduce((sum, order) => sum + order.totalAmount, 0)
  }, [orders])

  const trend7Days = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short" })
    const now = new Date()
    const days = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(now)
      date.setDate(now.getDate() - (6 - idx))
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      return {
        key,
        label: formatter.format(date),
        count: 0,
      }
    })

    for (const order of orders) {
      const created = new Date(order.createdAt)
      const key = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`
      const day = days.find((d) => d.key === key)
      if (day) day.count += 1
    }

    return days
  }, [orders])

  const maxTrendCount = useMemo(() => {
    const max = Math.max(...trend7Days.map((day) => day.count), 0)
    return max || 1
  }, [trend7Days])

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
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "1200px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>Reports</h1>
          <p style={{ color: "#6b7280" }}>Store-level operational and revenue report snapshot.</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.9rem",
          }}
        >
          <MetricCard
            label="Today's Orders"
            value={stats.todaysOrders.toString()}
            icon={<Receipt size={18} />}
            iconBg="#dbeafe"
            iconColor="#1d4ed8"
          />
          <MetricCard
            label="Pending Pickups"
            value={stats.pendingPickups.toString()}
            icon={<Clock3 size={18} />}
            iconBg="#fef3c7"
            iconColor="#b45309"
          />
          <MetricCard
            label="Ready For Delivery"
            value={stats.readyForDelivery.toString()}
            icon={<Truck size={18} />}
            iconBg="#dcfce7"
            iconColor="#166534"
          />
          <MetricCard
            label="Monthly Revenue (PAID)"
            value={`INR ${stats.monthlyRevenue.toLocaleString()}`}
            icon={<DollarSign size={18} />}
            iconBg="#e0e7ff"
            iconColor="#3730a3"
          />
          <MetricCard
            label="Paid Revenue (Loaded Orders)"
            value={`INR ${paidRevenue.toLocaleString()}`}
            icon={<Activity size={18} />}
            iconBg="#cffafe"
            iconColor="#0e7490"
          />
          <MetricCard
            label="Active Riders"
            value={stats.activeRiders.toString()}
            icon={<Bike size={18} />}
            iconBg="#fee2e2"
            iconColor="#b91c1c"
          />
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "1rem",
          }}
        >
          <h3 style={{ margin: 0, marginBottom: "0.75rem", color: "#111827" }}>Order Status Breakdown</h3>
          {loading ? (
            <p style={{ color: "#6b7280", margin: 0 }}>Loading...</p>
          ) : Object.keys(statusCounts).length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>No orders found for this store.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
              {Object.entries(statusCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([status, count]) => (
                  <div key={status} style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.7rem" }}>
                    <div style={{ color: "#334155", fontSize: "0.82rem" }}>{statusLabel(status)}</div>
                    <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "1.15rem" }}>{count}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "0.9rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: "0.75rem", color: "#111827" }}>Orders (Last 7 Days)</h3>
            {loading ? (
              <p style={{ color: "#6b7280", margin: 0 }}>Loading...</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.65rem", minHeight: "160px" }}>
                {trend7Days.map((day) => {
                  const heightPercent = Math.round((day.count / maxTrendCount) * 100)
                  return (
                    <div key={day.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ color: "#334155", fontSize: "0.75rem", marginBottom: "0.25rem" }}>{day.count}</div>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "32px",
                          minHeight: "8px",
                          height: `${Math.max(8, heightPercent)}px`,
                          borderRadius: "8px 8px 2px 2px",
                          background: "linear-gradient(180deg, #2563eb 0%, #60a5fa 100%)",
                        }}
                      />
                      <div style={{ color: "#64748b", fontSize: "0.74rem", marginTop: "0.35rem" }}>{day.label}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: "0.75rem", color: "#111827" }}>Status Distribution</h3>
            {loading ? (
              <p style={{ color: "#6b7280", margin: 0 }}>Loading...</p>
            ) : statusEntries.length === 0 ? (
              <p style={{ color: "#6b7280", margin: 0 }}>No order statuses available.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {statusEntries.map(([status, count]) => {
                  const percentage = Math.round((count / orders.length) * 100)
                  return (
                    <div key={status}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.82rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ color: "#334155" }}>{statusLabel(status)}</span>
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div style={{ width: "100%", background: "#e5e7eb", borderRadius: "999px", height: "8px" }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            background: "linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)",
                            height: "8px",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "1rem",
          }}
        >
          <h3 style={{ margin: 0, marginBottom: "0.75rem", color: "#111827" }}>Recent Activity</h3>
          {loading ? (
            <p style={{ color: "#6b7280", margin: 0 }}>Loading...</p>
          ) : activities.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>No recent activity found for this store.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    background: "#f8fafc",
                    borderRadius: "8px",
                    padding: "0.65rem 0.75rem",
                    border: "1px solid #eef2f7",
                  }}
                >
                  <div style={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 600 }}>{activity.description}</div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                    {activity.type} | {formatTimeAgo(activity.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StoreAdminLayout>
  )
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string
  icon: ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        padding: "0.9rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <div>
        <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: "0.35rem" }}>{label}</div>
        <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "1.1rem" }}>{value}</div>
      </div>
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: iconBg,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  )
}
