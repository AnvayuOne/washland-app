"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

interface Franchise {
  id: string
  name: string
}

interface Store {
  id: string
  name: string
  franchise: {
    name: string
  }
}

export default function NewUserPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [stores, setStores] = useState<Store[]>([])

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'STORE_ADMIN' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN' | 'RIDER',
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

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      // Load franchises for franchise admin assignment
      const franchisesResponse = await fetch('/api/admin/franchises')
      if (franchisesResponse.ok) {
        const franchisesData = await franchisesResponse.json()
        setFranchises(franchisesData)
      }

      // Load stores for store admin assignment
      const storesResponse = await fetch('/api/admin/stores')
      if (storesResponse.ok) {
        const storesData = await storesResponse.json()
        setStores(storesData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          franchiseId: formData.role === 'FRANCHISE_ADMIN' ? formData.franchiseId : undefined,
          storeId: formData.role === 'STORE_ADMIN' ? formData.storeId : undefined
        })
      })

      if (response.ok) {
        router.push('/washland/users')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user')
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

  if (!ready) return null

  return (
    <DashboardLayout
      userRole={userRole}
      userName="Washland Admin"
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
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
            Add New User
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Create a new user account with appropriate role and permissions
          </p>
        </div>

        {/* Form */}
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
              User Information
            </h3>
          </div>

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
                    Assign to Franchise
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
                    {franchises.map(franchise => (
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
                    Assign to Store
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
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name} - {store.franchise.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    Create User
                  </>
                )}
              </button>

              <Link
                href="/washland/users"
                style={{
                  backgroundColor: 'white',
                  color: '#6b7280',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CancelIcon />
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Icons
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
