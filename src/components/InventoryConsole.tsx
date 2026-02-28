"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { InventoryItemType, InventoryMovementType } from "@prisma/client"
import { useToast } from "@/components/ToastProvider"

interface StoreOption {
  id: string
  name: string
  franchiseId: string
  franchise: {
    id: string
    name: string
  }
}

interface InventoryItem {
  id: string
  storeId: string
  name: string
  sku: string | null
  type: InventoryItemType
  unit: string
  currentStock: number
  reorderLevel: number
  costPerUnit: number | null
  isActive: boolean
  updatedAt: string
  store?: {
    id: string
    name: string
    franchise?: {
      id: string
      name: string
    }
  }
}

interface Movement {
  id: string
  inventoryItemId: string
  type: InventoryMovementType
  quantity: number
  stockBefore: number
  stockAfter: number
  note: string | null
  createdAt: string
  inventoryItem: {
    id: string
    name: string
    unit: string
  }
  createdBy?: {
    firstName: string
    lastName: string
  } | null
}

interface SummaryPayload {
  totals: {
    storesInScope: number
    items: number
    lowStock: number
    outOfStock: number
    stockValue: number
  }
}

interface InventoryConsoleProps {
  title: string
  subtitle: string
  fixedStoreId?: string | null
  showStoreSelector?: boolean
}

const ITEM_TYPES = Object.values(InventoryItemType)
const MOVEMENT_TYPES = Object.values(InventoryMovementType)

export default function InventoryConsole({
  title,
  subtitle,
  fixedStoreId,
  showStoreSelector = true,
}: InventoryConsoleProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  const [stores, setStores] = useState<StoreOption[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>(fixedStoreId || "")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<SummaryPayload["totals"]>({
    storesInScope: 0,
    items: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0,
  })

  const [newItem, setNewItem] = useState<{
    name: string
    sku: string
    type: InventoryItemType
    unit: string
    currentStock: string
    reorderLevel: string
    costPerUnit: string
  }>({
    name: "",
    sku: "",
    type: InventoryItemType.CONSUMABLE,
    unit: "UNIT",
    currentStock: "0",
    reorderLevel: "0",
    costPerUnit: "",
  })

  const [newMove, setNewMove] = useState<{
    inventoryItemId: string
    type: InventoryMovementType
    quantity: string
    adjustTo: string
    note: string
  }>({
    inventoryItemId: "",
    type: InventoryMovementType.STOCK_IN,
    quantity: "1",
    adjustTo: "",
    note: "",
  })

  useEffect(() => {
    if (fixedStoreId) {
      setSelectedStoreId(fixedStoreId)
    }
  }, [fixedStoreId])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const queryStore = fixedStoreId || selectedStoreId
        const storeParam = queryStore ? `storeId=${encodeURIComponent(queryStore)}` : ""
        const base = storeParam ? `?${storeParam}` : ""
        const itemQuery = storeParam
          ? `?${storeParam}&search=${encodeURIComponent(search)}&type=${encodeURIComponent(typeFilter)}`
          : `?search=${encodeURIComponent(search)}&type=${encodeURIComponent(typeFilter)}`

        const [itemsResp, movementsResp, summaryResp] = await Promise.all([
          fetch(`/api/inventory/items${itemQuery}`),
          fetch(`/api/inventory/movements${base}`),
          fetch(`/api/inventory/summary${base}`),
        ])

        const itemsPayload = itemsResp.ok ? await itemsResp.json() : { items: [], stores: [] }
        const movementsPayload = movementsResp.ok ? await movementsResp.json() : { movements: [] }
        const summaryPayload = summaryResp.ok ? await summaryResp.json() : { summary: { totals: summary } }

        if (!active) return

        const nextStores: StoreOption[] = Array.isArray(itemsPayload.stores) ? itemsPayload.stores : []
        setStores(nextStores)
        setItems(Array.isArray(itemsPayload.items) ? itemsPayload.items : [])
        setMovements(Array.isArray(movementsPayload.movements) ? movementsPayload.movements : [])
        setSummary(summaryPayload.summary?.totals || summary)

        if (!fixedStoreId && !selectedStoreId && nextStores.length > 0) {
          setSelectedStoreId(nextStores[0].id)
        }
      } catch (error) {
        console.error("inventory load error", error)
        if (active) {
          toast.error("Inventory", "Failed to load inventory data.")
          setItems([])
          setMovements([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [fixedStoreId, selectedStoreId, search, typeFilter, refreshTick, toast])

  const lowStockItems = useMemo(() => {
    return items.filter((item) => Number(item.currentStock) <= Number(item.reorderLevel))
  }, [items])

  async function createItem() {
    if (!newItem.name.trim()) {
      toast.error("Inventory", "Item name is required.")
      return
    }
    const storeId = fixedStoreId || selectedStoreId
    if (!storeId) {
      toast.error("Inventory", "Select a store first.")
      return
    }

    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: newItem.name,
          sku: newItem.sku || null,
          type: newItem.type,
          unit: newItem.unit,
          currentStock: Number(newItem.currentStock || 0),
          reorderLevel: Number(newItem.reorderLevel || 0),
          costPerUnit: newItem.costPerUnit ? Number(newItem.costPerUnit) : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create item")
      }
      toast.success("Inventory", "Item created successfully.")
      setNewItem({
        name: "",
        sku: "",
        type: InventoryItemType.CONSUMABLE,
        unit: "UNIT",
        currentStock: "0",
        reorderLevel: "0",
        costPerUnit: "",
      })
      setRefreshTick((value) => value + 1)
    } catch (error) {
      toast.error("Inventory", error instanceof Error ? error.message : "Failed to create item.")
    }
  }

  async function createMovement() {
    if (!newMove.inventoryItemId) {
      toast.error("Inventory", "Select an inventory item.")
      return
    }

    try {
      const response = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: newMove.inventoryItemId,
          type: newMove.type,
          quantity: Number(newMove.quantity || 0),
          adjustTo: newMove.adjustTo ? Number(newMove.adjustTo) : null,
          note: newMove.note || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to post movement")
      }
      toast.success("Inventory", "Stock updated successfully.")
      setNewMove({
        inventoryItemId: "",
        type: InventoryMovementType.STOCK_IN,
        quantity: "1",
        adjustTo: "",
        note: "",
      })
      setRefreshTick((value) => value + 1)
    } catch (error) {
      toast.error("Inventory", error instanceof Error ? error.message : "Failed to update stock.")
    }
  }

  async function toggleItem(item: InventoryItem) {
    try {
      const response = await fetch(`/api/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update item status")
      }
      setRefreshTick((value) => value + 1)
    } catch (error) {
      toast.error("Inventory", error instanceof Error ? error.message : "Failed to update status.")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "1300px" }}>
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>{title}</h1>
        <p style={{ color: "#6b7280" }}>{subtitle}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.7rem" }}>
        <StatCard label="Stores in Scope" value={String(summary.storesInScope)} />
        <StatCard label="Total Items" value={String(summary.items)} />
        <StatCard label="Low Stock Items" value={String(summary.lowStock)} />
        <StatCard label="Out of Stock" value={String(summary.outOfStock)} />
        <StatCard label="Total Stock Value" value={`INR ${Math.round(summary.stockValue).toLocaleString()}`} />
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "0.8rem",
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: "0.6rem",
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search item by name or SKU"
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 0.75rem", width: "100%" }}
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 0.75rem" }}
        >
          <option value="all">All Types</option>
          {ITEM_TYPES.map((itemType) => (
            <option key={itemType} value={itemType}>
              {itemType}
            </option>
          ))}
        </select>
        {showStoreSelector && !fixedStoreId ? (
          <select
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 0.75rem", minWidth: "240px" }}
          >
            <option value="">All Accessible Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.franchise.name})
              </option>
            ))}
          </select>
        ) : (
          <div style={{ color: "#475569", fontSize: "0.86rem", minWidth: "240px" }}>
            {stores.find((store) => store.id === (fixedStoreId || selectedStoreId))?.name || "Current Store"}
          </div>
        )}
        <button
          onClick={() => setRefreshTick((value) => value + 1)}
          style={{ border: "1px solid #d1d5db", background: "white", borderRadius: "8px", padding: "0.6rem 0.8rem", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <section style={cardStyle}>
          <h3 style={sectionTitle}>Add Inventory Item</h3>
          <div style={formGridStyle}>
            <input
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Item name"
              style={inputStyle}
            />
            <input
              value={newItem.sku}
              onChange={(event) => setNewItem((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="SKU (optional)"
              style={inputStyle}
            />
            <select
              value={newItem.type}
              onChange={(event) => setNewItem((prev) => ({ ...prev, type: event.target.value as InventoryItemType }))}
              style={inputStyle}
            >
              {ITEM_TYPES.map((itemType) => (
                <option key={itemType} value={itemType}>
                  {itemType}
                </option>
              ))}
            </select>
            <input
              value={newItem.unit}
              onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value.toUpperCase() }))}
              placeholder="Unit (KG/LTR/PCS)"
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newItem.currentStock}
              onChange={(event) => setNewItem((prev) => ({ ...prev, currentStock: event.target.value }))}
              placeholder="Current stock"
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newItem.reorderLevel}
              onChange={(event) => setNewItem((prev) => ({ ...prev, reorderLevel: event.target.value }))}
              placeholder="Reorder level"
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={newItem.costPerUnit}
              onChange={(event) => setNewItem((prev) => ({ ...prev, costPerUnit: event.target.value }))}
              placeholder="Cost per unit (optional)"
              style={inputStyle}
            />
          </div>
          <button onClick={createItem} style={primaryBtnStyle}>
            Create Item
          </button>
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitle}>Stock Movement</h3>
          <div style={formGridStyle}>
            <select
              value={newMove.inventoryItemId}
              onChange={(event) => setNewMove((prev) => ({ ...prev, inventoryItemId: event.target.value }))}
              style={inputStyle}
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.currentStock} {item.unit})
                </option>
              ))}
            </select>
            <select
              value={newMove.type}
              onChange={(event) => setNewMove((prev) => ({ ...prev, type: event.target.value as InventoryMovementType }))}
              style={inputStyle}
            >
              {MOVEMENT_TYPES.map((movementType) => (
                <option key={movementType} value={movementType}>
                  {movementType}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={newMove.quantity}
              onChange={(event) => setNewMove((prev) => ({ ...prev, quantity: event.target.value }))}
              placeholder="Quantity"
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              value={newMove.adjustTo}
              onChange={(event) => setNewMove((prev) => ({ ...prev, adjustTo: event.target.value }))}
              placeholder="Adjust to (for ADJUSTMENT)"
              style={inputStyle}
            />
            <input
              value={newMove.note}
              onChange={(event) => setNewMove((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Note"
              style={inputStyle}
            />
          </div>
          <button onClick={createMovement} style={primaryBtnStyle}>
            Apply Movement
          </button>
        </section>
      </div>

      <section style={cardStyle}>
        <h3 style={sectionTitle}>Inventory Items</h3>
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading items...</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#64748b" }}>No inventory items found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Store</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Reorder</th>
                  <th style={thStyle}>Cost</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = Number(item.currentStock) <= Number(item.reorderLevel)
                  return (
                    <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{item.sku || "No SKU"}</div>
                      </td>
                      <td style={tdStyle}>{item.store?.name || "-"}</td>
                      <td style={tdStyle}>{item.type}</td>
                      <td style={tdStyle}>
                        <span style={{ color: low ? "#b91c1c" : "#0f172a", fontWeight: low ? 700 : 500 }}>
                          {Number(item.currentStock).toLocaleString()} {item.unit}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {Number(item.reorderLevel).toLocaleString()} {item.unit}
                      </td>
                      <td style={tdStyle}>{item.costPerUnit ? `INR ${Number(item.costPerUnit).toLocaleString()}` : "-"}</td>
                      <td style={tdStyle}>{item.isActive ? "Active" : "Inactive"}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => toggleItem(item)}
                          style={{ border: "none", background: "transparent", color: "#2563eb", cursor: "pointer" }}
                        >
                          {item.isActive ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <section style={cardStyle}>
          <h3 style={sectionTitle}>Low Stock Alerts</h3>
          {lowStockItems.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>No low stock alerts.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1rem", color: "#334155" }}>
              {lowStockItems.slice(0, 12).map((item) => (
                <li key={item.id} style={{ marginBottom: "0.3rem" }}>
                  {item.name}: {Number(item.currentStock).toLocaleString()} {item.unit} (reorder at {Number(item.reorderLevel).toLocaleString()})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitle}>Recent Movements</h3>
          {movements.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>No stock movements yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {movements.slice(0, 10).map((move) => (
                <div key={move.id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.55rem 0.65rem" }}>
                  <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.88rem" }}>
                    {move.inventoryItem.name} - {move.type}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    Qty {Number(move.quantity).toLocaleString()} {move.inventoryItem.unit} | {new Date(move.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.75rem" }}>
      <div style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "0.2rem" }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "1.05rem" }}>{value}</div>
    </div>
  )
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "0.9rem",
}

const sectionTitle: CSSProperties = {
  marginTop: 0,
  marginBottom: "0.65rem",
  color: "#111827",
}

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.55rem",
  marginBottom: "0.65rem",
}

const inputStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "0.5rem 0.65rem",
}

const primaryBtnStyle: CSSProperties = {
  border: "none",
  background: "#2563eb",
  color: "white",
  borderRadius: "8px",
  padding: "0.55rem 0.85rem",
  cursor: "pointer",
  fontWeight: 600,
}

const thStyle: CSSProperties = {
  padding: "0.65rem",
  fontSize: "0.78rem",
  color: "#475569",
  fontWeight: 700,
}

const tdStyle: CSSProperties = {
  padding: "0.65rem",
  fontSize: "0.88rem",
  color: "#0f172a",
}
