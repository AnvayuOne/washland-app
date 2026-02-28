"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type JobStatus = "CONFIRMED" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "DELIVERED" | "COMPLETED"

interface RiderJob {
  id: string
  orderNumber: string
  status: JobStatus
  riderStatus: string
  scheduledPickupAt?: string | null
  pickupAddressSummary?: string | null
  store: {
    id: string
    name: string
    phone?: string | null
    city?: string | null
    state?: string | null
  }
  itemsCount: number
  updatedAt: string
}

type TabKey = "pending" | "inProgress" | "completed"

const TAB_LABELS: Record<TabKey, string> = {
  pending: "Pending Pickup",
  inProgress: "In Progress",
  completed: "Completed",
}

export default function RiderDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [jobs, setJobs] = useState<RiderJob[]>([])
  const [loading, setLoading] = useState(true)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("pending")
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push("/rider/login")
      return
    }

    if (session.user.role !== "RIDER") {
      router.push("/")
      return
    }

    void Promise.all([fetchJobs(), fetchAvailability()])

    const interval = setInterval(() => {
      void fetchJobs(false)
    }, 15000)

    return () => clearInterval(interval)
  }, [router, session, status])

  async function fetchJobs(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true)
      }
      setError("")

      const response = await fetch("/api/rider/jobs")
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load rider jobs")
      }

      setJobs(Array.isArray(payload.jobs) ? payload.jobs : [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load rider jobs")
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  async function fetchAvailability() {
    try {
      const response = await fetch("/api/rider/availability")
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load availability")
      }
      setIsAvailable(Boolean(payload.isAvailable))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load availability")
    }
  }

  async function toggleAvailability(nextValue: boolean) {
    try {
      setAvailabilityLoading(true)
      setError("")

      const response = await fetch("/api/rider/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAvailable: nextValue }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update availability")
      }
      setIsAvailable(Boolean(payload.isAvailable))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update availability")
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const groupedJobs = useMemo(() => {
    const pending = jobs.filter((job) => job.status === "CONFIRMED")
    const inProgress = jobs.filter((job) => job.status === "IN_PROGRESS" || job.status === "READY_FOR_PICKUP")
    const completed = jobs.filter((job) => job.status === "DELIVERED" || job.status === "COMPLETED")

    return { pending, inProgress, completed }
  }, [jobs])

  const visibleJobs = groupedJobs[activeTab]

  return (
    <div style={{ maxWidth: 1100, margin: "2rem auto", padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827" }}>My Jobs</h1>
          <p style={{ marginTop: "0.35rem", color: "#64748b" }}>Assigned pickup and delivery jobs</p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "white",
            border: "1px solid #cbd5e1",
            borderRadius: 999,
            padding: "0.4rem 0.75rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
            {isAvailable ? "Available" : "Unavailable"}
          </span>
          <input
            type="checkbox"
            checked={isAvailable}
            disabled={availabilityLoading}
            onChange={(event) => void toggleAvailability(event.target.checked)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => void fetchJobs()}
            style={{
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#0f172a",
              borderRadius: 8,
              padding: "0.5rem 0.9rem",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              border: "none",
              background: "#1d4ed8",
              color: "white",
              borderRadius: 8,
              padding: "0.5rem 0.9rem",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              border: activeTab === tab ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
              background: activeTab === tab ? "#dbeafe" : "white",
              color: activeTab === tab ? "#1e3a8a" : "#334155",
              borderRadius: 999,
              padding: "0.45rem 0.9rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {TAB_LABELS[tab]} ({groupedJobs[tab].length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading jobs...</div>
      ) : error ? (
        <div style={{ padding: "1rem", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>{error}</div>
      ) : visibleJobs.length === 0 ? (
        <div style={{ padding: "2rem", border: "1px dashed #cbd5e1", borderRadius: 12, textAlign: "center", color: "#64748b" }}>
          No jobs in this tab.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.8rem" }}>
          {visibleJobs.map((job) => (
            <article key={job.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>#{job.orderNumber}</div>
                  <div style={{ fontSize: "0.9rem", color: "#475569", marginTop: "0.2rem" }}>{job.pickupAddressSummary || "Address not available"}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.35rem" }}>
                    Store: {job.store.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Items: {job.itemsCount}
                  </div>
                  {job.scheduledPickupAt ? (
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Scheduled: {new Date(job.scheduledPickupAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: "0.5rem", justifyItems: "end" }}>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "0.25rem 0.7rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "#e2e8f0",
                      color: "#334155",
                    }}
                  >
                    {job.riderStatus.replace(/_/g, " ")}
                  </span>

                  <Link
                    href={`/rider/jobs/${job.id}`}
                    style={{
                      textDecoration: "none",
                      background: "#2563eb",
                      color: "white",
                      borderRadius: 8,
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    Open
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
