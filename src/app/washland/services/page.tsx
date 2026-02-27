"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string
  // Support both legacy and new structure
  category: string
  serviceCategory?: {
    name: string
  }
  basePrice: number
  isActive: boolean
  createdAt: string
  _count: {
    orderItems: number
  }
}

interface Category {
  id: string
  name: string
}

export default function ServicesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

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
      fetchData()
    }
  }, [ready, selectedCategory])

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch Categories
      const catRes = await fetch('/api/admin/services/categories')
      const catData = await catRes.json()
      if (catData.success) {
        setCategories(catData.categories)
      }

      // Fetch Services
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''
      const response = await fetch(`/api/admin/services${params}`)
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleServiceStatus = async (serviceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (response.ok) {
        fetchData() // Refresh the list
      } else {
        alert('Failed to update service status')
      }
    } catch (error) {
      alert('Error updating service status')
    }
  }

  if (!ready) return null

  const totalServices = services.length
  const activeServices = services.filter(s => s.isActive).length
  const totalOrders = services.reduce((sum, s) => sum + s._count.orderItems, 0)

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
                Service Management
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Manage laundry services, pricing, and categories
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link
                href="/washland/services/categories"
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Manage Categories
              </Link>
              <Link
                href="/washland/services/new"
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
                Add New Service
              </Link>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Filter by Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatsCard
              title="Total Services"
              value={totalServices.toString()}
              icon={<ServiceIcon />}
              color="#3b82f6"
            />
            <StatsCard
              title="Active Services"
              value={activeServices.toString()}
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

        {/* Services Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              Services ({totalServices})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No services found.
              <Link href="/washland/services/new" style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                Add your first service
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Service Name</th>
                    <th style={tableHeaderStyle}>Category</th>
                    <th style={tableHeaderStyle}>Base Price</th>
                    <th style={tableHeaderStyle}>Orders</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Created</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>{service.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {service.description}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3'
                        }}>
                          {service.serviceCategory?.name || service.category}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          ₹{service.basePrice}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {service._count.orderItems}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: service.isActive ? '#d1fae5' : '#fee2e2',
                          color: service.isActive ? '#065f46' : '#991b1b'
                        }}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {new Date(service.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link
                            href={`/washland/services/${service.id}`}
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
                          <button
                            onClick={() => toggleServiceStatus(service.id, !service.isActive)}
                            style={{
                              color: service.isActive ? '#ef4444' : '#10b981',
                              background: 'none',
                              border: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            {service.isActive ? 'Deactivate' : 'Activate'}
                          </button>
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
      justifyContent: 'center',
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
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

const ServiceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M9 11l3 3L22 4" />
  </svg>
)

const ShoppingBagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)