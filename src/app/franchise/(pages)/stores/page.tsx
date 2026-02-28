"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"

interface StoreRow {
  id: string
  name: string
  addressSummary: string
  isActive: boolean
  createdAt: string
  kpis?: {
    ordersCount: number
    activeOrdersCount: number
    revenue: number
  }
}

export default function FranchiseStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void loadStores()
  }, [])

  async function loadStores() {
    try {
      setLoading(true)
      setError("")
      const response = await fetch("/api/franchise/stores")
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load stores")
      }
      setStores(payload.stores || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load stores")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1200px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "1.6rem" }}>Franchise Stores</h1>
        <p style={{ marginTop: "0.35rem", color: "#64748b" }}>Stores mapped to your franchise with scoped KPIs.</p>
      </div>

      {loading ? <div style={{ color: "#64748b" }}>Loading stores...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading && !error ? (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <Th>Store</Th>
                <Th>Address</Th>
                <Th>Status</Th>
                <Th>Orders</Th>
                <Th>Revenue</Th>
                <Th>Created</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "1rem", color: "#64748b" }}>
                    No stores mapped to this franchise.
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <Td>{store.name}</Td>
                    <Td>{store.addressSummary}</Td>
                    <Td>{store.isActive ? "Active" : "Inactive"}</Td>
                    <Td>{store.kpis?.ordersCount ?? 0}</Td>
                    <Td>INR {(store.kpis?.revenue ?? 0).toLocaleString("en-IN")}</Td>
                    <Td>{new Date(store.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      <Link href={`/franchise/stores/${store.id}`} style={{ color: "#1d4ed8", textDecoration: "none", fontSize: "0.85rem" }}>
                        View
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function Th({ children }: { children?: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.65rem", fontSize: "0.75rem", color: "#64748b" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.65rem", fontSize: "0.88rem", color: "#0f172a" }}>{children}</td>
}
