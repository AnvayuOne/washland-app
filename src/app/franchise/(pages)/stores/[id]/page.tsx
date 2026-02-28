"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface StoreDetailPayload {
  success: boolean
  store?: {
    id: string
    name: string
    addressSummary: string
    phone?: string | null
    email?: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    admin?: {
      id: string
      firstName: string
      lastName: string
      email: string
      phone?: string | null
    } | null
  }
  kpis?: {
    ordersCount: number
    activeOrdersCount: number
    revenue: number
    avgOrderValue: number
  }
  error?: string
}

export default function FranchiseStoreDetailPage() {
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [payload, setPayload] = useState<StoreDetailPayload | null>(null)

  useEffect(() => {
    if (!params?.id) return
    void loadStore(params.id)
  }, [params?.id])

  async function loadStore(storeId: string) {
    try {
      setLoading(true)
      setError("")
      const response = await fetch(`/api/franchise/stores/${storeId}`)
      const data = (await response.json()) as StoreDetailPayload
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load store")
      }
      setPayload(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load store")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "950px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827", fontSize: "1.5rem" }}>Store Detail</h1>
          <p style={{ marginTop: "0.35rem", color: "#64748b" }}>{payload?.store?.name || "Loading..."}</p>
        </div>
        <Link href="/franchise/stores" style={{ color: "#1d4ed8", textDecoration: "none" }}>
          Back to Stores
        </Link>
      </div>

      {loading ? <div style={{ color: "#64748b" }}>Loading store...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading && !error && payload?.store && payload.kpis ? (
        <>
          <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Store Information</h2>
            <InfoRow label="Address" value={payload.store.addressSummary} />
            <InfoRow label="Status" value={payload.store.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Phone" value={payload.store.phone || "-"} />
            <InfoRow label="Email" value={payload.store.email || "-"} />
            <InfoRow label="Store Admin" value={payload.store.admin ? `${payload.store.admin.firstName} ${payload.store.admin.lastName}` : "-"} />
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.75rem" }}>
            <Stat title="Orders" value={payload.kpis.ordersCount.toString()} />
            <Stat title="Active Orders" value={payload.kpis.activeOrdersCount.toString()} />
            <Stat title="Revenue" value={`INR ${payload.kpis.revenue.toLocaleString("en-IN")}`} />
            <Stat title="Avg Order Value" value={`INR ${payload.kpis.avgOrderValue.toLocaleString("en-IN")}`} />
          </section>
        </>
      ) : null}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", marginBottom: "0.45rem", gap: "0.5rem" }}>
      <strong style={{ color: "#334155" }}>{label}</strong>
      <span style={{ color: "#0f172a" }}>{value}</span>
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.8rem" }}>
      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{title}</div>
      <div style={{ color: "#111827", fontWeight: 700, marginTop: "0.25rem" }}>{value}</div>
    </div>
  )
}
