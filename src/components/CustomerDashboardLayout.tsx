"use client"

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import UnifiedSidebar from '@/components/UnifiedSidebar'
import { useSession } from 'next-auth/react'

interface CustomerDashboardLayoutProps {
  children: React.ReactNode
  currentPage?: string
  userEmail?: string
  userName?: string
}

export default function CustomerDashboardLayout({ 
  children, 
  currentPage = 'dashboard',
  userEmail,
  userName 
}: CustomerDashboardLayoutProps) {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const { data: session, status } = useSession()

  const checkAuth = useCallback(() => {
    if (status === 'loading') return

    // If we have an authenticated session, prioritize it
    if (status === 'authenticated') {
      if (session?.user?.role !== 'CUSTOMER') {
        toast.error('Access Denied', 'Customer access required')
        router.push('/auth/signin')
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.firstName ? `${session.user.firstName} ${session.user.lastName}` : (userName || 'Customer')
      })
      setLoading(false)
      return
    }

    // Fallback to local storage only if unauthenticated (NextAuth finished checking)
    const userRole = localStorage.getItem('userRole')
    const userId = localStorage.getItem('userId')
    const storedEmail = localStorage.getItem('userEmail')
    
    if (userRole !== 'CUSTOMER') {
      toast.error('Access Denied', 'Customer access required')
      router.push('/auth/signin')
      return
    }

    if (!userId) {
      toast.error('Authentication Required', 'Please sign in to continue')
      router.push('/auth/signin')
      return
    }

    setUser({
      id: userId,
      email: storedEmail || userEmail,
      name: userName || 'Customer'
    })
    setLoading(false)
  }, [router, status, session, userEmail, userName, toast])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname]) // Only run once on mount

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    
    window.dispatchEvent(new CustomEvent('auth:session', { detail: null }))
    toast.success('Signed Out', 'You have been successfully signed out.')
    router.push('/')
  }, [toast, router])

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
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
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="customer-dashboard-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <UnifiedSidebar 
        userRole="CUSTOMER"
        userName={user?.name}
        userEmail={user?.email}
        onSignOut={handleSignOut}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
      />
      
      <main className="customer-dashboard-main" style={{ 
        flex: 1, 
        marginLeft: isCollapsed ? '80px' : '280px',
        padding: '2rem',
        overflow: 'auto',
        transition: 'margin-left 0.3s ease'
      }}>
        <div className="customer-mobile-toolbar">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <span>Customer Dashboard</span>
        </div>
        {children}
      </main>
      <style jsx>{`
        .customer-mobile-toolbar {
          display: none;
        }

        @media (max-width: 767px) {
          .customer-dashboard-main {
            margin-left: 0 !important;
            width: 100%;
            min-width: 0;
            padding: 0.75rem 1rem 1.25rem !important;
            overflow-x: hidden;
          }

          .customer-mobile-toolbar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            min-height: 48px;
            margin: -0.25rem 0 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
            font-size: 1rem;
            font-weight: 700;
            color: #1e293b;
          }

          .customer-mobile-toolbar button {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            width: 40px;
            height: 40px;
            padding: 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fff;
            cursor: pointer;
          }

          .customer-mobile-toolbar button span {
            width: 18px;
            height: 2px;
            border-radius: 2px;
            background: #1e40af;
          }
        }
      `}</style>
    </div>
  )
}