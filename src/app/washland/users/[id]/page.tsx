"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: 'CUSTOMER' | 'STORE_ADMIN' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN' | 'RIDER'
  isActive: boolean
  createdAt: string
  updatedAt: string
  managedFranchises: Array<{
    id: string
    name: string
  }>
  managedStores: Array<{
    id: string
    name: string
    franchise: {
      name: string
    }
  }>
  _count: {
    orders: number
  }
}

export default function UserViewEditPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'CUSTOMER' as User['role'],
    isActive: true,
    franchiseId: '',
    storeId: ''
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

    loadUser()
  }, [router, userId])

  const loadUser = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)

      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'CUSTOMER',
          isActive: data.isActive ?? true,
          franchiseId: data.managedFranchises?.[0]?.id || '',
          storeId: data.managedStores?.[0]?.id || ''
        })
      } else {
        console.error('Failed to load user')
        router.push('/washland/users')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      router.push('/washland/users')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      alert('First name, last name, and email are required')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          isActive: formData.isActive,
          franchiseId: formData.role === 'FRANCHISE_ADMIN' ? formData.franchiseId : undefined,
          storeId: formData.role === 'STORE_ADMIN' ? formData.storeId : undefined
        })
      })

      if (response.ok) {
        await loadUser() // Refresh data
        setEditing(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
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

  const getRoleLabel = (role: User['role']) => {
    const labels = {
      CUSTOMER: 'Customer',
      STORE_ADMIN: 'Store Admin',
      FRANCHISE_ADMIN: 'Franchise Admin',
      SUPER_ADMIN: 'Super Admin',
      RIDER: 'Rider'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: User['role']) => {
    const colors = {
      CUSTOMER: '#6b7280',
      STORE_ADMIN: '#3b82f6',
      FRANCHISE_ADMIN: '#8b5cf6',
      SUPER_ADMIN: '#ef4444',
      RIDER: '#f59e0b'
    }
    return colors[role] || '#6b7280'
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
            Loading user details...
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout
        userRole={userRole}
        userName="Washland Admin"
        userEmail={userEmail}
        onSignOut={handleSignOut}
      >
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          User not found
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
                href="/washland/users"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Users
              </Link>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              {editing ? 'Edit User' : `${user.firstName} ${user.lastName}`}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              {editing ? 'Update user information and permissions' : 'User details and management'}
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
                Edit User
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
              value={user._count.orders.toString()}
              subtitle="Orders placed"
              color="#10b981"
            />
            <StatCard
              title="Role"
              value={getRoleLabel(user.role)}
              subtitle="User permissions"
              color={getRoleColor(user.role)}
            />
            <StatCard
              title="Status"
              value={user.isActive ? "Active" : "Inactive"}
              subtitle="Account status"
              color={user.isActive ? "#10b981" : "#ef4444"}
            />
            <StatCard
              title="Assignments"
              value={`${user.managedFranchises.length + user.managedStores.length}`}
              subtitle="Entities managed"
              color="#8b5cf6"
            />
          </div>
        )}

        {/* User Details/Edit Form */}
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
              {editing ? 'Edit User Details' : 'User Information'}
            </h3>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* First Name */}
                <div>
                  <label
                    htmlFor="firstName"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
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

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="lastName"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
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

                {/* Email */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
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
                    Phone Number
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

                {/* Role */}
                <div>
                  <label
                    htmlFor="role"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}
                  >
                    User Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
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
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="STORE_ADMIN">Store Admin</option>
                    <option value="FRANCHISE_ADMIN">Franchise Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="RIDER">Rider</option>
                  </select>
                </div>

                {/* Franchise Assignment (for Franchise Admins) */}
                {formData.role === 'FRANCHISE_ADMIN' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label
                      htmlFor="franchiseId"
                      style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}
                    >
                      Assigned Franchise
                    </label>
                    <select
                      id="franchiseId"
                      name="franchiseId"
                      value={formData.franchiseId}
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
                    >
                      <option value="">Select a franchise</option>
                      {/* This would need to be populated with actual franchises */}
                      {user.managedFranchises.map(franchise => (
                        <option key={franchise.id} value={franchise.id}>
                          {franchise.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Store Assignment (for Store Admins) */}
                {formData.role === 'STORE_ADMIN' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label
                      htmlFor="storeId"
                      style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}
                    >
                      Assigned Store
                    </label>
                    <select
                      id="storeId"
                      name="storeId"
                      value={formData.storeId}
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
                    >
                      <option value="">Select a store</option>
                      {/* This would need to be populated with actual stores */}
                      {user.managedStores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name} - {store.franchise.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    Account is active
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
                    loadUser() // Reset form data
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
                    Full Name
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {user.firstName} {user.lastName}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Email Address
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {user.email}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Phone Number
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {user.phone || 'Not provided'}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    User Role
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: `${getRoleColor(user.role)}20`,
                      color: getRoleColor(user.role)
                    }}>
                      {getRoleLabel(user.role)}
                    </span>
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Account Status
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: user.isActive ? '#dcfce7' : '#fee2e2',
                      color: user.isActive ? '#166534' : '#991b1b'
                    }}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Total Orders
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {user._count.orders}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Member Since
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Last Updated
                  </label>
                  <p style={{ fontSize: '1rem', color: '#111827', marginTop: '0.25rem' }}>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Assignments */}
              {(user.managedFranchises.length > 0 || user.managedStores.length > 0) && (
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
                      Assignments & Responsibilities
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {user.managedFranchises.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                          Managed Franchises
                        </label>
                        <div style={{ marginTop: '0.25rem' }}>
                          {user.managedFranchises.map(franchise => (
                            <div key={franchise.id} style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              {franchise.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.managedStores.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                          Managed Stores
                        </label>
                        <div style={{ marginTop: '0.25rem' }}>
                          {user.managedStores.map(store => (
                            <div key={store.id} style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              {store.name}
                              <span style={{ color: '#9ca3af' }}> • {store.franchise.name}</span>
                            </div>
                          ))}
                        </div>
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
