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
  pickupDate?: string
  deliveryDate?: string
  pickupRider?: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
  deliveryRider?: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
  items: Array<{
    service: { name: string }
    quantity: number
  }>
}

interface Rider {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  isAvailable: boolean
}

interface Assignment {
  orderId: string
  riderType: 'pickup' | 'delivery'
  riderId: string
}

export default function RiderAssignmentPage() {
  const router = useRouter()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [storeId, setStoreId] = useState('')
  const [storeName, setStoreName] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

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

    Promise.all([
      fetchOrders(storeId),
      fetchRiders(storeId)
    ]).finally(() => setLoading(false))

    return () => {
      window.removeEventListener('auth:session', handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  useEffect(() => {
    // Filter orders based on status
    let filtered = orders

    if (filterStatus !== 'all') {
      if (filterStatus === 'needs-pickup') {
        filtered = filtered.filter(order =>
          (order.status === 'READY_FOR_PICKUP' || order.status === 'CONFIRMED') &&
          !order.pickupRider
        )
      } else if (filterStatus === 'needs-delivery') {
        filtered = filtered.filter(order =>
          order.status === 'READY_FOR_PICKUP' &&
          !order.deliveryRider
        )
      } else if (filterStatus === 'assigned') {
        filtered = filtered.filter(order =>
          order.pickupRider || order.deliveryRider
        )
      }
    }

    setFilteredOrders(filtered)
  }, [orders, filterStatus])

  const fetchOrders = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/orders?storeId=${storeId}&status=CONFIRMED,READY_FOR_PICKUP,IN_PROGRESS`, {
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
          pickupDate: order.pickupDate,
          deliveryDate: order.deliveryDate,
          pickupRider: order.pickupRider,
          deliveryRider: order.deliveryRider,
          items: order.items
        }))
        setOrders(transformedOrders)
      } else {
        console.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const fetchRiders = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/riders?storeId=${storeId}`, {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRiders(data.riders || [])
      } else {
        console.error('Failed to fetch riders')
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
    }
  }

  const handleAssignmentChange = (orderId: string, riderType: 'pickup' | 'delivery', riderId: string) => {
    setAssignments(prev => {
      const existing = prev.find(a => a.orderId === orderId && a.riderType === riderType)
      if (existing) {
        if (riderId) {
          return prev.map(a =>
            a.orderId === orderId && a.riderType === riderType
              ? { ...a, riderId }
              : a
          )
        } else {
          return prev.filter(a => !(a.orderId === orderId && a.riderType === riderType))
        }
      } else if (riderId) {
        return [...prev, { orderId, riderType, riderId }]
      }
      return prev
    })
  }

  const handleBulkAssign = async () => {
    if (assignments.length === 0) {
      toast.error('No Assignments', 'Please select riders to assign first.')
      return
    }

    setSubmitting(true)

    try {
      const results = await Promise.allSettled(
        assignments.map(assignment =>
          fetch(`/api/admin/orders/${assignment.orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              [assignment.riderType === 'pickup' ? 'pickupRiderId' : 'deliveryRiderId']: assignment.riderId
            })
          })
        )
      )

      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      if (successful > 0) {
        toast.success('Assignments Complete', `Successfully assigned ${successful} rider${successful > 1 ? 's' : ''}.`)
        if (failed > 0) {
          toast.warning('Partial Success', `${failed} assignment${failed > 1 ? 's' : ''} failed.`)
        }
        // Refresh orders and clear assignments
        await fetchOrders(storeId)
        setAssignments([])
      } else {
        toast.error('Assignment Failed', 'All rider assignments failed. Please try again.')
      }
    } catch (error) {
      console.error('Error assigning riders:', error)
      toast.error('Error', 'Failed to assign riders')
    } finally {
      setSubmitting(false)
    }
  }

  const getRiderName = (rider?: { firstName: string; lastName: string }) => {
    return rider ? `${rider.firstName} ${rider.lastName}` : 'Not Assigned'
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
            <p style={{ color: '#6b7280' }}>Loading orders and riders...</p>
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
              Rider Assignment
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Assign pickup and delivery riders to orders
          </p>
        </div>

        {/* Filters and Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                Filter Orders:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Orders</option>
                <option value="needs-pickup">Needs Pickup Rider</option>
                <option value="needs-delivery">Needs Delivery Rider</option>
                <option value="assigned">Already Assigned</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleBulkAssign}
                disabled={assignments.length === 0 || submitting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: assignments.length === 0 || submitting ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: assignments.length === 0 || submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Assigning...' : 'Assign Selected Riders'}
              </button>
            </div>
          </div>
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
                No orders match the current filter
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderAssignmentCard
                key={order.id}
                order={order}
                riders={riders}
                assignments={assignments}
                onAssignmentChange={handleAssignmentChange}
                getRiderName={getRiderName}
              />
            ))
          )}
        </div>
      </div>
    </StoreAdminLayout>
  )
}

interface OrderAssignmentCardProps {
  order: Order
  riders: Rider[]
  assignments: Assignment[]
  onAssignmentChange: (orderId: string, riderType: 'pickup' | 'delivery', riderId: string) => void
  getRiderName: (rider?: { firstName: string; lastName: string }) => string
}

function OrderAssignmentCard({
  order,
  riders,
  assignments,
  onAssignmentChange,
  getRiderName
}: OrderAssignmentCardProps) {
  const getCurrentAssignment = (riderType: 'pickup' | 'delivery') => {
    return assignments.find(a => a.orderId === order.id && a.riderType === riderType)?.riderId || ''
  }

  const needsPickup = (order.status === 'READY_FOR_PICKUP' || order.status === 'CONFIRMED') && !order.pickupRider
  const needsDelivery = order.status === 'READY_FOR_PICKUP' && !order.deliveryRider

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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              #{order.orderNumber}
            </h3>
            <div style={{
              backgroundColor: '#e5e7eb',
              color: '#374151',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {order.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Customer:</strong> {order.customerName}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <strong>Items:</strong> {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
            {order.pickupDate && (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>Pickup:</strong> {new Date(order.pickupDate).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rider Assignments */}
      <div style={{
        borderTop: '1px solid #f3f4f6',
        paddingTop: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {/* Pickup Rider */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Pickup Rider
            {needsPickup && (
              <span style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: '500',
                marginLeft: '0.5rem'
              }}>
                (Needed)
              </span>
            )}
          </label>
          <select
            value={getCurrentAssignment('pickup') || order.pickupRider?.id || ''}
            onChange={(e) => onAssignmentChange(order.id, 'pickup', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="">
              {order.pickupRider ? getRiderName(order.pickupRider) : 'Select pickup rider...'}
            </option>
            {riders.map(rider => (
              <option key={rider.id} value={rider.id} disabled={!rider.isAvailable}>
                {rider.firstName} {rider.lastName} ({rider.phone}){!rider.isAvailable ? ' - Unavailable' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Rider */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Delivery Rider
            {needsDelivery && (
              <span style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: '500',
                marginLeft: '0.5rem'
              }}>
                (Needed)
              </span>
            )}
          </label>
          <select
            value={getCurrentAssignment('delivery') || order.deliveryRider?.id || ''}
            onChange={(e) => onAssignmentChange(order.id, 'delivery', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="">
              {order.deliveryRider ? getRiderName(order.deliveryRider) : 'Select delivery rider...'}
            </option>
            {riders.map(rider => (
              <option key={rider.id} value={rider.id} disabled={!rider.isAvailable}>
                {rider.firstName} {rider.lastName} ({rider.phone}){!rider.isAvailable ? ' - Unavailable' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
