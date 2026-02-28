"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  itemsCount: number
  items: OrderItem[]
  store: {
    name: string
    city: string
  }
  pickupDate?: string
  deliveryDate?: string
  specialInstructions?: string
  paymentStatus: string
  pickupRider?: {
    firstName: string
    lastName: string
    phone: string
  }
  deliveryRider?: {
    firstName: string
    lastName: string
    phone: string
  }
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  service: {
    name: string
    description?: string
  }
  notes?: string
}

export default function CurrentOrdersPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Customer'
    setUserEmail(email)
    setUserName(name)

    fetchCurrentOrders()
  }, [])

  const fetchCurrentOrders = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      // Fetch orders that are not completed or cancelled
      const statuses = ['PAYMENT_PENDING', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'DELIVERED']
      const orderPromises = statuses.map(status =>
        fetch(`/api/customer/orders?status=${status}&limit=50`, {
          headers: {
          }
        }).then(res => res.ok ? res.json() : { orders: [] })
      )

      const results = await Promise.all(orderPromises)
      const allOrders = results.flatMap(result => result.orders || [])

      // Sort by created date (most recent first) and remove duplicates
      const uniqueOrders = allOrders
        .filter((order, index, self) =>
          index === self.findIndex(o => o.id === order.id)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOrders(uniqueOrders)
    } catch (error) {
      console.error('Error fetching current orders:', error)
      toast.error('Error', 'Failed to fetch current orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING': return '#ea580c'
      case 'PENDING': return '#f59e0b'
      case 'CONFIRMED': return '#3b82f6'
      case 'IN_PROGRESS': return '#8b5cf6'
      case 'READY_FOR_PICKUP': return '#10b981'
      case 'DELIVERED': return '#059669'
      case 'COMPLETED': return '#6b7280'
      case 'CANCELLED': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING': return 'Awaiting payment confirmation'
      case 'PENDING': return 'Your order is being reviewed'
      case 'CONFIRMED': return 'Order confirmed, preparing for pickup'
      case 'IN_PROGRESS': return 'Your clothes are being cleaned'
      case 'READY_FOR_PICKUP': return 'Ready for pickup at the store'
      case 'DELIVERED': return 'Delivered to your address'
      default: return 'Order in progress'
    }
  }

  if (loading) {
    return (
      <CustomerDashboardLayout currentPage="orders" userEmail={userEmail} userName={userName}>
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
            <p style={{ color: '#6b7280' }}>Loading current orders...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout currentPage="orders" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Current Orders
            </h1>
            <p style={{ color: '#6b7280' }}>
              Track your active laundry orders
            </p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '1rem' }}>
              No current orders
            </p>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
              Your active orders will appear here
            </p>
            <button
              onClick={() => router.push('/book-service')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Book New Service
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {orders.map((order) => (
              <CurrentOrderCard
                key={order.id}
                order={order}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStatusDescription={getStatusDescription}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </CustomerDashboardLayout>
  )
}

interface CurrentOrderCardProps {
  order: Order
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
  getStatusDescription: (status: string) => string
}

function CurrentOrderCard({ order, getStatusColor, getStatusLabel, getStatusDescription }: CurrentOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #f3f4f6'
    }}>
      {/* Order Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              {order.orderNumber}
            </h3>
            <div style={{
              backgroundColor: getStatusColor(order.status) + '15',
              color: getStatusColor(order.status),
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {getStatusLabel(order.status)}
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {getStatusDescription(order.status)}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              <strong>Store:</strong> {order.store.name}, {order.store.city}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              <strong>Items:</strong> {order.itemsCount} items
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              <strong>Total:</strong> ₹{order.totalAmount}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              <strong>Ordered:</strong> {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}
          >
            {isExpanded ? '▲ Less' : '▼ More'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid #f3f4f6',
          paddingTop: '1rem',
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Items */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Items ({order.items.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {order.items.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}>
                  <div>
                    <span>{item.quantity}x {item.service.name}</span>
                    {item.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                  <span>₹{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Order Details
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Payment Status: </span>
                <span style={{
                  color: order.paymentStatus === 'PAID' ? '#059669' : '#f59e0b',
                  fontWeight: '500'
                }}>
                  {order.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
              {order.pickupDate && (
                <div>
                  <span style={{ color: '#6b7280' }}>Pickup Date: </span>
                  <span>{new Date(order.pickupDate).toLocaleDateString()}</span>
                </div>
              )}
              {order.deliveryDate && (
                <div>
                  <span style={{ color: '#6b7280' }}>Delivery Date: </span>
                  <span>{new Date(order.deliveryDate).toLocaleDateString()}</span>
                </div>
              )}
              {order.pickupRider && (
                <div>
                  <span style={{ color: '#6b7280' }}>Pickup Rider: </span>
                  <span>{order.pickupRider.firstName} {order.pickupRider.lastName} ({order.pickupRider.phone})</span>
                </div>
              )}
              {order.deliveryRider && (
                <div>
                  <span style={{ color: '#6b7280' }}>Delivery Rider: </span>
                  <span>{order.deliveryRider.firstName} {order.deliveryRider.lastName} ({order.deliveryRider.phone})</span>
                </div>
              )}
              {order.specialInstructions && (
                <div>
                  <span style={{ color: '#6b7280' }}>Special Instructions: </span>
                  <span>{order.specialInstructions}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
