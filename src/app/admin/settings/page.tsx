"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"

interface StoreSessionPrefs {
  emailAlerts: boolean
  riderPushAlerts: boolean
  autoRefreshSeconds: number
}

const PREFS_KEY = "storeAdmin:settings"
const DEFAULT_PREFS: StoreSessionPrefs = {
  emailAlerts: true,
  riderPushAlerts: true,
  autoRefreshSeconds: 30,
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const toast = useToast()

  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<StoreSessionPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    const storeId = localStorage.getItem("storeId")
    const email = localStorage.getItem("userEmail")

    if (role !== "STORE_ADMIN" && role !== "store-admin") {
      router.push("/admin/login")
      return
    }

    if (!storeId) {
      toast.error("Error", "No store selected. Please login again.")
      router.push("/admin/login")
      return
    }

    setUserRole(role)
    setUserEmail(email || "")

    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        setPrefs({
          emailAlerts: Boolean(parsed.emailAlerts),
          riderPushAlerts: Boolean(parsed.riderPushAlerts),
          autoRefreshSeconds: Number(parsed.autoRefreshSeconds) || DEFAULT_PREFS.autoRefreshSeconds,
        })
      } catch {
        setPrefs(DEFAULT_PREFS)
      }
    }

    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) setUserName(e.detail.name)
      if (e.detail?.storeName) setStoreName(e.detail.storeName)
    }

    window.addEventListener("auth:session", handleAuthUpdate as EventListener)
    setLoading(false)
    return () => {
      window.removeEventListener("auth:session", handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  function updatePrefs(partial: Partial<StoreSessionPrefs>) {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  }

  async function handleFullSignOut() {
    localStorage.removeItem("userRole")
    localStorage.removeItem("storeId")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    window.dispatchEvent(new CustomEvent("auth:session", { detail: null }))
    await signOut({ redirect: false })
    router.push("/")
  }

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName || "Store Admin"}
      userEmail={userEmail}
      storeName={storeName}
      onSignOut={handleFullSignOut}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "900px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>Settings</h1>
          <p style={{ color: "#6b7280" }}>Store admin session and notification preferences.</p>
        </div>

        {loading ? (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem", color: "#64748b" }}>
            Loading settings...
          </div>
        ) : (
          <>
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Account</h3>
              <div style={rowStyle}>
                <span style={labelStyle}>Role</span>
                <strong>{userRole || "STORE_ADMIN"}</strong>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Name</span>
                <strong>{userName || "Store Admin"}</strong>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Email</span>
                <strong>{userEmail || "N/A"}</strong>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Store</span>
                <strong>{storeName || "Current Store"}</strong>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Preferences</h3>
              <label style={switchRowStyle}>
                <input
                  type="checkbox"
                  checked={prefs.emailAlerts}
                  onChange={(event) => updatePrefs({ emailAlerts: event.target.checked })}
                />
                Email alerts for order updates
              </label>
              <label style={switchRowStyle}>
                <input
                  type="checkbox"
                  checked={prefs.riderPushAlerts}
                  onChange={(event) => updatePrefs({ riderPushAlerts: event.target.checked })}
                />
                Rider update notifications
              </label>
              <div style={{ marginTop: "0.6rem" }}>
                <label style={{ ...labelStyle, display: "block", marginBottom: "0.4rem" }}>Auto-refresh (seconds)</label>
                <select
                  value={prefs.autoRefreshSeconds}
                  onChange={(event) => updatePrefs({ autoRefreshSeconds: Number(event.target.value) })}
                  style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.5rem 0.65rem", minWidth: "180px" }}
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </div>
            </section>

            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Session</h3>
              <p style={{ color: "#64748b", fontSize: "0.92rem", marginTop: 0 }}>
                This signs out both local session state and NextAuth session cookie.
              </p>
              <button
                onClick={handleFullSignOut}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.6rem 0.85rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Sign Out From This Device
              </button>
            </section>
          </>
        )}
      </div>
    </StoreAdminLayout>
  )
}

const sectionStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "1rem",
}

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "0.7rem",
  color: "#0f172a",
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: "1px solid #f1f5f9",
  padding: "0.55rem 0",
}

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "0.88rem",
}

const switchRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "#334155",
  fontSize: "0.92rem",
  marginBottom: "0.35rem",
}
