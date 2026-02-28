"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import StoreAdminLayout from "@/components/StoreAdminLayout"
import { useToast } from "@/components/ToastProvider"

interface CustomerAddress {
  id: string
  title: string
  street: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

interface CustomerRecord {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  addresses: CustomerAddress[]
}

interface OrderRecord {
  id: string
  totalAmount: number
  user?: {
    id: string
  } | null
}

interface CustomerMetrics {
  orderCount: number
  spend: number
}

export default function AdminCustomersPage() {
  const router = useRouter()
  const toast = useToast()

  const [userRole, setUserRole] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeId, setStoreId] = useState("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [metricsByCustomerId, setMetricsByCustomerId] = useState<Record<string, CustomerMetrics>>({})

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
    const loadData = async () => {
      setLoading(true)
      try {
        const [customersResp, ordersResp] = await Promise.all([
          fetch("/api/admin/orders?lookup=customers"),
          fetch(`/api/admin/orders?storeId=${encodeURIComponent(storeId)}&limit=500`),
        ])

        const customersPayload = customersResp.ok ? await customersResp.json() : { customers: [] }
        const ordersPayload = ordersResp.ok ? await ordersResp.json() : { orders: [] }
        if (!active) return

        const nextCustomers: CustomerRecord[] = Array.isArray(customersPayload.customers)
          ? customersPayload.customers
          : []
        const orders: OrderRecord[] = Array.isArray(ordersPayload.orders) ? ordersPayload.orders : []

        const nextMetrics: Record<string, CustomerMetrics> = {}
        for (const order of orders) {
          const customerId = order.user?.id
          if (!customerId) continue
          if (!nextMetrics[customerId]) {
            nextMetrics[customerId] = { orderCount: 0, spend: 0 }
          }
          nextMetrics[customerId].orderCount += 1
          nextMetrics[customerId].spend += Number(order.totalAmount || 0)
        }

        setCustomers(nextCustomers)
        setMetricsByCustomerId(nextMetrics)
      } catch (error) {
        console.error("Failed to load customers:", error)
        if (active) {
          toast.error("Customers", "Failed to load customer records.")
          setCustomers([])
          setMetricsByCustomerId({})
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [storeId, toast])

  const visibleCustomers = useMemo(() => {
    if (!search.trim()) return customers
    const query = search.toLowerCase()
    return customers.filter((customer) => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase()
      return (
        fullName.includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        (customer.phone || "").toLowerCase().includes(query)
      )
    })
  }, [customers, search])

  function defaultAddress(customer: CustomerRecord) {
    return customer.addresses.find((address) => address.isDefault) || customer.addresses[0] || null
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
      storeName={storeName}
      onSignOut={handleSignOut}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "1200px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>Customers</h1>
          <p style={{ color: "#6b7280" }}>Customer records for your store and their order history summary.</p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.75rem",
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or phone"
            style={{
              width: "100%",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0.6rem 0.75rem",
            }}
          />
          <div style={{ color: "#64748b", fontSize: "0.86rem", whiteSpace: "nowrap" }}>
            {visibleCustomers.length} customer{visibleCustomers.length === 1 ? "" : "s"}
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "1rem", color: "#6b7280" }}>Loading customers...</div>
          ) : visibleCustomers.length === 0 ? (
            <div style={{ padding: "1rem", color: "#6b7280" }}>No customer records found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Contact</th>
                    <th style={thStyle}>Default Address</th>
                    <th style={thStyle}>Orders</th>
                    <th style={thStyle}>Lifetime Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.map((customer) => {
                    const metrics = metricsByCustomerId[customer.id] || { orderCount: 0, spend: 0 }
                    const address = defaultAddress(customer)
                    return (
                      <tr key={customer.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>ID: {customer.id.slice(-8)}</div>
                        </td>
                        <td style={tdStyle}>
                          <div>{customer.email}</div>
                          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{customer.phone || "N/A"}</div>
                        </td>
                        <td style={tdStyle}>
                          {address ? (
                            <div style={{ color: "#334155", fontSize: "0.86rem" }}>
                              {address.street}, {address.city}, {address.state} {address.zipCode}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>No address</span>
                          )}
                        </td>
                        <td style={tdStyle}>{metrics.orderCount}</td>
                        <td style={tdStyle}>INR {metrics.spend.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StoreAdminLayout>
  )
}

const thStyle: CSSProperties = {
  padding: "0.75rem",
  fontSize: "0.78rem",
  color: "#475569",
  fontWeight: 700,
}

const tdStyle: CSSProperties = {
  padding: "0.75rem",
  fontSize: "0.9rem",
  color: "#0f172a",
  verticalAlign: "top",
}
