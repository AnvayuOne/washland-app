"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import StoreAdminLayout from '@/components/StoreAdminLayout'

interface Service {
  id: string
  name: string
  description: string
  basePrice: number
  category: string
  isActive: boolean
}

interface OrderItem {
  serviceId: string
  service: Service
  quantity: number
  price: number
  notes?: string
}

interface CustomerAddress {
  id: string
  title: string
  street: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

interface CustomerOption {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  addresses: CustomerAddress[]
}

export default function NewOrderPage() {
  const router = useRouter()
  const toast = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [storeId, setStoreId] = useState('')
  const [storeName, setStoreName] = useState('')
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const selectedAddress = selectedCustomer?.addresses.find((a) => a.id === selectedAddressId)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    const storeId = localStorage.getItem('storeId')
    const email = localStorage.getItem('userEmail')

    if (role !== 'STORE_ADMIN' && role !== 'store-admin') {
      return router.push('/admin/login')
    }

    if (!storeId) {
      toast.error('Error', 'No store selected. Please login again.')
      return router.push('/admin/login')
    }

    setUserRole(role)
    setUserEmail(email || '')
    setStoreId(storeId)

    // Get user info from auth events
    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) setUserName(e.detail.name)
      if (e.detail?.storeName) setStoreName(e.detail.storeName)
    }

    window.addEventListener('auth:session', handleAuthUpdate as EventListener)

    return () => {
      window.removeEventListener('auth:session', handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  // Fetch services + customer lookup data when auth data is available
  useEffect(() => {
    if (userEmail && userRole) {
      fetchInitialData()
    }
  }, [userEmail, userRole])

  const fetchInitialData = async () => {
    setLoading(true)
    await Promise.all([fetchServices(), fetchCustomerLookups()])
    setLoading(false)
  }

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services?isActive=true', {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setServices(data)
      } else {
        console.error('Failed to fetch services')
        toast.error('Error', 'Failed to load services')
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Error', 'Failed to load services')
    }
  }

  const fetchCustomerLookups = async () => {
    try {
      const response = await fetch('/api/admin/orders?lookup=customers', {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        console.error('Failed to fetch customers')
        toast.error('Error', 'Failed to load customers')
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Error', 'Failed to load customers')
    }
  }

  useEffect(() => {
    setSelectedAddressId('')
  }, [selectedCustomerId])

  const addServiceToOrder = (service: Service) => {
    const existingItem = selectedItems.find(item => item.serviceId === service.id)

    if (existingItem) {
      // Increase quantity
      setSelectedItems(prev => prev.map(item =>
        item.serviceId === service.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      // Add new item
      const newItem: OrderItem = {
        serviceId: service.id,
        service,
        quantity: 1,
        price: service.basePrice,
        notes: ''
      }
      setSelectedItems(prev => [...prev, newItem])
    }
  }

  const updateItemQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(serviceId)
      return
    }

    setSelectedItems(prev => prev.map(item =>
      item.serviceId === serviceId
        ? { ...item, quantity }
        : item
    ))
  }

  const updateItemPrice = (serviceId: string, price: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.serviceId === serviceId
        ? { ...item, price }
        : item
    ))
  }

  const updateItemNotes = (serviceId: string, notes: string) => {
    setSelectedItems(prev => prev.map(item =>
      item.serviceId === serviceId
        ? { ...item, notes }
        : item
    ))
  }

  const removeItem = (serviceId: string) => {
    setSelectedItems(prev => prev.filter(item => item.serviceId !== serviceId))
  }

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomerId) {
      toast.error('Validation Error', 'Please select a customer')
      return
    }

    if (!selectedAddressId) {
      toast.error('Validation Error', 'Please select a customer address')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('Validation Error', 'Please add at least one service to the order')
      return
    }

    setSubmitting(true)

    try {
      const orderData = {
        storeId,
        userId: selectedCustomerId,
        addressId: selectedAddressId,
        items: selectedItems.map(item => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
          price: item.price.toString(),
          notes: item.notes
        })),
        pickupDate: pickupDate || null,
        deliveryDate: deliveryDate || null,
        specialInstructions
      }

      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Order Created', `Order #${data.order.orderNumber} created successfully!`)
        router.push('/admin/orders')
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to create order')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error', 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('storeId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')

    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    toast.success('Signed Out', 'You have been successfully signed out.')
    router.push('/')
  }

  if (loading) {
    return (
      <StoreAdminLayout
        userRole={userRole}
        userName={userName || 'Store Admin'}
        userEmail={userEmail}
        storeName={storeName}
        onSignOut={handleSignOut}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#6b7280' }}>Loading services and customers...</p>
          </div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </StoreAdminLayout>
    )
  }

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName || 'Store Admin'}
      userEmail={userEmail}
      storeName={storeName}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ← Back
            </button>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              Create New Order
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Create a new in-store order for an existing customer
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
          {/* Left Column - Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Customer Information */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                Customer Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>
                    Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {`${customer.firstName} ${customer.lastName} - ${customer.phone}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>
                    Address *
                  </label>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    required
                    disabled={!selectedCustomerId}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      backgroundColor: selectedCustomerId ? 'white' : '#f9fafb'
                    }}
                  >
                    <option value="">Select address</option>
                    {(selectedCustomer?.addresses || []).map((address) => (
                      <option key={address.id} value={address.id}>
                        {`${address.title}: ${address.street}, ${address.city}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCustomer && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  color: '#334155'
                }}>
                  <div>{`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}</div>
                  <div>{selectedCustomer.phone}</div>
                  {selectedCustomer.email && <div>{selectedCustomer.email}</div>}
                  {selectedAddress && (
                    <div style={{ marginTop: '0.35rem', color: '#0f172a' }}>
                      {`${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zipCode}`}
                    </div>
                  )}
                </div>
              )}

              {customers.length === 0 && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#b45309' }}>
                  No active customers found. Create a customer account before placing an order.
                </p>
              )}
            </div>

            {/* Service Selection */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  Available Services
                </h3>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {services.length} services available
                </span>
              </div>

              {/* Compact Service Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0.5rem'
              }}>
                {services.map((service) => (
                  <div
                    key={service.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: 'white',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.backgroundColor = '#f0f9ff'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    onClick={() => addServiceToOrder(service)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#111827',
                        lineHeight: '1.2',
                        flex: 1,
                        marginRight: '0.5rem'
                      }}>
                        {service.name}
                      </h4>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#059669',
                        whiteSpace: 'nowrap'
                      }}>
                        ₹{service.basePrice}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {service.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '9999px',
                        fontSize: '0.625rem',
                        fontWeight: '500'
                      }}>
                        {service.category}
                      </span>

                      <div style={{
                        fontSize: '0.625rem',
                        color: '#3b82f6',
                        fontWeight: '500'
                      }}>
                        Click to add
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {services.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#6b7280'
                }}>
                  <p>No services available</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: '#111827'
              }}>
                Schedule (Optional)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>
                    Pickup Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>
                    Delivery Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.25rem'
                }}>
                  Special Instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special instructions for this order..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Order Summary */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              position: 'sticky',
              top: '1rem',
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  Order Summary
                </h3>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px'
                }}>
                  {selectedItems.length} items
                </span>
              </div>

              {selectedItems.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '1.5rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>🛒</div>
                  <p>Click on services to add them to the order</p>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {selectedItems.map((item) => (
                      <div key={item.serviceId} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem'
                        }}>
                          <h4 style={{
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: '#111827',
                            flex: 1,
                            marginRight: '0.5rem'
                          }}>
                            {item.service.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.serviceId)}
                            style={{
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.125rem',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove item"
                          >
                            ×
                          </button>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.serviceId, parseInt(e.target.value) || 1)}
                              style={{
                                width: '50px',
                                padding: '0.25rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                textAlign: 'center'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>₹</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItemPrice(item.serviceId, parseFloat(e.target.value) || 0)}
                              style={{
                                width: '60px',
                                padding: '0.25rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                textAlign: 'center'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.5rem' }}>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.serviceId, e.target.value)}
                            placeholder="Notes..."
                            style={{
                              width: '100%',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}
                          />
                        </div>

                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#059669',
                          textAlign: 'right'
                        }}>
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                        Total: ₹{calculateTotal().toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        !selectedCustomerId ||
                        !selectedAddressId ||
                        selectedItems.length === 0
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: (
                          submitting ||
                          !selectedCustomerId ||
                          !selectedAddressId ||
                          selectedItems.length === 0
                        ) ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: (
                          submitting ||
                          !selectedCustomerId ||
                          !selectedAddressId ||
                          selectedItems.length === 0
                        ) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {submitting ? 'Creating Order...' : 'Create Order'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </StoreAdminLayout>
  )
}
