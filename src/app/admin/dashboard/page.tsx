"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import StoreAdminLayout from '@/components/StoreAdminLayout'

interface StoreInfo {
  id: string
  name: string
  city: string
  state: string
  franchiseName: string
}

interface DashboardStats {
  todaysOrders: number
  pendingPickups: number
  readyForDelivery: number
  totalCustomers: number
  monthlyRevenue: number
  activeRiders: number
}

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  todaysOrders: 0,
  pendingPickups: 0,
  readyForDelivery: 0,
  totalCustomers: 0,
  monthlyRevenue: 0,
  activeRiders: 0
}

export default function AdminDashboard() {
  const router = useRouter()
  const toast = useToast()
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [activeStoreId, setActiveStoreId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const role = localStorage.getItem('userRole')
    const storeId = localStorage.getItem('storeId')
    const email = localStorage.getItem('userEmail')
    
    // Check for valid store admin role
    if (role !== 'STORE_ADMIN' && role !== 'store-admin') {
      return router.push('/admin/login')
    }

    if (!storeId) {
      toast.error('Error', 'No store selected. Please login again.')
      return router.push('/admin/login')
    }

    setUserRole(role)
    setUserEmail(email || '')
    setActiveStoreId(storeId)

    // Get user name from custom auth event or localStorage
    const handleAuthUpdate = (e: CustomEvent) => {
      if (e.detail?.name) {
        setUserName(e.detail.name)
      }
      if (e.detail?.storeName) {
        setStoreInfo(prev => prev ? { ...prev, name: e.detail.storeName } : null)
      }
    }

    window.addEventListener('auth:session', handleAuthUpdate as EventListener)

    // Fetch store information and stats
    Promise.all([
      fetchStoreInfo(storeId),
      fetchDashboardStats(storeId)
    ]).finally(() => setLoading(false))

    return () => {
      window.removeEventListener('auth:session', handleAuthUpdate as EventListener)
    }
  }, [router, toast])

  const fetchStoreInfo = async (storeId: string) => {
    try {
      const response = await fetch(`/api/public/stores`)
      if (response.ok) {
        const stores = await response.json()
        const store = stores.find((s: any) => s.id === storeId)
        if (store) {
          setStoreInfo({
            id: store.id,
            name: store.name,
            city: store.city,
            state: store.state,
            franchiseName: store.franchise?.name || 'N/A'
          })
        } else {
          toast.error('Error', 'Store information not found.')
        }
      }
    } catch (error) {
      console.error('Error fetching store info:', error)
      toast.error('Error', 'Failed to load store information.')
    }
  }

  const fetchDashboardStats = async (storeId: string) => {
    try {
      const response = await fetch(`/api/admin/store-analytics?storeId=${storeId}`, {
        headers: {
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        setStats(EMPTY_DASHBOARD_STATS)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats(EMPTY_DASHBOARD_STATS)
    }
  }

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('storeId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    
    // Dispatch event to notify Header component
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    
    toast.success('Signed Out', 'You have been successfully signed out.')
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
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
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <StoreAdminLayout
      userRole={userRole}
      userName={userName || 'Store Admin'}
      userEmail={userEmail}
      storeName={storeInfo?.name}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Dashboard Overview
          </h1>
          
          {storeInfo && (
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              {storeInfo.name} • {storeInfo.city}, {storeInfo.state} • {storeInfo.franchiseName} Franchise
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <StatCard
            title="Today's Orders"
            value={stats.todaysOrders.toString()}
            change="Compared to yesterday"
            color="#3b82f6"
            icon={<OrdersIcon />}
          />
          <StatCard
            title="Pending Pickups"
            value={stats.pendingPickups.toString()}
            change={`${stats.pendingPickups} customers waiting`}
            color="#f59e0b"
            icon={<PickupIcon />}
          />
          <StatCard
            title="Ready for Delivery"
            value={stats.readyForDelivery.toString()}
            change={`${stats.readyForDelivery} orders ready`}
            color="#10b981"
            icon={<DeliveryIcon />}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers.toString()}
            change="Customer base for this store"
            color="#8b5cf6"
            icon={<CustomersIcon />}
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
            change={`Target: ₹${(stats.monthlyRevenue * 1.2).toLocaleString()}`}
            color="#ef4444"
            icon={<RevenueIcon />}
          />
          <StatCard
            title="Active Riders"
            value={stats.activeRiders.toString()}
            change={`${stats.activeRiders} riders on duty`}
            color="#06b6d4"
            icon={<RiderIcon />}
          />
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Quick Actions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <QuickActionCard
              title="New Order"
              description="Create walk-in customer order"
              href="/admin/orders/new"
              icon={<PlusIcon />}
              color="#10b981"
            />
            <QuickActionCard
              title="Schedule Pickup"
              description="Arrange customer pickup"
              href="/admin/pickups/new"
              icon={<PickupIcon />}
              color="#3b82f6"
            />
            <QuickActionCard
              title="Assign Rider"
              description="Assign delivery to rider"
              href="/admin/riders/assign"
              icon={<RiderIcon />}
              color="#f59e0b"
            />
            <QuickActionCard
              title="View All Orders"
              description="Manage all store orders"
              href="/admin/orders"
              icon={<OrdersIcon />}
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity storeId={activeStoreId} />
      </div>
    </StoreAdminLayout>
  )
}

// Utility Components
interface StatCardProps {
  title: string
  value: string
  change: string
  color: string
  icon: React.ReactNode
}

function StatCard({ title, value, change, color, icon }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #f3f4f6'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ color: color, opacity: 0.8 }}>
          {icon}
        </div>
        <div style={{ 
          backgroundColor: color + '15', 
          color: color, 
          padding: '0.25rem 0.5rem', 
          borderRadius: '9999px', 
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          Live
        </div>
      </div>
      <h3 style={{ 
        fontSize: '0.875rem', 
        color: '#6b7280', 
        marginBottom: '0.5rem',
        fontWeight: '500'
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '2rem', 
        fontWeight: '700', 
        color: '#111827',
        marginBottom: '0.5rem'
      }}>
        {value}
      </p>
      <p style={{ 
        fontSize: '0.75rem', 
        color: '#6b7280'
      }}>
        {change}
      </p>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

function QuickActionCard({ title, description, href, icon, color }: QuickActionCardProps) {
  const router = useRouter()
  const toast = useToast()
  
  const handleClick = () => {
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.backgroundColor = color + '05'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.backgroundColor = 'white'
      }}
    >
      <div style={{ color: color, flexShrink: 0, marginTop: '0.25rem' }}>
        {icon}
      </div>
      <div>
        <h4 style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          color: '#111827',
          marginBottom: '0.25rem'
        }}>
          {title}
        </h4>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280'
        }}>
          {description}
        </p>
      </div>
    </button>
  )
}

interface ActivityRecord {
  id: string
  type: string
  description: string
  createdAt: string
}

function formatTimeAgo(input: string) {
  const now = Date.now()
  const then = new Date(input).getTime()
  const diffMs = Math.max(0, now - then)
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function statusForActivityType(type: string): 'completed' | 'in-progress' | 'warning' | 'info' {
  switch (type) {
    case 'ORDER_COMPLETED':
    case 'PAYMENT_RECEIVED':
      return 'completed'
    case 'ORDER_PLACED':
    case 'RIDER_STATUS_UPDATE':
      return 'in-progress'
    case 'REFERRAL_REWARDED':
      return 'warning'
    default:
      return 'info'
  }
}

function RecentActivity({ storeId }: { storeId: string }) {
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const fetchRecentActivity = async () => {
      if (!storeId) {
        if (isActive) {
          setActivities([])
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetch(`/api/admin/activities?limit=10&storeId=${encodeURIComponent(storeId)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch recent activity')
        }

        const payload = await response.json()
        if (isActive) {
          setActivities(Array.isArray(payload.activities) ? payload.activities : [])
        }
      } catch (error) {
        console.error('Failed to fetch store recent activity:', error)
        if (isActive) {
          setActivities([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchRecentActivity()
    return () => {
      isActive = false
    }
  }, [storeId])

  return (
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
        Recent Activity
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && (
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading activity...</div>
        )}
        {!loading && activities.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No recent activity found for this store.</div>
        )}
        {!loading && activities.map((activity) => (
          <div 
            key={activity.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #f3f4f6'
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusForActivityType(activity.type) === 'completed' ? '#10b981' : 
                            statusForActivityType(activity.type) === 'in-progress' ? '#f59e0b' : 
                            statusForActivityType(activity.type) === 'warning' ? '#ef4444' : '#3b82f6',
              marginRight: '0.75rem',
              flexShrink: 0
            }} />
            
            <div style={{ flex: 1 }}>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                {activity.description}
              </p>
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280'
              }}>
                {formatTimeAgo(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Icon Components
function OrdersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PickupIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DeliveryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="3" width="15" height="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m16 8 4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CustomersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RiderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
