"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'
import Link from 'next/link'

interface DashboardStats {
  activeOrders: number
  totalOrders: number
  loyaltyPoints: number
  walletBalance: number
  nextPickup?: string
  nextDelivery?: string
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  itemsCount: number
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    totalOrders: 0,
    loyaltyPoints: 0,
    walletBalance: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Customer'
    setUserEmail(email)
    setUserName(name)
    
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/customer/dashboard-stats', {
        headers: {
        }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // Fetch recent orders
      const ordersResponse = await fetch('/api/customer/recent-orders', {
        headers: {
        }
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setRecentOrders(ordersData.orders)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error', 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b'
      case 'confirmed': return '#3b82f6'
      case 'in_progress': return '#8b5cf6'
      case 'ready_for_pickup': return '#10b981'
      case 'delivered': return '#059669'
      case 'completed': return '#6b7280'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  if (loading) {
    return (
      <CustomerDashboardLayout currentPage="dashboard" userEmail={userEmail} userName={userName}>
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
            <p style={{ color: '#6b7280' }}>Loading dashboard...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout currentPage="dashboard" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Welcome back, {userName}! 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
            Here's what's happening with your laundry services
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Active Orders
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                  {stats.activeOrders}
                </p>
              </div>
              <div style={{ fontSize: '2rem' }}>📦</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Total Orders
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                  {stats.totalOrders}
                </p>
              </div>
              <div style={{ fontSize: '2rem' }}>📋</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Loyalty Points
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                  {stats.loyaltyPoints}
                </p>
              </div>
              <div style={{ fontSize: '2rem' }}>⭐</div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Wallet Balance
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                  ₹{stats.walletBalance}
                </p>
              </div>
              <div style={{ fontSize: '2rem' }}>💳</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f3f4f6',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '1rem'
          }}>
            Quick Actions
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <Link 
              href="/book-service"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'transform 0.2s'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>➕</span>
              <span>Book New Service</span>
            </Link>

            <Link 
              href="/customer/orders"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                backgroundColor: '#059669',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>📦</span>
              <span>View My Orders</span>
            </Link>

            <Link 
              href="/customer/addresses"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <span>Manage Addresses</span>
            </Link>

            <Link 
              href="/customer/loyalty"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <span>View Rewards</span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f3f4f6'
        }}>
          <div style={{ 
            padding: '1.5rem',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827'
            }}>
              Recent Orders
            </h2>
            <Link 
              href="/customer/orders"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              View All →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '1rem' }}>
                No orders yet
              </p>
              <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                Book your first laundry service to get started
              </p>
              <Link 
                href="/book-service"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Book Service Now
              </Link>
            </div>
          ) : (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentOrders.map((order) => (
                  <div 
                    key={order.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #f3f4f6'
                    }}
                  >
                    <div>
                      <p style={{ 
                        fontWeight: '600', 
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        {order.orderNumber}
                      </p>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: '#6b7280',
                        marginBottom: '0.25rem'
                      }}>
                        {order.itemsCount} items • ₹{order.totalAmount}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
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
                ))}
              </div>
            </div>
          )}
        </div>
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
