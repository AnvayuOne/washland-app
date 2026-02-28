"use client"

import { CSSProperties, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import CustomerDashboardLayout from "@/components/CustomerDashboardLayout"

type CartService = {
  id: string
  name: string
  description: string | null
  category: string
}

type CartItem = {
  id: string
  serviceId: string
  quantity: number
  unitPrice: number
  lineTotal: number
  service: CartService
}

type Cart = {
  id: string
  storeId: string | null
  currency: string
  subtotal: number
  items: CartItem[]
}

type Store = {
  id: string
  name: string
  city?: string
  state?: string
}

type Address = {
  id: string
  title: string
  street: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

export default function CustomerCartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingStore, setSavingStore] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || "")
    setUserName(localStorage.getItem("userName") || "Customer")
    void loadData()
  }, [])

  const cartHasItems = (cart?.items.length || 0) > 0
  const canContinue = cartHasItems && Boolean(cart?.storeId) && Boolean(selectedAddressId)

  const currencySymbol = useMemo(() => (cart?.currency === "INR" ? "Rs" : cart?.currency || ""), [cart?.currency])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = localStorage.getItem("userId") || ""
      const userEmail = localStorage.getItem("userEmail") || ""
      const userRole = localStorage.getItem("userRole") || ""

      const [cartRes, storesRes, addressesRes] = await Promise.all([
        fetch("/api/customer/cart"),
        fetch("/api/public/stores"),
        fetch("/api/customer/addresses", {
          headers: {
          },
        }),
      ])

      if (cartRes.status === 401) {
        setError("Please sign in again to access your cart.")
        return
      }

      const cartData = await cartRes.json()
      if (!cartRes.ok) {
        setError(cartData.error || "Failed to load cart")
        return
      }

      const storesData = storesRes.ok ? await storesRes.json() : []
      const addressesData = addressesRes.ok ? await addressesRes.json() : { addresses: [] }
      const nextCart = cartData.cart as Cart | null
      setCart(nextCart)
      setSelectedStoreId(nextCart?.storeId || "")
      setStores(Array.isArray(storesData) ? storesData : [])
      const parsedAddresses = Array.isArray(addressesData?.addresses) ? addressesData.addresses : []
      setAddresses(parsedAddresses)

      const defaultAddress = parsedAddresses.find((address: Address) => address.isDefault)
      setSelectedAddressId(defaultAddress?.id || parsedAddresses[0]?.id || "")
    } catch (fetchError) {
      console.error("Error loading cart page data:", fetchError)
      setError("Failed to load cart")
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return

    const response = await fetch(`/api/customer/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    })

    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Failed to update quantity")
      return
    }

    setCart(data.cart)
  }

  const removeItem = async (itemId: string) => {
    const response = await fetch(`/api/customer/cart/items/${itemId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Failed to remove item")
      return
    }

    setCart(data.cart)
  }

  const saveStoreSelection = async () => {
    if (!selectedStoreId) return
    setSavingStore(true)
    setError(null)

    try {
      const response = await fetch("/api/customer/cart/select-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: selectedStoreId }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to select store")
        return
      }

      setCart(data.cart)
    } catch (saveError) {
      console.error("Error saving cart store:", saveError)
      setError("Failed to select store")
    } finally {
      setSavingStore(false)
    }
  }

  const getCheckoutStorageKey = () => (cart?.id ? `checkout_idempotency_${cart.id}` : "")

  const getOrCreateIdempotencyKey = () => {
    const storageKey = getCheckoutStorageKey()
    if (!storageKey) return ""

    const existing = localStorage.getItem(storageKey)
    if (existing) return existing

    const generated = crypto.randomUUID()
    localStorage.setItem(storageKey, generated)
    return generated
  }

  const handleCheckout = async () => {
    if (!cart || !selectedAddressId) {
      setError("Please select an address before checkout")
      return
    }

    setCheckingOut(true)
    setError(null)

    try {
      const idempotencyKey = getOrCreateIdempotencyKey()
      const response = await fetch("/api/customer/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey,
          addressId: selectedAddressId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in again to checkout.")
          return
        }
        setError(data.error || "Checkout failed")
        return
      }

      const storageKey = getCheckoutStorageKey()
      if (storageKey) {
        localStorage.removeItem(storageKey)
      }

      window.location.href = "/customer/orders/current"
    } catch (checkoutError) {
      console.error("Checkout error:", checkoutError)
      setError("Checkout failed")
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <CustomerDashboardLayout currentPage="cart" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", margin: 0 }}>My Cart</h1>
          <Link href="/book-service" style={{ color: "#1e40af", textDecoration: "none", fontWeight: 600 }}>
            Add More Services
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", backgroundColor: "#fef2f2", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading cart...</div>
        ) : !cartHasItems ? (
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "2rem", textAlign: "center" }}>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>Your cart is empty.</p>
            <Link href="/book-service" style={{ color: "white", backgroundColor: "#2563eb", textDecoration: "none", padding: "0.6rem 1rem", borderRadius: "0.5rem", fontWeight: 600 }}>
              Browse Services
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1rem" }}>
              {cart?.items.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "1rem", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{item.service.name}</div>
                    <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>{item.service.description || item.service.category}</div>
                    <div style={{ color: "#374151", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                      {currencySymbol} {item.unitPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} style={qtyButtonStyle}>-</button>
                    <span style={{ minWidth: "1.5rem", textAlign: "center", fontWeight: 600 }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={qtyButtonStyle}>+</button>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{currencySymbol} {item.lineTotal.toFixed(2)}</div>
                    <button onClick={() => removeItem(item.id)} style={{ marginTop: "0.35rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1rem" }}>
              <div style={{ marginBottom: "0.75rem", fontWeight: 600, color: "#111827" }}>Select Store</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  style={{ flex: 1, padding: "0.55rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
                >
                  <option value="">Choose a store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.city ? `(${store.city}${store.state ? `, ${store.state}` : ""})` : ""}
                    </option>
                  ))}
                </select>
                <button onClick={saveStoreSelection} disabled={!selectedStoreId || savingStore} style={{ padding: "0.55rem 0.85rem", border: "none", borderRadius: "0.5rem", backgroundColor: savingStore ? "#93c5fd" : "#2563eb", color: "white", fontWeight: 600, cursor: savingStore ? "not-allowed" : "pointer" }}>
                  {savingStore ? "Saving..." : "Save Store"}
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1rem" }}>
              <div style={{ marginBottom: "0.75rem", fontWeight: 600, color: "#111827" }}>Delivery Address</div>
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
              >
                <option value="">Choose an address</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.title}: {address.street}, {address.city}, {address.state} {address.zipCode}
                  </option>
                ))}
              </select>
              {addresses.length === 0 && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.9rem", color: "#6b7280" }}>
                  No saved addresses found. Add one in{" "}
                  <Link href="/customer/addresses" style={{ color: "#1e40af", textDecoration: "none" }}>
                    My Addresses
                  </Link>
                  .
                </div>
              )}
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
                Subtotal: {currencySymbol} {(cart?.subtotal || 0).toFixed(2)}
              </div>
              <button
                disabled={!canContinue}
                onClick={handleCheckout}
                style={{
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.65rem 1rem",
                  fontWeight: 700,
                  backgroundColor: canContinue && !checkingOut ? "#059669" : "#9ca3af",
                  color: "white",
                  cursor: canContinue && !checkingOut ? "pointer" : "not-allowed",
                }}
              >
                {checkingOut ? "Processing..." : "Continue to Checkout"}
              </button>
            </div>
          </div>
        )}
      </div>
    </CustomerDashboardLayout>
  )
}

const qtyButtonStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  backgroundColor: "white",
  borderRadius: "0.4rem",
  width: "1.8rem",
  height: "1.8rem",
  cursor: "pointer",
}
