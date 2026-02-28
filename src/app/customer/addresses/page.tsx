"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface Address {
  id: string
  type: 'HOME' | 'WORK' | 'OTHER'
  address: string
  landmark?: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
  createdAt: string
}

export default function CustomerAddressesPage() {
  const router = useRouter()
  const toast = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  
  // Form fields
  const [type, setType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Customer'
    setUserEmail(email)
    setUserName(name)
    
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/customer/addresses', {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses)
      } else {
        toast.error('Error', 'Failed to fetch addresses')
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
      toast.error('Error', 'Failed to fetch addresses')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setType('HOME')
    setAddress('')
    setLandmark('')
    setCity('')
    setState('')
    setPincode('')
    setIsDefault(false)
    setEditingAddress(null)
    setShowAddForm(false)
  }

  const handleEdit = (addr: Address) => {
    setEditingAddress(addr)
    setType(addr.type)
    setAddress(addr.address)
    setLandmark(addr.landmark || '')
    setCity(addr.city)
    setState(addr.state)
    setPincode(addr.pincode)
    setIsDefault(addr.isDefault)
    setShowAddForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const payload = {
        type,
        address: address.trim(),
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault
      }

      const url = editingAddress 
        ? `/api/customer/addresses/${editingAddress.id}`
        : '/api/customer/addresses'
      
      const method = editingAddress ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Success', editingAddress ? 'Address updated successfully' : 'Address added successfully')
        resetForm()
        fetchAddresses()
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to save address')
      }
    } catch (error) {
      console.error('Error saving address:', error)
      toast.error('Error', 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return
    }

    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
        }
      })

      if (response.ok) {
        toast.success('Success', 'Address deleted successfully')
        fetchAddresses()
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to delete address')
      }
    } catch (error) {
      console.error('Error deleting address:', error)
      toast.error('Error', 'Failed to delete address')
    }
  }

  const setAsDefault = async (addressId: string) => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const response = await fetch(`/api/customer/addresses/${addressId}/set-default`, {
        method: 'PUT',
        headers: {
        }
      })

      if (response.ok) {
        toast.success('Success', 'Default address updated')
        fetchAddresses()
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to set default address')
      }
    } catch (error) {
      console.error('Error setting default address:', error)
      toast.error('Error', 'Failed to set default address')
    }
  }

  if (loading) {
    return (
      <CustomerDashboardLayout currentPage="addresses" userEmail={userEmail} userName={userName}>
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
            <p style={{ color: '#6b7280' }}>Loading addresses...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout currentPage="addresses" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              My Addresses
            </h1>
            <p style={{ color: '#6b7280' }}>
              Manage your delivery addresses
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>+</span>
            Add Address
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem' 
            }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#111827'
              }}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={resetForm}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Address Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'HOME' | 'WORK' | 'OTHER')}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Full Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  placeholder="House/Flat number, Building name, Street, Area"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#374151', 
                  marginBottom: '0.5rem' 
                }}>
                  Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near metro station, hospital, etc."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.5rem' 
                  }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
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
                    State *
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
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
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                    pattern="[0-9]{6}"
                    placeholder="600001"
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    style={{ marginRight: '0.25rem' }}
                  />
                  Set as default address
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
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
                  {saving ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '3rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              No addresses added
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Add your first delivery address to get started
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Add Address
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {addresses.map((addr) => (
              <div
                key={addr.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: addr.isDefault ? '2px solid #3b82f6' : '1px solid #f3f4f6',
                  position: 'relative'
                }}
              >
                {addr.isDefault && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    Default
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      backgroundColor: addr.type === 'HOME' ? '#10b981' : addr.type === 'WORK' ? '#f59e0b' : '#8b5cf6',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {addr.type}
                    </span>
                  </div>

                  <p style={{ color: '#111827', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '0.5rem' }}>
                    {addr.address}
                  </p>
                  
                  {addr.landmark && (
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Near: {addr.landmark}
                    </p>
                  )}

                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEdit(addr)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      color: '#3b82f6',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>

                  {!addr.isDefault && (
                    <button
                      onClick={() => setAsDefault(addr.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#10b981',
                        border: '1px solid #10b981',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Set Default
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(addr.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
