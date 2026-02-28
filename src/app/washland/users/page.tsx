"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  isActive: boolean
  createdAt: string
  managedFranchises: Array<{
    id: string
    name: string
  }>
  managedStores: Array<{
    id: string
    name: string
    franchise: {
      id: string
      name: string
    }
  }>
  _count: {
    orders: number
  }
}

export default function UsersPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>('all')

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
      fetchUsers()
    }
  }, [ready, selectedRole])

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  const fetchUsers = async () => {
    try {
      const params = selectedRole !== 'all' ? `?role=${selectedRole}` : ''
      const response = await fetch(`/api/admin/users${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return null

  const totalUsers = users.length
  const adminUsers = users.filter(u => u.role !== 'CUSTOMER').length
  const activeUsers = users.filter(u => u.isActive).length

  const roleColorMap: Record<string, string> = {
    'SUPER_ADMIN': '#ef4444',
    'FRANCHISE_ADMIN': '#3b82f6',
    'STORE_ADMIN': '#10b981',
    'RIDER': '#f59e0b',
    'CUSTOMER': '#6b7280'
  }

  const roleLabelMap: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'FRANCHISE_ADMIN': 'Franchise Admin',
    'STORE_ADMIN': 'Store Admin',
    'RIDER': 'Rider',
    'CUSTOMER': 'Customer'
  }

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
                User Management
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Manage users across all roles and access levels
              </p>
            </div>
            
            <Link
              href="/washland/users/new"
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
              Add New User
            </Link>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Filter by Role:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="FRANCHISE_ADMIN">Franchise Admin</option>
              <option value="STORE_ADMIN">Store Admin</option>
              <option value="RIDER">Rider</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatsCard
              title="Total Users"
              value={totalUsers.toString()}
              icon={<UsersIcon />}
              color="#3b82f6"
            />
            <StatsCard
              title="Admin Users"
              value={adminUsers.toString()}
              icon={<ShieldIcon />}
              color="#10b981"
            />
            <StatsCard
              title="Active Users"
              value={activeUsers.toString()}
              icon={<CheckCircleIcon />}
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              Users ({totalUsers})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No users found. 
              <Link href="/washland/users/new" style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                Add your first user
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>User</th>
                    <th style={tableHeaderStyle}>Role</th>
                    <th style={tableHeaderStyle}>Assignment</th>
                    <th style={tableHeaderStyle}>Orders</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Joined</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {user.email}
                          </div>
                          {user.phone && (
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: `${roleColorMap[user.role]}1a`,
                          color: roleColorMap[user.role]
                        }}>
                          {roleLabelMap[user.role]}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {user.managedFranchises.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                              Franchise: {user.managedFranchises[0].name}
                            </div>
                          </div>
                        )}
                        {user.managedStores.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                              Store: {user.managedStores[0].name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {user.managedStores[0].franchise.name}
                            </div>
                          </div>
                        )}
                        {user.managedFranchises.length === 0 && user.managedStores.length === 0 && (
                          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No assignment</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {user._count.orders}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: user.isActive ? '#d1fae5' : '#fee2e2',
                          color: user.isActive ? '#065f46' : '#991b1b'
                        }}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link
                            href={`/washland/users/${user.id}`}
                            style={{
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Edit
                          </Link>
                          {user.role !== 'SUPER_ADMIN' && (
                            <>
                              <span style={{ color: '#d1d5db' }}>|</span>
                              <button
                                onClick={() => toggleUserStatus(user.id, !user.isActive)}
                                style={{
                                  color: user.isActive ? '#ef4444' : '#10b981',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  cursor: 'pointer'
                                }}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
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

  async function toggleUserStatus(userId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })
      
      if (response.ok) {
        fetchUsers() // Refresh the list
      } else {
        alert('Failed to update user status')
      }
    } catch (error) {
      alert('Error updating user status')
    }
  }
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

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="M9 11l3 3L22 4"/>
  </svg>
)
