"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"

interface StoreOption {
  id: string
  name: string
}

interface OrderRow {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  totalItems: number
  createdAt: string
  store: {
    id: string
    name: string
  }
  customer: {
    fullName: string
    email?: string
    phone?: string
  } | null
}

const ORDER_STATUS_OPTIONS = [
  "PAYMENT_PENDING",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]

export default function FranchiseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])

  const [status, setStatus] = useState("")
  const [storeId, setStoreId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    void Promise.all([loadStores(), loadOrders()])
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (storeId) params.set("storeId", storeId)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    const query = params.toString()
    return query ? `?${query}` : ""
  }, [status, storeId, dateFrom, dateTo])

  async function loadStores() {
    const response = await fetch("/api/franchise/stores")
    const payload = await response.json()
    if (response.ok && payload.success) {
      setStores((payload.stores || []).map((store: any) => ({ id: store.id, name: store.name })))
    }
  }

  async function loadOrders() {
    try {
      setLoading(true)
      setError("")
      const response = await fetch(`/api/franchise/orders${queryString}`)
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load orders")
      }
      setOrders(payload.orders || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "1250px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "1.6rem" }}>Franchise Orders</h1>
        <p style={{ marginTop: "0.35rem", color: "#64748b" }}>Scoped order visibility for your franchise stores.</p>
      </div>

      <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.9rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "0.65rem" }}>
          <FilterSelect label="Status" value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            {ORDER_STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Store" value={storeId} onChange={setStoreId}>
            <option value="">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </FilterSelect>

          <FilterInput label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
          <FilterInput label="Date To" type="date" value={dateTo} onChange={setDateTo} />

          <div style={{ display: "flex", alignItems: "end", gap: "0.45rem" }}>
            <button
              onClick={() => void loadOrders()}
              style={{ padding: "0.52rem 0.8rem", borderRadius: "8px", border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" }}
            >
              Apply
            </button>
            <button
              onClick={() => {
                setStatus("")
                setStoreId("")
                setDateFrom("")
                setDateTo("")
                setTimeout(() => void loadOrders(), 0)
              }}
              style={{ padding: "0.52rem 0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {loading ? <div style={{ color: "#64748b" }}>Loading orders...</div> : null}
      {error ? <div style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: "10px", padding: "0.75rem" }}>{error}</div> : null}

      {!loading && !error ? (
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Store</Th>
                <Th>Status</Th>
                <Th>Items</Th>
                <Th>Total</Th>
                <Th>Date</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "1rem", color: "#64748b" }}>No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <Td>#{order.orderNumber}</Td>
                    <Td>{order.customer?.fullName || "Guest"}</Td>
                    <Td>{order.store.name}</Td>
                    <Td>{order.status}</Td>
                    <Td>{order.totalItems}</Td>
                    <Td>INR {order.totalAmount.toLocaleString("en-IN")}</Td>
                    <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      <Link href={`/franchise/orders/${order.id}`} style={{ color: "#1d4ed8", textDecoration: "none", fontSize: "0.84rem" }}>
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

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.8rem", color: "#475569" }}>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.5rem", background: "white" }}>
        {children}
      </select>
    </label>
  )
}

function FilterInput({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: string }) {
  return (
    <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.8rem", color: "#475569" }}>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.5rem", background: "white" }} />
    </label>
  )
}

function Th({ children }: { children?: ReactNode }) {
  return <th style={{ textAlign: "left", padding: "0.65rem", fontSize: "0.75rem", color: "#64748b" }}>{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: "0.65rem", fontSize: "0.88rem", color: "#0f172a" }}>{children}</td>
}
