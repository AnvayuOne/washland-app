"use client"

import { useEffect, useState, type ReactNode } from "react"

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  role: "STORE_ADMIN" | "RIDER"
  isActive: boolean
  isAvailable: boolean
  managedStores: Array<{
    id: string
    name: string
  }>
}

interface StoreOption {
  id: string
  name: string
}

export default function FranchiseStaffPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingUserId, setSavingUserId] = useState("")
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])

  useEffect(() => {
    void Promise.all([loadStaff(), loadStores()])
  }, [])

  async function loadStaff() {
    try {
      setLoading(true)
      setError("")
      const response = await fetch("/api/franchise/staff")
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load staff")
      }
      setStaff(payload.staff || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }

  async function loadStores() {
    const response = await fetch("/api/franchise/stores")
    const payload = await response.json()
    if (response.ok && payload.success) {
      setStores((payload.stores || []).map((store: any) => ({ id: store.id, name: store.name })))
    }
  }

  async function updateStaff(userId: string, payload: { isActive?: boolean; storeId?: string }) {
    try {
      setSavingUserId(userId)
      const response = await fetch("/api/franchise/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, ...payload }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update staff")
      }
      setStaff((prev) => prev.map((item) => (item.id === userId ? result.staff : item)))
      setError("")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update staff")
    } finally {
      setSavingUserId("")
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1200px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "1.6rem" }}>Franchise Staff</h1>
        <p style={{ marginTop: "0.35rem", color: "#64748b" }}>Manage store admins and riders scoped to your franchise operations.</p>
      </div>

      {loading ? <div style={{ color: "#64748b" }}>Loading staff...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading ? (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Store Assignment</Th>
                <Th>Availability</Th>
              </tr>
            </thead>
            <tbody>
              {staff.length < 1 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", color: "#64748b" }}>
                    No staff found under your franchise scope.
                  </td>
                </tr>
              ) : (
                staff.map((member) => {
                  const assignedStoreId = member.managedStores[0]?.id || ""
                  const isSaving = savingUserId === member.id
                  return (
                    <tr key={member.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <Td>{member.firstName} {member.lastName}</Td>
                      <Td>{member.email}</Td>
                      <Td>{member.role}</Td>
                      <Td>
                        <button
                          disabled={isSaving}
                          onClick={() => void updateStaff(member.id, { isActive: !member.isActive })}
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "999px",
                            padding: "0.25rem 0.65rem",
                            background: member.isActive ? "#ecfdf5" : "#fef2f2",
                            color: member.isActive ? "#065f46" : "#991b1b",
                            cursor: isSaving ? "not-allowed" : "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </button>
                      </Td>
                      <Td>
                        {member.role === "STORE_ADMIN" ? (
                          <select
                            value={assignedStoreId}
                            disabled={isSaving}
                            onChange={(event) => {
                              const value = event.target.value
                              if (!value) return
                              void updateStaff(member.id, { storeId: value })
                            }}
                            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.45rem", background: "white" }}
                          >
                            <option value="">Assign store</option>
                            {stores.map((store) => (
                              <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Not applicable</span>
                        )}
                      </Td>
                      <Td>{member.role === "RIDER" ? (member.isAvailable ? "Available" : "Unavailable") : "-"}</Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.65rem", fontSize: "0.75rem", color: "#64748b" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.65rem", fontSize: "0.88rem", color: "#0f172a" }}>{children}</td>
}
