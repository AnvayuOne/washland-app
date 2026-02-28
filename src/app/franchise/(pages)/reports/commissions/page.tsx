"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

interface CommissionRow {
  storeId: string
  storeName: string
  storeRevenue: number
  storeCommission: number
}

interface CommissionResponse {
  success: boolean
  period: {
    dateFrom: string
    dateTo: string
  }
  commissionRate: number
  totals: {
    totalRevenue: number
    commissionDue: number
  }
  stores: CommissionRow[]
  error?: string
}

export default function FranchiseCommissionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [data, setData] = useState<CommissionResponse | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    const query = params.toString()
    return query ? `?${query}` : ""
  }, [dateFrom, dateTo])

  useEffect(() => {
    void loadReport()
  }, [])

  async function loadReport() {
    try {
      setLoading(true)
      setError("")
      const response = await fetch(`/api/franchise/reports/commissions${queryString}`)
      const payload = (await response.json()) as CommissionResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load commission report")
      }
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load commission report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1100px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "1.6rem" }}>Commission Report</h1>
        <p style={{ marginTop: "0.35rem", color: "#64748b" }}>Store-wise commission calculation based on paid orders.</p>
      </div>

      <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.9rem" }}>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "end" }}>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.8rem", color: "#475569" }}>
            Date From
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.45rem" }} />
          </label>
          <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.8rem", color: "#475569" }}>
            Date To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.45rem" }} />
          </label>
          <button
            onClick={() => void loadReport()}
            style={{ padding: "0.52rem 0.8rem", borderRadius: "8px", border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" }}
          >
            Apply
          </button>
        </div>
      </section>

      {loading ? <div style={{ color: "#64748b" }}>Loading report...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading && !error && data ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
            <StatCard title="Commission Rate" value={`${(data.commissionRate * 100).toFixed(2)}%`} />
            <StatCard title="Total Revenue" value={`INR ${data.totals.totalRevenue.toLocaleString("en-IN")}`} />
            <StatCard title="Commission Due" value={`INR ${data.totals.commissionDue.toLocaleString("en-IN")}`} />
          </section>

          <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <Th>Store</Th>
                  <Th>Revenue</Th>
                  <Th>Commission</Th>
                </tr>
              </thead>
              <tbody>
                {data.stores.length < 1 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "1rem", color: "#64748b" }}>No paid orders in selected period.</td>
                  </tr>
                ) : (
                  data.stores.map((row) => (
                    <tr key={row.storeId} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <Td>{row.storeName}</Td>
                      <Td>INR {row.storeRevenue.toLocaleString("en-IN")}</Td>
                      <Td>INR {row.storeCommission.toLocaleString("en-IN")}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.9rem" }}>
      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{title}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, marginTop: "0.25rem" }}>{value}</div>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.65rem", fontSize: "0.75rem", color: "#64748b" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.65rem", fontSize: "0.88rem", color: "#0f172a" }}>{children}</td>
}
