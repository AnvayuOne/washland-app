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
  completedAt?: string
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

export default function OrderHistoryPage() {
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

    fetchOrderHistory()
  }, [])

  const fetchOrderHistory = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      // Fetch completed and cancelled orders
      const statuses = ['COMPLETED', 'CANCELLED']
      const orderPromises = statuses.map(status =>
        fetch(`/api/customer/orders?status=${status}&limit=50`, {
          headers: {
          }
        }).then(res => res.ok ? res.json() : { orders: [] })
      )

      const results = await Promise.all(orderPromises)
      const allOrders = results.flatMap(result => result.orders || [])

      // Sort by completed date or created date (most recent first) and remove duplicates
      const uniqueOrders = allOrders
        .filter((order, index, self) =>
          index === self.findIndex(o => o.id === order.id)
        )
        .sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt)
          const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })

      setOrders(uniqueOrders)
    } catch (error) {
      console.error('Error fetching order history:', error)
      toast.error('Error', 'Failed to fetch order history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#059669'
      case 'CANCELLED': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const reorderItems = async (orderId: string) => {
    try {
      const response = await fetch('/api/customer/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Success', 'Items added to cart for reordering')
        router.push('/book-service')
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to reorder items')
      }
    } catch (error) {
      console.error('Error reordering:', error)
      toast.error('Error', 'Failed to reorder items')
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
            <p style={{ color: '#6b7280' }}>Loading order history...</p>
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
              Order History
            </h1>
            <p style={{ color: '#6b7280' }}>
              View your completed and cancelled orders
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
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '1rem' }}>
              No order history
            </p>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
              Your completed orders will appear here
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
              Book Your First Service
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {orders.map((order) => (
              <HistoryOrderCard
                key={order.id}
                order={order}
                onReorder={reorderItems}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
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

interface HistoryOrderCardProps {
  order: Order
  onReorder: (orderId: string) => void
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
}

function HistoryOrderCard({ order, onReorder, getStatusColor, getStatusLabel }: HistoryOrderCardProps) {
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
              <strong>Completed:</strong> {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {order.status === 'COMPLETED' && (
            <button
              onClick={() => onReorder(order.id)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              Reorder
            </button>
          )}

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
              <div>
                <span style={{ color: '#6b7280' }}>Order Date: </span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.completedAt && (
                <div>
                  <span style={{ color: '#6b7280' }}>Completed Date: </span>
                  <span>{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
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
