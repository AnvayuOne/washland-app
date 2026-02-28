"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"

interface StoreServiceRow {
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
  storeOverride: {
    id: string
    isActive: boolean
    price: number
  } | null
  effectivePrice: number
  isAvailable: boolean
}

export default function AdminServicesPage() {
  const router = useRouter()
  const toast = useToast()

  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [storeName, setStoreName] = useState("")

  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [services, setServices] = useState<StoreServiceRow[]>([])

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

    const handleAuthUpdate = (event: CustomEvent) => {
      if (event.detail?.name) setUserName(event.detail.name)
      if (event.detail?.storeName) setStoreName(event.detail.storeName)
    }
    window.addEventListener("auth:session", handleAuthUpdate as EventListener)

    return () => {
      window.removeEventListener("auth:session", handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  async function fetchServices(activeStoreId: string) {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        storeId: activeStoreId,
        includeInactive: "true",
      }).toString()
      const response = await fetch(`/api/admin/store-services?${query}`)
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load services")
      }

      setStoreName(payload.store?.name || "")
      setServices(payload.services || [])
    } catch (error) {
      console.error("Failed to fetch store services:", error)
      toast.error("Services", error instanceof Error ? error.message : "Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!storeId) return
    fetchServices(storeId)
  }, [storeId])

  const enabledCount = useMemo(() => services.filter((service) => service.isAvailable).length, [services])

  function updateRow(serviceId: string, updater: (row: StoreServiceRow) => StoreServiceRow) {
    setServices((prev) => prev.map((row) => (row.id === serviceId ? updater(row) : row)))
  }

  async function saveRow(serviceId: string) {
    const row = services.find((item) => item.id === serviceId)
    if (!row) return

    setSavingId(serviceId)
    try {
      const response = await fetch(`/api/admin/store-services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          isActive: row.storeOverride?.isActive ?? true,
          price: row.storeOverride?.price ?? row.effectivePrice,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to save service")
      }
      toast.success("Services", "Store service override saved")
      await fetchServices(storeId)
    } catch (error) {
      toast.error("Services", error instanceof Error ? error.message : "Failed to save service")
    } finally {
      setSavingId(null)
    }
  }

  async function resetRow(serviceId: string) {
    setSavingId(serviceId)
    try {
      const response = await fetch(`/api/admin/store-services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          clearOverride: true,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to reset service")
      }
      toast.success("Services", "Store override reset to franchise/global defaults")
      await fetchServices(storeId)
    } catch (error) {
      toast.error("Services", error instanceof Error ? error.message : "Failed to reset service")
    } finally {
      setSavingId(null)
    }
  }

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
      storeName={storeName || "Store"}
      onSignOut={handleSignOut}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "0.4rem", color: "#0f172a" }}>Store Services & Pricing</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Set store-specific service availability and pricing overrides.
          </p>
          <div style={{ marginTop: "0.8rem", color: "#334155", fontSize: "0.92rem" }}>
            Enabled for this store: <strong>{enabledCount}</strong> / {services.length}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: "1rem", color: "#64748b" }}>Loading services...</div>
          ) : (
            <table style={{ width: "100%", minWidth: "960px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={th}>Service</th>
                  <th style={th}>Category</th>
                  <th style={th}>Global Price</th>
                  <th style={th}>Franchise Price</th>
                  <th style={th}>Store Price</th>
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
                      {service.franchiseConfig?.defaultPrice !== null && service.franchiseConfig?.defaultPrice !== undefined
                        ? `INR ${service.franchiseConfig.defaultPrice.toFixed(2)}`
                        : "Uses global"}
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.storeOverride?.price ?? service.effectivePrice}
                        onChange={(event) => {
                          const value = Number(event.target.value || 0)
                          updateRow(service.id, (row) => ({
                            ...row,
                            storeOverride: {
                              id: row.storeOverride?.id || `draft-${row.id}`,
                              isActive: row.storeOverride?.isActive ?? true,
                              price: value,
                            },
                          }))
                        }}
                        style={{ width: "130px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.45rem 0.55rem" }}
                      />
                    </td>
                    <td style={td}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <input
                          type="checkbox"
                          checked={service.storeOverride?.isActive ?? true}
                          disabled={!service.globalActive || (service.franchiseConfig ? !service.franchiseConfig.isActive : false)}
                          onChange={(event) => {
                            const checked = event.target.checked
                            updateRow(service.id, (row) => ({
                              ...row,
                              storeOverride: {
                                id: row.storeOverride?.id || `draft-${row.id}`,
                                isActive: checked,
                                price: row.storeOverride?.price ?? row.effectivePrice,
                              },
                            }))
                          }}
                        />
                        {service.isAvailable ? "Enabled" : "Disabled"}
                      </label>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => saveRow(service.id)} disabled={savingId === service.id} style={primaryBtn}>
                          {savingId === service.id ? "Saving..." : "Save"}
                        </button>
                        <button onClick={() => resetRow(service.id)} disabled={savingId === service.id} style={secondaryBtn}>
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
    </StoreAdminLayout>
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
