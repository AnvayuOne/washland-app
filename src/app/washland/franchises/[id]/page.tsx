"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

interface Franchise {
  id: string
  name: string
  description?: string
  admin?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  stores: Array<{
    id: string
    name: string
    city: string
    state: string
    isActive: boolean
    _count?: {
      orders: number
    }
  }>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function FranchiseViewPage() {
  const router = useRouter()
  const params = useParams()
  const franchiseId = params.id as string

  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [franchise, setFranchise] = useState<Franchise | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const r = localStorage.getItem('userRole')
    const email = localStorage.getItem('userEmail')

    if (r !== 'SUPER_ADMIN') {
      router.push('/washland/login')
      return
    }

    setUserRole(r || '')
    setUserEmail(email || '')
    setReady(true)

    loadFranchise()
  }, [router, franchiseId])

  const loadFranchise = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/franchises/${franchiseId}`)

      if (response.ok) {
        const data = await response.json()
        setFranchise(data)
      } else {
        console.error('Failed to load franchise')
        router.push('/washland/franchises')
      }
    } catch (error) {
      console.error('Error loading franchise:', error)
      router.push('/washland/franchises')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  if (!ready || loading) {
    return (
      <DashboardLayout
        userRole={userRole}
        userName="Washland Admin"
        userEmail={userEmail}
        onSignOut={handleSignOut}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            Loading franchise details...
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!franchise) {
    return (
      <DashboardLayout
        userRole={userRole}
        userName="Washland Admin"
        userEmail={userEmail}
        onSignOut={handleSignOut}
      >
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Franchise not found
        </div>
      </DashboardLayout>
    )
  }

  const totalStores = franchise.stores.length
  const activeStores = franchise.stores.filter(s => s.isActive).length
  const totalOrders = franchise.stores.reduce((sum, store) => sum + (store._count?.orders || 0), 0)

  return (
    <DashboardLayout
      userRole={userRole}
      userName="Washland Admin"
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <Link
                href="/washland/franchises"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Franchises
              </Link>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              {franchise.name}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Franchise Details & Management
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              href={`/washland/franchises/${franchise.id}/edit`}
              style={{
                backgroundColor: '#3b82f6',
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
              <EditIcon />
              Edit Franchise
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <StatCard
            title="Total Stores"
            value={totalStores.toString()}
            subtitle="Locations in this franchise"
            color="#10b981"
            icon={<StoreIcon />}
          />
          <StatCard
            title="Active Stores"
            value={activeStores.toString()}
            subtitle="Currently operating"
            color="#3b82f6"
            icon={<CheckCircleIcon />}
          />
          <StatCard
            title="Total Orders"
            value={totalOrders.toString()}
            subtitle="Across all stores"
            color="#8b5cf6"
            icon={<OrderIcon />}
          />
          <StatCard
            title="Status"
            value={franchise.isActive ? "Active" : "Inactive"}
            subtitle="Franchise status"
            color={franchise.isActive ? "#10b981" : "#ef4444"}
            icon={<StatusIcon />}
          />
        </div>

        {/* Franchise Details */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Franchise Information
            </h3>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Franchise Name
                </label>
                <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                  {franchise.name}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Status
                </label>
                <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: franchise.isActive ? '#dcfce7' : '#fee2e2',
                    color: franchise.isActive ? '#166534' : '#991b1b'
                  }}>
                    {franchise.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Description
                </label>
                <p style={{
                  fontSize: '1rem',
                  color: '#111827',
                  marginTop: '0.25rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {franchise.description || 'No description provided'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Created
                </label>
                <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                  {new Date(franchise.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Last Updated
                </label>
                <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                  {new Date(franchise.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Franchise Admin */}
        {franchise.admin && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Franchise Administrator
              </h3>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Name
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {franchise.admin.firstName} {franchise.admin.lastName}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Email
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {franchise.admin.email}
                  </p>
                </div>

                {franchise.admin.phone && (
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                      Phone
                    </label>
                    <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                      {franchise.admin.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stores List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Stores ({totalStores})
            </h3>
            <Link
              href="/washland/stores/new"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <PlusIcon />
              Add Store
            </Link>
          </div>

          {franchise.stores.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No stores in this franchise yet.
              <Link
                href="/washland/stores/new"
                style={{ color: '#3b82f6', marginLeft: '0.5rem' }}
              >
                Add the first store
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Store Name</th>
                    <th style={tableHeaderStyle}>Location</th>
                    <th style={tableHeaderStyle}>Orders</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {franchise.stores.map((store) => (
                    <tr key={store.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {store.name}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ color: '#374151' }}>
                          {store.city}, {store.state}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {store._count?.orders || 0}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: store.isActive ? '#dcfce7' : '#fee2e2',
                          color: store.isActive ? '#166534' : '#991b1b'
                        }}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <Link
                          href={`/washland/stores/${store.id}`}
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          View Details
                        </Link>
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
interface StatCardProps {
  title: string
  value: string
  subtitle: string
  color: string
  icon: React.ReactNode
}

function StatCard({ title, value, subtitle, color, icon }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: `1px solid ${color}20`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          padding: '0.5rem',
          borderRadius: '6px',
          backgroundColor: `${color}1a`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: color }}>
        {subtitle}
      </div>
    </div>
  )
}

// Styles
const tableHeaderStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  borderBottom: '1px solid #e5e7eb'
}

const tableCellStyle = {
  padding: '1rem',
  fontSize: '0.875rem'
}

// Icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
)

const StoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2"/>
    <path d="M8 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8V5z"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="M9 11l3 3L22 4"/>
  </svg>
)

const OrderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 7h6m0 10v-3c0-1.1-.9-2-2-2H9a2 2 0 0 0-2 2v3m0 0V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10"/>
    <path d="M14 14v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3"/>
  </svg>
)

const StatusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6"/>
    <path d="M1 12h6m6 0h6"/>
  </svg>
);
