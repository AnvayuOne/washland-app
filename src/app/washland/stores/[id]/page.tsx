"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

interface Store {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  phone?: string
  franchise: {
    id: string
    name: string
  }
  admin?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
  }
}

export default function StoreViewEditPage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    managerFirstName: '',
    managerLastName: '',
    managerEmail: '',
    managerPhone: '',
    isActive: true
  })

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

    loadStore()
  }, [router, storeId])

  const loadStore = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/stores/${storeId}`)

      if (response.ok) {
        const data = await response.json()
        setStore(data)
        setFormData({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          phone: data.phone || '',
          managerFirstName: data.admin?.firstName || '',
          managerLastName: data.admin?.lastName || '',
          managerEmail: data.admin?.email || '',
          managerPhone: data.admin?.phone || '',
          isActive: data.isActive ?? true
        })
      } else {
        console.error('Failed to load store')
        router.push('/washland/stores')
      }
    } catch (error) {
      console.error('Error loading store:', error)
      router.push('/washland/stores')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.address.trim() || !formData.city.trim()) {
      alert('Store name, address, and city are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zipCode: formData.zipCode.trim(),
          phone: formData.phone.trim() || undefined,
          managerFirstName: formData.managerFirstName.trim() || undefined,
          managerLastName: formData.managerLastName.trim() || undefined,
          managerEmail: formData.managerEmail.trim() || undefined,
          managerPhone: formData.managerPhone.trim() || undefined,
          isActive: formData.isActive
        })
      })

      if (response.ok) {
        await loadStore() // Refresh data
        setEditing(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update store')
      }
    } catch (error) {
      console.error('Error updating store:', error)
      alert('Failed to update store')
    } finally {
      setSaving(false)
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
            Loading store details...
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!store) {
    return (
      <DashboardLayout
        userRole={userRole}
        userName="Washland Admin"
        userEmail={userEmail}
        onSignOut={handleSignOut}
      >
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Store not found
        </div>
      </DashboardLayout>
    )
  }

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
                href="/washland/stores"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Stores
              </Link>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              {editing ? 'Edit Store' : store.name}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              {editing ? 'Update store information and manager details' : 'Store details and management'}
            </p>
          </div>

          {!editing && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setEditing(true)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <EditIcon />
                Edit Store
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {!editing && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <StatCard
              title="Total Orders"
              value={store._count.orders.toString()}
              subtitle="Orders processed"
              color="#10b981"
            />
            <StatCard
              title="Franchise"
              value={store.franchise.name}
              subtitle="Parent franchise"
              color="#3b82f6"
            />
            <StatCard
              title="Status"
              value={store.isActive ? "Active" : "Inactive"}
              subtitle="Store status"
              color={store.isActive ? "#10b981" : "#ef4444"}
            />
            <StatCard
              title="Location"
              value={`${store.city}, ${store.state}`}
              subtitle="Store location"
              color="#8b5cf6"
            />
          </div>
        )}

        {/* Store Details/Edit Form */}
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
              {editing ? 'Edit Store Details' : 'Store Information'}
            </h3>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Store Name */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    htmlFor="name"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Store Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    htmlFor="address"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label
                    htmlFor="city"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* State */}
                <div>
                  <label
                    htmlFor="state"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* ZIP Code */}
                <div>
                  <label
                    htmlFor="zipCode"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>



                {/* Manager Details */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '1rem'
                  }}>
                    Store Manager
                  </h4>
                </div>

                {/* Manager First Name */}
                <div>
                  <label
                    htmlFor="managerFirstName"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="managerFirstName"
                    name="managerFirstName"
                    value={formData.managerFirstName}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Manager Last Name */}
                <div>
                  <label
                    htmlFor="managerLastName"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="managerLastName"
                    name="managerLastName"
                    value={formData.managerLastName}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Manager Email */}
                <div>
                  <label
                    htmlFor="managerEmail"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="managerEmail"
                    name="managerEmail"
                    value={formData.managerEmail}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Manager Phone */}
                <div>
                  <label
                    htmlFor="managerPhone"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="managerPhone"
                    name="managerPhone"
                    value={formData.managerPhone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Active Status */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      style={{
                        width: '1rem',
                        height: '1rem',
                        accentColor: '#3b82f6'
                      }}
                    />
                    Store is active
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {saving ? (
                    <>
                      <LoadingIcon />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon />
                      Save Changes
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    loadStore() // Reset form data
                  }}
                  style={{
                    backgroundColor: 'white',
                    color: '#6b7280',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CancelIcon />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Store Name
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.name}
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
                      backgroundColor: store.isActive ? '#dcfce7' : '#fee2e2',
                      color: store.isActive ? '#166534' : '#991b1b'
                    }}>
                      {store.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Address
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.address}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    City
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.city}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    State
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.state || 'N/A'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    ZIP Code
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.zipCode || 'N/A'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Phone
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {store.phone || 'N/A'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Franchise
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    <Link
                      href={`/washland/franchises/${store.franchise.id}`}
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {store.franchise.name}
                    </Link>
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Created
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {new Date(store.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Last Updated
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {new Date(store.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Store Manager */}
              {store.admin && (
                <>
                  <div style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '1.5rem',
                    marginTop: '1.5rem'
                  }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '1rem'
                    }}>
                      Store Manager
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        Name
                      </label>
                      <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                        {store.admin.firstName} {store.admin.lastName}
                      </p>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        Email
                      </label>
                      <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                        {store.admin.email}
                      </p>
                    </div>

                    {store.admin.phone && (
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                          Phone
                        </label>
                        <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                          {store.admin.phone}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
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
}

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: `1px solid ${color}20`
    }}>
      <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
        {title}
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

// Icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17,21 17,13 7,13 7,21"/>
    <polyline points="7,3 7,8 15,8"/>
  </svg>
)

const CancelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
)