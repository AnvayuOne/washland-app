"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import StoreAdminLayout from '@/components/StoreAdminLayout'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: string
  total: number
  createdAt: string
  pickupDate?: string
  items: Array<{
    id: string
    service: { name: string }
    quantity: number
  }>
}

interface PickupRequest {
  orderId?: string
  customerName: string
  customerPhone: string
  pickupDate: string
  pickupTime: string
  specialInstructions: string
  items: string
}

export default function SchedulePickupPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [pickupRequest, setPickupRequest] = useState<PickupRequest>({
    customerName: '',
    customerPhone: '',
    pickupDate: '',
    pickupTime: '',
    specialInstructions: '',
    items: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [storeId, setStoreId] = useState('')
  const [storeName, setStoreName] = useState('')

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

  // Fetch orders when auth data is available
  useEffect(() => {
    if (userEmail && userRole && storeId) {
      fetchPendingOrders(storeId)
    }
  }, [userEmail, userRole, storeId])

  const fetchPendingOrders = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/orders?storeId=${storeId}&status=confirmed&status=in-progress`, {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        const transformedOrders: Order[] = data.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest Customer',
          customerPhone: order.user?.phone || 'N/A',
          status: order.status,
          total: Number(order.totalAmount),
          createdAt: order.createdAt,
          pickupDate: order.pickupDate,
          items: order.items
        }))
        setOrders(transformedOrders)
      } else {
        console.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    setPickupRequest({
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      pickupDate: '',
      pickupTime: '',
      specialInstructions: '',
      items: order.items.map(item => `${item.quantity}x ${item.service.name}`).join(', ')
    })
  }

  const handleManualEntry = () => {
    setSelectedOrder(null)
    setPickupRequest({
      customerName: '',
      customerPhone: '',
      pickupDate: '',
      pickupTime: '',
      specialInstructions: '',
      items: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pickupRequest.customerName || !pickupRequest.customerPhone) {
      toast.error('Validation Error', 'Customer name and phone are required')
      return
    }

    if (!pickupRequest.pickupDate || !pickupRequest.pickupTime) {
      toast.error('Validation Error', 'Pickup date and time are required')
      return
    }

    setSubmitting(true)

    try {
      // For now, we'll create a pickup request by updating the order's pickup date
      // In a real system, you might have a separate pickup requests table
      if (selectedOrder) {
        const pickupDateTime = `${pickupRequest.pickupDate}T${pickupRequest.pickupTime}`

        const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pickupDate: pickupDateTime,
            specialInstructions: pickupRequest.specialInstructions || undefined
          })
        })

        if (response.ok) {
          toast.success('Pickup Scheduled', `Pickup scheduled for ${selectedOrder.customerName} on ${new Date(pickupDateTime).toLocaleString()}`)
          router.push('/admin/orders')
        } else {
          const errorData = await response.json()
          toast.error('Error', errorData.error || 'Failed to schedule pickup')
        }
      } else {
        // For manual entries, you might want to create a new order or pickup request
        // For now, we'll show a message that this feature is not fully implemented
        toast.info('Manual Pickup Scheduling', 'Manual pickup scheduling will be available soon. Please create an order first.')
      }
    } catch (error) {
      console.error('Error scheduling pickup:', error)
      toast.error('Error', 'Failed to schedule pickup')
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
            <p style={{ color: '#6b7280' }}>Loading orders...</p>
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
      <div style={{ maxWidth: '1000px' }}>
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
              Schedule Pickup
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Schedule customer pickups for existing orders
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column - Order Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Order Selection Mode */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#111827'
              }}>
                Select Order
              </h3>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: selectedOrder === null ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: selectedOrder === null ? '#eff6ff' : 'white',
                    color: selectedOrder === null ? '#1e40af' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => {}}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: selectedOrder !== null ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: selectedOrder !== null ? '#eff6ff' : 'white',
                    color: selectedOrder !== null ? '#1e40af' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Select Existing Order
                </button>
              </div>

              {selectedOrder === null ? (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Enter customer details manually for pickup scheduling.
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleOrderSelect(order)}
                        style={{
                          padding: '1rem',
                          border: selectedOrder?.id === order.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: selectedOrder?.id === order.id ? '#eff6ff' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            #{order.orderNumber}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
                            ₹{order.total}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          {order.customerName}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Pickup Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <form onSubmit={handleSubmit} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#111827'
              }}>
                Pickup Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Customer Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={pickupRequest.customerName}
                      onChange={(e) => setPickupRequest(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter customer name"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={pickupRequest.customerPhone}
                      onChange={(e) => setPickupRequest(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Enter phone number"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Pickup Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      value={pickupRequest.pickupDate}
                      onChange={(e) => setPickupRequest(prev => ({ ...prev, pickupDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Pickup Time *
                    </label>
                    <input
                      type="time"
                      value={pickupRequest.pickupTime}
                      onChange={(e) => setPickupRequest(prev => ({ ...prev, pickupTime: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Items to Pickup
                  </label>
                  <textarea
                    value={pickupRequest.items}
                    onChange={(e) => setPickupRequest(prev => ({ ...prev, items: e.target.value }))}
                    placeholder="Describe items for pickup..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Special Instructions */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Special Instructions
                  </label>
                  <textarea
                    value={pickupRequest.specialInstructions}
                    onChange={(e) => setPickupRequest(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    placeholder="Any special instructions for pickup..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: submitting ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </StoreAdminLayout>
  )
}
