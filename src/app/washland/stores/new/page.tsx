"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useToast } from '@/components/ToastProvider'
import { api } from '@/lib/api-client'
import Link from 'next/link'

interface Franchise {
  id: number
  name: string
}

export default function NewStorePage() {
  const router = useRouter()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    managerFirstName: '',
    managerLastName: '',
    managerEmail: '',
    managerPhone: ''
  })

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
      fetchFranchises()
    }
  }, [ready])

  function handleSignOut() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    router.push('/')
  }

  const fetchFranchises = async () => {
    try {
      const response = await fetch('/api/admin/franchises')
      if (response.ok) {
        const data = await response.json()
        setFranchises(data)
      }
    } catch (error) {
      console.error('Failed to fetch franchises:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/api/admin/stores', formData)

      if (response.ok) {
        const result = await response.json()
        
        // Show success message
        const message = result.adminCreated 
          ? `Store admin account has been created for ${result.adminEmail}. Login credentials will be sent via email.`
          : `Existing user ${result.adminEmail} has been assigned as store admin.`
        
        toast.success("Store Created Successfully", message)
        router.push('/washland/stores')
      } else {
        const errorData = await response.json()
        if (errorData.type === 'duplicate') {
          toast.error("Duplicate Information", errorData.error)
        } else {
          toast.error("Creation Failed", errorData.error || 'Failed to create store')
        }
      }
    } catch (error) {
      toast.error("Network Error", 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link 
              href="/washland/stores"
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <BackIcon />
              Back to Stores
            </Link>
          </div>
          
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            Add New Store
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Create a new store location and assign a store manager. A store admin account will be automatically created.
          </p>
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '2rem'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Store Information */}
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: '#111827',
                marginBottom: '1rem'
              }}>
                Store Information
              </h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <FormField
                  label="Store Name"
                  required
                  value={formData.name}
                  onChange={(value) => handleInputChange('name', value)}
                  placeholder="e.g. Washland Koramangala"
                />
                
                <FormField
                  label="Address"
                  required
                  value={formData.address}
                  onChange={(value) => handleInputChange('address', value)}
                  placeholder="Full street address"
                  isTextarea
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <FormField
                    label="City"
                    required
                    value={formData.city}
                    onChange={(value) => handleInputChange('city', value)}
                    placeholder="Bangalore"
                  />
                  
                  <FormField
                    label="State"
                    value={formData.state}
                    onChange={(value) => handleInputChange('state', value)}
                    placeholder="Karnataka"
                  />
                  
                  <FormField
                    label="Pincode"
                    value={formData.pincode}
                    onChange={(value) => handleInputChange('pincode', value)}
                    placeholder="560001"
                  />
                </div>

                <FormField
                  label="Phone"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Manager Information */}
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                Store Manager Details <span style={{ color: '#ef4444' }}>*</span>
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Store manager details are required. A store admin account will be created with these details.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <FormField
                  label="First Name"
                  required
                  value={formData.managerFirstName}
                  onChange={(value) => handleInputChange('managerFirstName', value)}
                  placeholder="John"
                />
                
                <FormField
                  label="Last Name"
                  required
                  value={formData.managerLastName}
                  onChange={(value) => handleInputChange('managerLastName', value)}
                  placeholder="Doe"
                />
                
                <FormField
                  label="Email"
                  type="email"
                  required
                  value={formData.managerEmail}
                  onChange={(value) => handleInputChange('managerEmail', value)}
                  placeholder="manager@example.com"
                />
                
                <FormField
                  label="Phone"
                  required
                  value={formData.managerPhone}
                  onChange={(value) => handleInputChange('managerPhone', value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <InfoIcon />
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#075985', margin: '0 0 0.25rem 0' }}>
                      Store Admin Account Creation
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#0c4a6e', margin: 0 }}>
                      A store admin account will be automatically created with these details. The manager will receive login credentials via email and can change their password on first login.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <Link
                href="/washland/stores"
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#374151',
                  fontWeight: '500',
                  backgroundColor: 'white'
                }}
              >
                Cancel
              </Link>
              
              <button
                type="submit"
                disabled={loading || !formData.name || !formData.address || !formData.city || !formData.managerFirstName || !formData.managerLastName || !formData.managerEmail || !formData.managerPhone}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Creating...' : 'Create Store'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Helper Components
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
  isTextarea?: boolean
}

function FormField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  type = 'text',
  isTextarea = false 
}: FormFieldProps) {
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    transition: 'border-color 0.2s ease'
  }

  return (
    <div>
      <label style={{ 
        display: 'block', 
        fontSize: '0.875rem', 
        fontWeight: '500', 
        color: '#374151',
        marginBottom: '0.5rem'
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      
      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db'
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db'
          }}
        />
      )}
    </div>
  )
}

interface FormSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  options: { value: string; label: string }[]
}

function FormSelect({ label, value, onChange, required = false, options }: FormSelectProps) {
  return (
    <div>
      <label style={{ 
        display: 'block', 
        fontSize: '0.875rem', 
        fontWeight: '500', 
        color: '#374151',
        marginBottom: '0.5rem'
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '0.875rem',
          backgroundColor: 'white',
          transition: 'border-color 0.2s ease'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db'
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Icons
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5"/>
    <path d="M12 19L5 12L12 5"/>
  </svg>
)

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
)