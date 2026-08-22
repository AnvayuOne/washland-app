"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { api } from '@/lib/api-client'
import Link from 'next/link'

interface Store {
  id: number
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  isActive: boolean
  createdAt: string
  franchise: {
    id: number
    name: string
  }
  admin?: {
    id: number
    firstName: string
    lastName: string
    email: string
  }
  _count: {
    orders: number
  }
}

interface Franchise {
  id: number
  name: string
}

export default function StoresPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all')

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
      fetchStores()
      fetchFranchises()
    }
  }, [ready, selectedFranchise])

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  const fetchStores = async () => {
    try {
      const response = await api.get('/api/admin/stores')
      if (response.ok) {
        const data = await response.json()
        setStores(data)
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFranchises = async () => {}

  if (!ready) return null

  const totalStores = stores.length
  const activeStores = stores.filter(s => s.isActive).length
  const totalOrders = stores.reduce((sum, s) => sum + s._count.orders, 0)

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
                Store Management
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Manage stores across all franchise locations
              </p>
            </div>
            
            <Link
              href="/washland/stores/new"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <PlusIcon />
              Add New Store
            </Link>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Filter by Franchise:
            </label>
            <select
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Franchises</option>
              {franchises.map(franchise => (
                <option key={franchise.id} value={franchise.id.toString()}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatsCard
              title="Total Stores"
              value={totalStores.toString()}
              icon={<BuildingIcon />}
              color="#3b82f6"
            />
            <StatsCard
              title="Active Stores"
              value={activeStores.toString()}
              icon={<CheckCircleIcon />}
              color="#10b981"
            />
            <StatsCard
              title="Total Orders"
              value={totalOrders.toString()}
              icon={<ShoppingBagIcon />}
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Stores Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              Stores ({totalStores})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Loading stores...
            </div>
          ) : stores.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No stores found. 
              <Link href="/washland/stores/new" style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                Add your first store
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Store Name</th>
                    <th style={tableHeaderStyle}>Franchise</th>
                    <th style={tableHeaderStyle}>Location</th>
                    <th style={tableHeaderStyle}>Manager</th>
                    <th style={tableHeaderStyle}>Orders</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>{store.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {store.phone}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ color: '#374151' }}>{store.franchise.name}</div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ color: '#374151' }}>
                          {store.city}, {store.state}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {store.pincode}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        {store.admin ? (
                          <div>
                            <div style={{ color: '#374151' }}>
                              {store.admin.firstName} {store.admin.lastName}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {store.admin.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No manager assigned</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {store._count.orders}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: store.isActive ? '#d1fae5' : '#fee2e2',
                          color: store.isActive ? '#065f46' : '#991b1b'
                        }}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link
                            href={`/washland/stores/${store.id}`}
                            style={{
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Edit
                          </Link>
                          <span style={{ color: '#d1d5db' }}>|</span>
                          <Link
                            href={`/washland/stores/${store.id}/orders`}
                            style={{
                              color: '#6b7280',
                              textDecoration: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Orders
                          </Link>
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
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
)

const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12h4v4H6z"/>
    <path d="M14 12h4v4h-4z"/>
    <path d="M6 20h4v2H6z"/>
    <path d="M14 20h4v2h-4z"/>
    <path d="M6 4h4v4H6z"/>
    <path d="M14 4h4v4h-4z"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="M9 11l3 3L22 4"/>
  </svg>
)

const ShoppingBagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)