"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useToast } from '@/components/ToastProvider'

interface Store {
  id: string
  name: string
  city: string
  state: string
  franchise?: {
    name: string
  } | null
}

export default function AdminLoginPage() {
  const router = useRouter()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeId, setStoreId] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStores, setLoadingStores] = useState(true)
  const [error, setError] = useState('')

  // Fetch stores on component mount
  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/public/stores')
      if (response.ok) {
        const storesData = await response.json()
        setStores(storesData)
      } else {
        console.error('Failed to fetch stores')
        toast.error('Error', 'Failed to load stores. Please refresh the page.')
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      toast.error('Network Error', 'Unable to load stores. Please check your connection.')
    } finally {
      setLoadingStores(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation
    if (!email || !password) {
      setError('Email and password are required')
      setIsLoading(false)
      return
    }

    if (!storeId || storeId === '') {
      setError('Please select a store')
      setIsLoading(false)
      return
    }

    try {
      // Authenticate user and verify store access
      console.log('Submitting login:', { email, hasPassword: !!password, storeId })
      
      const response = await fetch('/api/admin/store-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          storeId: storeId
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        // Also establish a real NextAuth session so middleware-protected routes
        // survive refresh/back navigation.
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false
        })

        if (!signInResult || signInResult.error) {
          setError('Login session could not be created. Please try again.')
          toast.error('Login Failed', 'Unable to create session. Please try again.')
          return
        }

        // Store authentication data
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('storeId', String(data.storeId))
        localStorage.setItem('userId', data.user.id)
        
        // Dispatch event to notify Header component
        window.dispatchEvent(new CustomEvent('auth:session', { 
          detail: { 
            role: data.user.role, 
            email: data.user.email,
            id: data.user.id,
            name: `${data.user.firstName} ${data.user.lastName}`,
            storeId: data.storeId,
            storeName: data.storeName
          } 
        }))
        
        toast.success('Login Successful', `Welcome to ${data.storeName}!`)
        
        // Redirect based on user role
        if (data.user.role === 'SUPER_ADMIN') {
          router.push('/washland/dashboard')
        } else {
          router.push('/admin/dashboard')
        }
      } else {
        setError(data.error || 'Login failed')
        if (data.type === 'invalid_credentials') {
          toast.error('Invalid Credentials', 'Please check your email and password.')
        } else if (data.type === 'store_access_denied') {
          toast.error('Access Denied', 'You do not have access to the selected store.')
        } else {
          toast.error('Login Failed', data.error || 'An error occurred during login.')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error. Please try again.')
      toast.error('Network Error', 'Unable to connect to the server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative' }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.25rem', borderRadius: 12, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <Image src="/logo.png" alt="Washland" width={140} height={56} style={{ objectFit: 'contain' }} />
          <p style={{ color: '#6b7280', marginTop: 8 }}>Store admin — sign in to manage your location</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#374151' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Select Store {storeId && `(Selected: Store ID ${storeId})`}
            </div>
            <select 
              value={storeId} 
              onChange={(e) => {
                console.log('Store selected:', e.target.value)
                setStoreId(e.target.value)
                setError('') // Clear any previous errors
              }} 
              style={{ 
                width: '100%', 
                padding: 12, 
                borderRadius: 8, 
                border: storeId ? '1px solid #10b981' : '1px solid #e5e7eb',
                backgroundColor: loadingStores ? '#f9fafb' : 'white'
              }}
              disabled={loadingStores}
            >
              <option value="">
                {loadingStores ? '-- Loading stores --' : '-- Select store --'}
              </option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} — {store.city}, {store.state} ({store.franchise?.name || 'No Franchise'})
                </option>
              ))}
            </select>
            {storeId && (
              <div style={{ 
                marginTop: 4, 
                fontSize: 12, 
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Store selected
              </div>
            )}
          </label>

          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#374151' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 8l8.5 5L20 8" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Email
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </label>

          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, color: '#374151' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Password
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          </label>

          {error && (<div style={{ padding: 10, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8 }}>{error}</div>)}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
            <button type="submit" disabled={isLoading} style={{ background: isLoading ? '#9ca3af' : 'var(--brand-blue)', color: 'white', padding: '0.7rem 1.1rem', borderRadius: 8, border: 'none' }}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
            <button type="button" onClick={() => { setEmail(''); setPassword(''); setStoreId('') }} style={{ padding: '0.6rem 1rem', borderRadius: 8 }}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  )
}
