"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"

interface FranchiseServiceRow {
  id: string
  name: string
  description: string | null
  category: string
  globalBasePrice: number
  globalActive: boolean
  franchiseConfig: {
    id: string
    isActive: boolean
    defaultPrice: number | null
  } | null
  effectiveFranchisePrice: number
  isEnabledForFranchise: boolean
}

export default function FranchiseServicesPage() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [services, setServices] = useState<FranchiseServiceRow[]>([])
  const [error, setError] = useState<string>("")

  async function fetchServices() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/franchise/services")
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load services")
      }
      setServices(payload.services || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const activeCount = useMemo(
    () => services.filter((service) => service.isEnabledForFranchise).length,
    [services]
  )

  async function saveRow(serviceId: string) {
    const row = services.find((item) => item.id === serviceId)
    if (!row) return

    setSavingId(serviceId)
    setError("")

    try {
      const response = await fetch(`/api/franchise/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: row.franchiseConfig?.isActive ?? true,
          defaultPrice: row.franchiseConfig?.defaultPrice ?? null,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to save")
      }
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingId(null)
    }
  }

  async function resetRow(serviceId: string) {
    setSavingId(serviceId)
    setError("")
    try {
      const response = await fetch(`/api/franchise/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearOverride: true }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to reset")
      }
      await fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset")
    } finally {
      setSavingId(null)
    }
  }

  function updateRow(serviceId: string, updater: (row: FranchiseServiceRow) => FranchiseServiceRow) {
    setServices((prev) => prev.map((row) => (row.id === serviceId ? updater(row) : row)))
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.4rem", color: "#0f172a" }}>Franchise Service Catalog</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Configure which global services are enabled for your franchise and set default franchise pricing.
        </p>
        <div style={{ marginTop: "0.8rem", color: "#334155", fontSize: "0.92rem" }}>
          Active services: <strong>{activeCount}</strong> / {services.length}
        </div>
      </div>

      {error ? (
        <div style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: "10px", padding: "0.75rem" }}>
          {error}
        </div>
      ) : null}

      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: "1rem", color: "#64748b" }}>Loading services...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={th}>Service</th>
                <th style={th}>Category</th>
                <th style={th}>Global Price</th>
                <th style={th}>Franchise Price</th>
                <th style={th}>Enabled</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{service.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>{service.description || "No description"}</div>
                  </td>
                  <td style={td}>{service.category}</td>
                  <td style={td}>INR {service.globalBasePrice.toFixed(2)}</td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={service.franchiseConfig?.defaultPrice ?? ""}
                      placeholder={`INR ${service.globalBasePrice.toFixed(2)}`}
                      onChange={(event) => {
                        const raw = event.target.value
                        updateRow(service.id, (row) => ({
                          ...row,
                          franchiseConfig: {
                            id: row.franchiseConfig?.id || `draft-${row.id}`,
                            isActive: row.franchiseConfig?.isActive ?? true,
                            defaultPrice: raw === "" ? null : Number(raw),
                          },
                        }))
                      }}
                      style={{ width: "130px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.45rem 0.55rem" }}
                    />
                  </td>
                  <td style={td}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={service.franchiseConfig?.isActive ?? true}
                        disabled={!service.globalActive}
                        onChange={(event) => {
                          const checked = event.target.checked
                          updateRow(service.id, (row) => ({
                            ...row,
                            franchiseConfig: {
                              id: row.franchiseConfig?.id || `draft-${row.id}`,
                              isActive: checked,
                              defaultPrice: row.franchiseConfig?.defaultPrice ?? null,
                            },
                          }))
                        }}
                      />
                      {service.globalActive ? "Enabled" : "Global disabled"}
                    </label>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => saveRow(service.id)}
                        disabled={savingId === service.id}
                        style={primaryBtn}
                      >
                        {savingId === service.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => resetRow(service.id)}
                        disabled={savingId === service.id}
                        style={secondaryBtn}
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  color: "#334155",
  fontSize: "0.82rem",
  fontWeight: 700,
}

const td: CSSProperties = {
  padding: "0.75rem",
  color: "#0f172a",
  verticalAlign: "top",
}

const primaryBtn: CSSProperties = {
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "white",
  borderRadius: "8px",
  padding: "0.35rem 0.65rem",
  fontSize: "0.82rem",
  cursor: "pointer",
}

const secondaryBtn: CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#334155",
  borderRadius: "8px",
  padding: "0.35rem 0.65rem",
  fontSize: "0.82rem",
  cursor: "pointer",
}
