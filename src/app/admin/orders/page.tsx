"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'
import StoreAdminLayout from '@/components/StoreAdminLayout'
import {
  ORDER_STATUS_SEQUENCE,
  canTransition,
  statusLabel,
  type OrderStatusValue
} from '@/lib/orderStatus'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: OrderStatusValue
  items: OrderItem[]
  total: number
  pickupDate?: string
  deliveryDate?: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  createdAt: string
  updatedAt: string
  pickupRider?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  deliveryRider?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

interface OrderItem {
  id: string
  itemType: string
  quantity: number
  price: number
  instructions?: string
}

interface Rider {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

const statusColorMap: Record<OrderStatusValue, string> = {
  PAYMENT_PENDING: '#ea580c',
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  READY_FOR_PICKUP: '#14b8a6',
  DELIVERED: '#10b981',
  COMPLETED: '#059669',
  CANCELLED: '#ef4444'
}

const orderStatuses = ORDER_STATUS_SEQUENCE.map((status) => ({
  value: status,
  label: statusLabel(status),
  color: statusColorMap[status]
}))

export default function OrdersPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
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

    // Get user info from auth events
    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) setUserName(e.detail.name)
      if (e.detail?.storeName) setStoreName(e.detail.storeName)
    }

    window.addEventListener('auth:session', handleAuthUpdate as EventListener)

    // Pass the values directly to avoid state update timing issues
    fetchOrders(storeId, email || '', role || '')
    fetchRiders(storeId, email || '', role || '')

    return () => {
      window.removeEventListener('auth:session', handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  useEffect(() => {
    // Filter orders based on status and search term
    let filtered = orders

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus)
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm)
      )
    }

    setFilteredOrders(filtered)
  }, [orders, selectedStatus, searchTerm])

  const fetchOrders = async (storeId: string, email?: string, role?: string) => {
    try {
      const authEmail = email || userEmail
      const authRole = role || userRole
      
      const response = await fetch(`/api/admin/orders?storeId=${storeId}`, {
        headers: {
          'x-user-email': authEmail,
          'x-user-role': authRole
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Raw orders data:', data.orders)
        
        // Transform database orders to match frontend interface
        const transformedOrders: Order[] = data.orders.map((dbOrder: any) => ({
          id: dbOrder.id,
          orderNumber: dbOrder.orderNumber,
          customerName: dbOrder.user ? `${dbOrder.user.firstName} ${dbOrder.user.lastName}` : 'Guest Customer',
          customerPhone: dbOrder.user?.phone || 'N/A',
          status: dbOrder.status as OrderStatusValue,
          items: dbOrder.items.map((item: any) => ({
            id: item.id,
            itemType: item.service?.name || 'Unknown Service',
            quantity: item.quantity,
            price: Number(item.price),
            instructions: item.notes
          })),
          total: Number(dbOrder.totalAmount),
          pickupDate: dbOrder.pickupDate,
          deliveryDate: dbOrder.deliveryDate,
          paymentStatus: dbOrder.paymentStatus as 'PENDING' | 'PAID' | 'FAILED',
          createdAt: dbOrder.createdAt,
          updatedAt: dbOrder.updatedAt,
          pickupRider: dbOrder.pickupRider,
          deliveryRider: dbOrder.deliveryRider
        }))
        
        console.log('Transformed orders:', transformedOrders)
        setOrders(transformedOrders)
      } else {
        console.error('Failed to fetch orders:', response.statusText)
        generateMockOrders()
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      generateMockOrders()
    } finally {
      setLoading(false)
    }
  }

  const fetchRiders = async (storeId: string, email?: string, role?: string) => {
    try {
      const authEmail = email || userEmail
      const authRole = role || userRole
      
      const response = await fetch(`/api/admin/riders?storeId=${storeId}`, {
        headers: {
          'x-user-email': authEmail,
          'x-user-role': authRole
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRiders(data.riders || [])
      } else {
        console.error('Failed to fetch riders:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
    }
  }

  const generateMockOrders = () => {
    // This function is no longer needed since we're using real data
    // Remove this function and just set empty array
    setOrders([])
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatusValue) => {
    try {
      const currentOrder = orders.find((order) => order.id === orderId)
      if (!currentOrder) return

      if (!canTransition(currentOrder.status, newStatus)) {
        toast.error('Invalid Transition', `${statusLabel(currentOrder.status)} cannot move to ${statusLabel(newStatus)}`)
        return
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': userRole
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        ))
        toast.success('Status Updated', `Order status updated to ${statusLabel(newStatus)}`)
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Error', 'Failed to update order status')
    }
  }

  const updateOrderRider = async (orderId: string, riderType: 'pickup' | 'delivery', riderId: string | null) => {
    try {
      const updateData: any = {}
      
      if (riderType === 'pickup') {
        updateData.pickupRiderId = riderId
      } else {
        updateData.deliveryRiderId = riderId
      }
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': userRole
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the order in state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? {
                  ...order,
                  pickupRider: data.order.pickupRider,
                  deliveryRider: data.order.deliveryRider
                }
              : order
          )
        )
        
        toast.success('Success', `${riderType === 'pickup' ? 'Pickup' : 'Delivery'} rider ${riderId ? 'assigned' : 'removed'} successfully`)
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to update rider assignment')
      }
    } catch (error) {
      console.error('Error updating rider assignment:', error)
      toast.error('Network Error', 'Unable to update rider assignment. Please try again.')
    }
  }

  const getStatusColor = (status: OrderStatusValue) => {
    return statusColorMap[status] || '#6b7280'
  }

  const getStatusLabel = (status: OrderStatusValue) => {
    return statusLabel(status)
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
      <div style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Order Management
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Manage all store orders, update statuses, and track progress
          </p>
        </div>

        {/* Filters and Search */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Orders</option>
                {orderStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Search Orders
              </label>
              <input
                type="text"
                placeholder="Search by order number, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
        </div>

        {/* Orders Count */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        {/* Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
                {searchTerm || selectedStatus !== 'all' ? 'No orders match your filters' : 'No orders found'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                riders={riders}
                onStatusUpdate={updateOrderStatus}
                onRiderUpdate={updateOrderRider}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            ))
          )}
        </div>
      </div>
    </StoreAdminLayout>
  )
}

interface OrderCardProps {
  order: Order
  riders: Rider[]
  onStatusUpdate: (orderId: string, newStatus: OrderStatusValue) => void
  onRiderUpdate: (orderId: string, riderType: 'pickup' | 'delivery', riderId: string | null) => void
  getStatusColor: (status: OrderStatusValue) => string
  getStatusLabel: (status: OrderStatusValue) => string
}

function OrderCard({ order, riders, onStatusUpdate, onRiderUpdate, getStatusColor, getStatusLabel }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const statusOptions = [order.status, ...orderStatuses
    .filter((status) => status.value !== order.status && canTransition(order.status, status.value))
    .map((status) => status.value)]

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #f3f4f6'
    }}>
      {/* Order Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              #{order.orderNumber}
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
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Customer:</strong> {order.customerName}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Phone:</strong> {order.customerPhone}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Total:</strong> ₹{order.total}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Payment:</strong> {order.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href={`/admin/orders/${order.id}`}
            style={{
              fontSize: '0.75rem',
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            View Details
          </Link>

          <select
            value={order.status}
            onChange={(e) => onStatusUpdate(order.id, e.target.value as OrderStatusValue)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.75rem',
              backgroundColor: 'white',
              minWidth: '140px'
            }}
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>

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
                  <span>{item.quantity}x {item.itemType}</span>
                  <span>₹{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Important Dates
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Order Date: </span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
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
              <div>
                <span style={{ color: '#6b7280' }}>Last Updated: </span>
                <span>{new Date(order.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rider Assignments */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              Rider Assignments
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Pickup Rider */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.25rem' 
                }}>
                  Pickup Rider
                </label>
                <select
                  value={order.pickupRider?.id || ''}
                  onChange={(e) => onRiderUpdate(order.id, 'pickup', e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select pickup rider...</option>
                  {riders.map(rider => (
                    <option key={rider.id} value={rider.id}>
                      {rider.firstName} {rider.lastName} ({rider.phone})
                    </option>
                  ))}
                </select>
                {order.pickupRider && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Current: {order.pickupRider.firstName} {order.pickupRider.lastName}
                  </div>
                )}
              </div>

              {/* Delivery Rider */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.25rem' 
                }}>
                  Delivery Rider
                </label>
                <select
                  value={order.deliveryRider?.id || ''}
                  onChange={(e) => onRiderUpdate(order.id, 'delivery', e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select delivery rider...</option>
                  {riders.map(rider => (
                    <option key={rider.id} value={rider.id}>
                      {rider.firstName} {rider.lastName} ({rider.phone})
                    </option>
                  ))}
                </select>
                {order.deliveryRider && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Current: {order.deliveryRider.firstName} {order.deliveryRider.lastName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
