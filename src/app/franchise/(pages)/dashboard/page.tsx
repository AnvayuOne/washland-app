"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

interface SummaryResponse {
  success: boolean
  summary: {
    storeCount: number
    activeOrdersCount: number
    todayOrdersCount: number
    revenueThisMonth: number
  }
  topServices: Array<{
    serviceId: string
    serviceName: string
    totalQuantity: number
  }>
  recentActivity: Array<{
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    updatedAt: string
    customerName: string
    store: {
      id: string
      name: string
    }
  }>
  revenueByDay?: Array<{
    date: string
    revenue: number
  }>
  error?: string
}

export default function FranchiseDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<SummaryResponse | null>(null)

  useEffect(() => {
    void loadSummary()
  }, [])

  async function loadSummary() {
    try {
      setLoading(true)
      setError("")
      const response = await fetch("/api/franchise/summary")
      const payload = (await response.json()) as SummaryResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load dashboard")
      }
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ color: "#64748b" }}>Loading franchise dashboard...</div>
  }

  if (error || !data) {
    return (
      <div style={{ background: "#fff", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "10px", padding: "1rem" }}>
        {error || "Failed to load dashboard"}
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1200px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "1.75rem" }}>Franchise Dashboard</h1>
        <p style={{ marginTop: "0.4rem", color: "#64748b" }}>Real-time view of stores, orders, and monthly performance.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <StatCard title="Stores" value={data.summary.storeCount.toString()} />
        <StatCard title="Active Orders" value={data.summary.activeOrdersCount.toString()} />
        <StatCard title="Today's Orders" value={data.summary.todayOrdersCount.toString()} />
        <StatCard title="Revenue (Month)" value={`INR ${data.summary.revenueThisMonth.toLocaleString("en-IN")}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
        <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "1rem", color: "#0f172a" }}>Revenue Trend (Last 30 Days)</h2>
          {data.revenueByDay && data.revenueByDay.length > 0 ? (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {data.revenueByDay.map((point) => (
                <div key={point.date} style={{ display: "grid", gridTemplateColumns: "110px 1fr 110px", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{new Date(point.date).toLocaleDateString()}</span>
                  <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(2, (point.revenue / Math.max(...data.revenueByDay!.map((d) => d.revenue), 1)) * 100))}%`,
                        height: "100%",
                        background: "#2563eb",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "#0f172a", textAlign: "right" }}>INR {point.revenue.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#64748b" }}>No revenue data available.</div>
          )}
        </section>

        <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "1rem", color: "#0f172a" }}>Top Services</h2>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {data.topServices.length === 0 ? (
              <div style={{ color: "#64748b" }}>No service usage yet.</div>
            ) : (
              data.topServices.map((service) => (
                <div key={service.serviceId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                  <span style={{ color: "#0f172a" }}>{service.serviceName}</span>
                  <strong style={{ color: "#1d4ed8" }}>{service.totalQuantity}</strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>Recent Orders</h2>
          <Link href="/franchise/orders" style={{ color: "#1d4ed8", textDecoration: "none", fontSize: "0.85rem" }}>
            View all
          </Link>
        </div>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {data.recentActivity.length === 0 ? (
            <div style={{ color: "#64748b" }}>No recent order activity.</div>
          ) : (
            data.recentActivity.slice(0, 10).map((activity) => (
              <Link
                key={activity.id}
                href={`/franchise/orders/${activity.id}`}
                style={{
                  textDecoration: "none",
                  border: "1px solid #f1f5f9",
                  borderRadius: "8px",
                  padding: "0.6rem",
                  display: "grid",
                  gridTemplateColumns: "150px 1fr auto",
                  gap: "0.5rem",
                  color: "inherit",
                }}
              >
                <strong style={{ color: "#0f172a" }}>#{activity.orderNumber}</strong>
                <span style={{ color: "#475569" }}>{activity.customerName} - {activity.store.name}</span>
                <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{new Date(activity.updatedAt).toLocaleString()}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.9rem" }}>
      <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{title}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "1.15rem", marginTop: "0.2rem" }}>{value}</div>
    </div>
  )
}
