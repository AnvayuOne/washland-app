"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  store: {
    name: string
    franchise: {
      name: string
    }
  }
  orderItems: Array<{
    quantity: number
    price: number
    service: {
      name: string
    }
  }>
}

export default function OrdersPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    const r = localStorage.getItem('userRole')
    const email = localStorage.getItem('userEmail')

    if (r !== 'SUPER_ADMIN' && r !== 'washland') return router.push('/washland/login')

    setUserRole(r || '')
    setUserEmail(email || '')
    setReady(true)
  }, [router])

  useEffect(() => {
    if (ready) {
      fetchOrders()
    }
  }, [ready, selectedStatus])

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  const fetchOrders = async () => {
    try {
      const params = selectedStatus !== 'all' ? `?status=${selectedStatus}` : ''
      const response = await fetch(`/api/admin/orders${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders)
        } else if (Array.isArray(data)) {
          // Fallback if API changes to return array directly
          setOrders(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrders() // Refresh the list
      } else {
        alert('Failed to update order status')
      }
    } catch (error) {
      alert('Error updating order status')
    }
  }

  if (!ready) return null

  const totalOrders = orders.length
  const activeOrders = orders.filter(o => ['PENDING', 'IN_PROGRESS', 'READY'].includes(o.status)).length
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length
  const totalRevenue = orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0)

  const statusColorMap: Record<string, string> = {
    'PENDING': '#f59e0b',
    'IN_PROGRESS': '#3b82f6',
    'READY': '#8b5cf6',
    'COMPLETED': '#10b981',
    'CANCELLED': '#ef4444'
  }

  const statusOptions = ['PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED']

  return (
    <DashboardLayout
      userRole={userRole}
      userName="Washland Admin"
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                Order Management
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Monitor and manage orders across all stores
              </p>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Filter by Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatsCard
              title="Total Orders"
              value={totalOrders.toString()}
              icon={<OrderIcon />}
              color="#3b82f6"
            />
            <StatsCard
              title="Active Orders"
              value={activeOrders.toString()}
              icon={<ClockIcon />}
              color="#f59e0b"
            />
            <StatsCard
              title="Completed Orders"
              value={completedOrders.toString()}
              icon={<CheckCircleIcon />}
              color="#10b981"
            />
            <StatsCard
              title="Total Revenue"
              value={`₹${totalRevenue.toLocaleString('en-IN')}`}
              icon={<CurrencyIcon />}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              Orders ({totalOrders})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No orders found for the selected criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Order #</th>
                    <th style={tableHeaderStyle}>Customer</th>
                    <th style={tableHeaderStyle}>Store</th>
                    <th style={tableHeaderStyle}>Items</th>
                    <th style={tableHeaderStyle}>Amount</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          #{order.orderNumber}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {order.customer.firstName} {order.customer.lastName}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {order.customer.email}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {order.customer.phone}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ color: '#374151' }}>{order.store.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {order.store.franchise.name}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.875rem' }}>
                          {order.orderItems.map((item, index) => (
                            <div key={index} style={{ color: '#374151' }}>
                              {item.quantity}x {item.service.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          ₹{order.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: `${statusColorMap[order.status]}1a`,
                          color: statusColorMap[order.status]
                        }}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          <Link
                            href={`/washland/orders/${order.id}`}
                            style={{
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            View Details
                          </Link>
                          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: 'white'
                              }}
                            >
                              {statusOptions.filter(s => s !== 'CANCELLED').map(status => (
                                <option key={status} value={status}>
                                  {status.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// Helper Components
interface StatsCardProps {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{
        padding: '0.75rem',
        borderRadius: '8px',
        backgroundColor: `${color}1a`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
          {value}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {title}
        </div>
      </div>
    </div>
  )
}

// Styles
const tableHeaderStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left' as const,
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em'
}

const tableCellStyle = {
  padding: '1rem',
  fontSize: '0.875rem'
}

// Icons
const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6C4 4.89543 4.89543 4 6 4H8" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14L11 16L15 12" />
  </svg>
)

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M9 11l3 3L22 4" />
  </svg>
)

const CurrencyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5C17 13.8807 15.8807 15 14.5 15H7" />
    <line x1="10" y1="1" x2="10" y2="5" />
    <line x1="14" y1="19" x2="14" y2="23" />
  </svg>
)