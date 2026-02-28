"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
}

export default function CustomerProfilePage() {
  const router = useRouter()
  const toast = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  
  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Customer'
    setUserEmail(email)
    setUserName(name)
    
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/customer/profile', {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setFirstName(data.profile.firstName)
        setLastName(data.profile.lastName)
        setPhone(data.profile.phone || '')
      } else {
        toast.error('Error', 'Failed to fetch profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Error', 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone
        })
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        toast.success('Success', 'Profile updated successfully')
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Error', 'New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Error', 'New password must be at least 6 characters')
      return
    }

    setSaving(true)

    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const response = await fetch('/api/customer/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      if (response.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        toast.success('Success', 'Password changed successfully')
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Error', 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CustomerDashboardLayout currentPage="profile" userEmail={userEmail} userName={userName}>
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
            <p style={{ color: '#6b7280' }}>Loading profile...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout currentPage="profile" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            My Profile
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage your personal information and account settings
          </p>
        </div>

        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Profile Information */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Personal Information
            </h2>

            <form onSubmit={updateProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.5rem' 
                  }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.5rem' 
                  }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Change Password
            </h2>

            <form onSubmit={changePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.5rem' 
                  }}>
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.5rem' 
                  }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: saving ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Account Information */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Account Information
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Account Type:</span>
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Customer</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Member Since:</span>
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Customer ID:</span>
                <span style={{ fontWeight: '500', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  {profile?.id || 'N/A'}
                </span>
              </div>
            </div>
          </div>
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
