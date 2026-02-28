"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface CatalogService {
  id: string
  name: string
  description?: string
  category?: string
  price?: string
  basePrice?: number
  effectivePrice?: number
}

export default function BookServicePage() {
  const router = useRouter()
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [addingItemByService, setAddingItemByService] = useState<Record<string, boolean>>({})
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<{name?: string, email?: string}>({})
  const [services, setServices] = useState<CatalogService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [serviceSearch, setServiceSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [priceFilter, setPriceFilter] = useState<"all" | "under-100" | "under-250" | "under-500" | "above-500">("all")
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "name-asc">("relevance")
  const [showAllServices, setShowAllServices] = useState(false)
  const [formData, setFormData] = useState({
    pickupAddress: "",
    pickupDate: "",
    pickupTime: "",
    deliveryAddress: "",
    specialInstructions: ""
  })

  useEffect(() => {
    // Check if user is logged in
    const userRole = localStorage.getItem('userRole')
    const userId = localStorage.getItem('userId')
    const userEmail = localStorage.getItem('userEmail')
    const userName = localStorage.getItem('userName')
    const savedSelection = localStorage.getItem('bookService:selectedServices')

    if (savedSelection) {
      try {
        const parsed = JSON.parse(savedSelection)
        if (Array.isArray(parsed)) {
          setSelectedServices(parsed)
        }
      } catch (error) {
        console.error('Failed to parse saved service selection', error)
      }
    }

    if (userRole && userId) {
      setIsLoggedIn(true)
      setUserInfo({
        name: userName || 'Customer',
        email: userEmail || ''
      })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('bookService:selectedServices', JSON.stringify(selectedServices))
  }, [selectedServices])

  useEffect(() => {
    // Fetch services from API
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services')
        if (!response.ok) {
          throw new Error('Failed to fetch services')
        }
        const data = await response.json()
        setServices(data)
      } catch (err: any) {
        console.error('Error fetching services:', err)
        setServicesError(err.message || 'Failed to load services')
        // Fallback to default services if API fails
        setServices([
          { id: "dry-cleaning", name: "Dry Cleaning", price: "From ₹600", description: "Professional dry cleaning for delicate fabrics" },
          { id: "laundry", name: "Laundry Service", price: "From ₹44/kg", description: "Wash, dry, and fold service" },
          { id: "alterations", name: "Alterations", price: "From ₹1200", description: "Expert tailoring and alterations" },
          { id: "shoe-cleaning", name: "Shoe Cleaning", price: "From ₹600", description: "Professional shoe cleaning and care" },
          { id: "comforter", name: "Comforter Cleaning", price: "From ₹1,800", description: "Deep cleaning for bedding" },
          { id: "wedding-dress", name: "Wedding Dress Care", price: "From ₹10,500", description: "Specialized cleaning and preservation" }
        ])
      } finally {
        setServicesLoading(false)
      }
    }

    fetchServices()
  }, [])

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const getNumericPrice = (service: CatalogService) => {
    if (typeof service.effectivePrice === "number") return service.effectivePrice
    if (typeof service.basePrice === "number") return service.basePrice
    const priceText = service.price || ""
    const matched = priceText.replace(/,/g, "").match(/(\d+(\.\d+)?)/)
    return matched ? Number(matched[1]) : 0
  }

  const categories = useMemo(() => {
    const values = new Set<string>()
    services.forEach((service) => {
      const category = service.category?.trim()
      if (category) values.add(category)
    })
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [services])

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    const filtered = services.filter((service) => {
      if (selectedCategory !== "all" && (service.category || "").toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      const numericPrice = getNumericPrice(service)
      if (priceFilter === "under-100" && numericPrice >= 100) return false
      if (priceFilter === "under-250" && numericPrice >= 250) return false
      if (priceFilter === "under-500" && numericPrice >= 500) return false
      if (priceFilter === "above-500" && numericPrice <= 500) return false

      if (!q) return true
      const haystack = `${service.name} ${service.description || ""} ${service.category || ""}`.toLowerCase()
      return haystack.includes(q)
    })

    const sorted = [...filtered]
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => getNumericPrice(a) - getNumericPrice(b))
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => getNumericPrice(b) - getNumericPrice(a))
    } else if (sortBy === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [services, serviceSearch, selectedCategory, priceFilter, sortBy])

  const visibleServices = useMemo(() => {
    if (showAllServices) return filteredServices
    return filteredServices.slice(0, 12)
  }, [filteredServices, showAllServices])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleAddToCart = async (serviceId: string) => {
    if (!isLoggedIn) {
      router.push('/auth/signin')
      return
    }

    setCartNotice(null)
    setAddingItemByService(prev => ({ ...prev, [serviceId]: true }))

    try {
      const response = await fetch('/api/customer/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId,
          quantity: 1
        })
      })

      if (response.status === 401) {
        router.push('/auth/signin')
        return
      }

      const data = await response.json()
      if (!response.ok) {
        setCartNotice(data.error || 'Failed to add item to cart')
        return
      }

      setCartNotice('Added to cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      setCartNotice('Failed to add item to cart')
    } finally {
      setAddingItemByService(prev => ({ ...prev, [serviceId]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoggedIn) {
      // This shouldn't happen since we check auth, but just in case
      router.push('/auth/signin')
      return
    }

    if (selectedServices.length === 0) {
      alert("Please select at least one service")
      return
    }

    // Here you would normally submit to an API
    // For now, show success message and redirect to customer dashboard
    alert("Booking submitted successfully! You will receive a confirmation email shortly.")
    router.push('/customer/dashboard')
  }

  const bookingForm = (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem", position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: "2.25rem", fontWeight: "700", color: "#111827", marginBottom: "1rem" }}>
              Book Your Service
            </h1>
            <p style={{ fontSize: "1.125rem", color: "#6b7280" }}>
              {isLoggedIn 
                ? `Welcome back, ${userInfo.name}! Select your services and schedule a convenient pickup time`
                : "Select your services and schedule a convenient pickup time"
              }
            </p>
            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {isLoggedIn ? (
                <Link href="/customer/cart" style={{ color: "#1e40af", textDecoration: "none", fontWeight: 600 }}>
                  View Cart
                </Link>
              ) : (
                <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Browse freely. Sign in at checkout to place order.
                </span>
              )}
              <span style={{ color: "#94a3b8" }}>•</span>
              <span style={{ color: "#334155", fontSize: "0.9rem" }}>
                Selected: <strong>{selectedServices.length}</strong>
              </span>
            </div>
            {cartNotice && (
              <p style={{ marginTop: "0.5rem", color: cartNotice === 'Added to cart' ? "#059669" : "#dc2626", fontSize: "0.9rem" }}>
                {cartNotice}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "1fr", maxWidth: "48rem", margin: "0 auto" }}>
          
          {/* Service Selection */}
          <div className="card">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Select Services
            </h2>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="Search services by name, category, or keyword"
                  value={serviceSearch}
                  onChange={(e) => {
                    setServiceSearch(e.target.value)
                    setShowAllServices(false)
                  }}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.5rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setShowAllServices(false)
                  }}
                  style={{ width: "100%", padding: "0.65rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", backgroundColor: "white" }}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>
                <select
                  value={priceFilter}
                  onChange={(e) => {
                    setPriceFilter(e.target.value as typeof priceFilter)
                    setShowAllServices(false)
                  }}
                  style={{ width: "100%", padding: "0.65rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", backgroundColor: "white" }}
                >
                  <option value="all">Any Price</option>
                  <option value="under-100">Under INR 100</option>
                  <option value="under-250">Under INR 250</option>
                  <option value="under-500">Under INR 500</option>
                  <option value="above-500">Above INR 500</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  style={{ width: "100%", padding: "0.65rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", backgroundColor: "white" }}
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                Showing {visibleServices.length} of {filteredServices.length} matching services
                {filteredServices.length !== services.length ? ` (from ${services.length} total)` : ""}
              </div>
            </div>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              {servicesLoading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      backgroundColor: "#f9fafb"
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e5e7eb', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 20, background: '#e5e7eb', borderRadius: 4, marginBottom: 8, width: '70%' }}></div>
                      <div style={{ height: 16, background: '#e5e7eb', borderRadius: 4, marginBottom: 4, width: '50%' }}></div>
                      <div style={{ height: 14, background: '#e5e7eb', borderRadius: 4, width: '80%' }}></div>
                    </div>
                  </div>
                ))
              ) : servicesError ? (
                // Error state
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '2rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</div>
                  <p style={{ color: "#dc2626", marginBottom: "1rem" }}>
                    {servicesError}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      cursor: "pointer"
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : services.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '2rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ color: "#334155", marginBottom: "0.5rem", fontWeight: 600 }}>
                    No services are available right now.
                  </p>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
                    Please try again later or contact support.
                  </p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '1.5rem',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '0.5rem'
                }}>
                  <p style={{ color: "#334155", marginBottom: "0.4rem", fontWeight: 600 }}>
                    No services match these filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceSearch("")
                      setSelectedCategory("all")
                      setPriceFilter("all")
                      setSortBy("relevance")
                      setShowAllServices(false)
                    }}
                    style={{
                      backgroundColor: "white",
                      color: "#1e40af",
                      border: "1px solid #1e40af",
                      borderRadius: "0.45rem",
                      padding: "0.4rem 0.7rem",
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                visibleServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    style={{
                      padding: "1rem",
                      border: selectedServices.includes(service.id) ? "2px solid #1e40af" : "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      backgroundColor: selectedServices.includes(service.id) ? "#eff6ff" : "white",
                      transition: "all 0.2s",
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: selectedServices.includes(service.id) ? 'linear-gradient(135deg,#e0f2fe,#eff6ff)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {/* simple service icons */}
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 8h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" stroke="#1e40af" strokeWidth="1.2" opacity="0.9"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#1e40af", margin: 0 }}>
                          {service.name}
                        </h3>
                        <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#059669" }}>
                          {service.price || `From INR ${getNumericPrice(service)}`}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                        {service.description}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCart(service.id)
                        }}
                        disabled={addingItemByService[service.id]}
                        style={{
                          marginTop: "0.6rem",
                          backgroundColor: addingItemByService[service.id] ? "#93c5fd" : "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: "0.5rem",
                          padding: "0.45rem 0.75rem",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: addingItemByService[service.id] ? "not-allowed" : "pointer"
                        }}
                      >
                        {!isLoggedIn ? "Sign in to add" : addingItemByService[service.id] ? "Adding..." : "Add to cart"}
                      </button>
                      {selectedServices.includes(service.id) && (
                        <div style={{ marginTop: "0.5rem", color: "#1e40af", fontSize: "0.875rem", fontWeight: "500" }}>
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {!servicesLoading && filteredServices.length > 12 && (
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowAllServices((prev) => !prev)}
                  style={{
                    backgroundColor: "white",
                    color: "#1e40af",
                    border: "1px solid #1e40af",
                    borderRadius: "0.5rem",
                    padding: "0.55rem 0.9rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {showAllServices
                    ? "Show fewer services"
                    : `Show all ${filteredServices.length} services`}
                </button>
              </div>
            )}
          </div>

          {/* Pickup Information */}
          <div className="card">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Pickup Information
            </h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                  Pickup Address *
                </label>
                <input
                  type="text"
                  name="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={handleInputChange}
                  placeholder="Enter your pickup address"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.5rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                    Pickup Date *
                  </label>
                  <input
                    type="date"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                    Pickup Time *
                  </label>
                  <select
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={(e) => handleInputChange(e as any)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      outline: "none",
                      backgroundColor: "white",
                      boxSizing: "border-box"
                    }}
                    required
                  >
                    <option value="">Select time</option>
                    <option value="08:00">8:00 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="card">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Delivery Information
            </h2>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                Delivery Address
              </label>
              <input
                type="text"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleInputChange}
                placeholder="Same as pickup address or enter different address"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Leave blank to use the same address as pickup
              </p>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="card">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
              Special Instructions
            </h2>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                Additional Notes (Optional)
              </label>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                placeholder="Any special care instructions, stain details, or other notes..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: "center" }}>
            {isLoggedIn ? (
              // Logged in user - show booking button
              <div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ 
                    fontSize: "1.125rem",
                    padding: "1rem 2rem",
                    minWidth: "200px"
                  }}
                >
                  Book Now
                </button>
                <p style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280", 
                  marginTop: "1rem" 
                }}>
                  You will receive a confirmation email with tracking details
                </p>
              </div>
            ) : (
              // Not logged in - show sign in/sign up prompt
              <div>
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "#fef3c7", 
                  border: "1px solid #fbbf24", 
                  borderRadius: "0.5rem", 
                  marginBottom: "1rem",
                  fontSize: "0.875rem",
                  color: "#92400e"
                }}>
                  <strong>Note:</strong> You need to sign in or create an account to complete your booking.
                </div>
                
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link 
                    href="/auth/signup" 
                    className="btn-primary"
                    style={{ 
                      textDecoration: "none", 
                      fontSize: "1rem",
                      padding: "0.75rem 1.5rem"
                    }}
                  >
                    Sign Up to Book
                  </Link>
                  <Link 
                    href="/auth/signin" 
                    style={{ 
                      backgroundColor: "transparent",
                      color: "#1e40af",
                      border: "1px solid #1e40af",
                      fontWeight: "500",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "0.5rem",
                      textDecoration: "none",
                      fontSize: "1rem"
                    }}
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )

  // If user is logged in, wrap with CustomerDashboardLayout
  if (isLoggedIn) {
    return (
      <CustomerDashboardLayout 
        currentPage="book-service" 
        userEmail={userInfo.email} 
        userName={userInfo.name}
      >
        {bookingForm}
      </CustomerDashboardLayout>
    )
  }

  // If not logged in, show standalone page
  return (
    <div className="min-h-screen">
      {/* Header is provided globally via src/components/Header and included in layout.tsx */}
      {bookingForm}
    </div>
  )
}
