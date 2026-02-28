"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import styles from './Header.module.css'

export default function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [localRole, setLocalRole] = useState<string | null>(null)
  const isLoggedIn = Boolean(session || localRole)

  // Check localStorage on mount and set up storage listener
  useEffect(() => {
    // Initial check
    const storedRole = localStorage.getItem('userRole')
    setLocalRole(storedRole)

    // Listen for storage changes (when localStorage is updated in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRole') {
        setLocalRole(e.newValue)
      }
    }

    // Listen for custom auth events (when localStorage is updated in same tab)
    const handleAuthEvent = (e: CustomEvent) => {
      const detail = e.detail
      if (detail?.role) {
        setLocalRole(String(detail.role))
      } else if (detail === null) {
        setLocalRole(null)
      }
    }

    window.addEventListener('storage', handleStorageChange as EventListener)
    window.addEventListener('auth:session', handleAuthEvent as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener)
      window.removeEventListener('auth:session', handleAuthEvent as EventListener)
    }
  }, [])

  // Keep localRole in sync with NextAuth session changes
  useEffect(() => {
    if (session?.user?.role) {
      setLocalRole(session.user.role as string)
    } else if (session === null && !localStorage.getItem('userRole')) {
      setLocalRole(null)
    }
  }, [session])

  // Check if user should see public navigation (not logged in or customer role)
  const shouldShowPublicNav = () => {
    const rawRole = (session?.user?.role ?? localRole ?? '') as string
    const role = rawRole.toString().trim().toLowerCase()
    
    // Show public nav if:
    // 1. No session and no local role (not logged in)
    // 2. Role is customer/user
    return !session && !localRole || role === 'customer' || role === 'user'
  }

  function handleSignOut() {
    // Always clear legacy/local storage and component state so UI updates immediately
    try {
      localStorage.removeItem('userRole')
      localStorage.removeItem('storeId')
    } catch (e) {
      // ignore if localStorage is unavailable for some reason
    }
    setLocalRole(null)

    if (session) {
      // NextAuth sign out (will redirect to callbackUrl)
      nextAuthSignOut({ callbackUrl: '/' })
      return
    }

    // fallback local-only sign-out
    router.push('/')
  }

  function openDashboard() {
    // prefer NextAuth session role when available, fallback to localRole
    const rawRole = (session?.user?.role ?? localRole ?? '') as string
    const role = rawRole.toString().trim().toLowerCase()

    // map a variety of possible role name formats to dashboard routes
    const routeMap: Record<string, string> = {
      // super admin / washland
      'super_admin': '/washland/dashboard',
      'super-admin': '/washland/dashboard',
      'superadmin': '/washland/dashboard',
      'super admin': '/washland/dashboard',
      'washland': '/washland/dashboard',

      // franchise
      'franchise_admin': '/franchise/dashboard',
      'franchise-admin': '/franchise/dashboard',
      'franchiseadmin': '/franchise/dashboard',
      'franchise': '/franchise/dashboard',

      // store / admin
      'store_admin': '/admin/dashboard',
      'store-admin': '/admin/dashboard',
      'storeadmin': '/admin/dashboard',
      'store': '/admin/dashboard',

      // customer
      'customer': '/customer/dashboard',

      // rider
      'rider': '/rider/dashboard'
    }

    if (role && routeMap[role]) {
      router.push(routeMap[role])
      return
    }

    // If session exists but no known role, route to a sensible default.
    // Prefer a signed-in landing; fallback to signin page for unknown/anonymous.
    if (session) {
      // default for signed-in users without a mapped role
      router.push('/')
      return
    }

    router.push('/auth/signin')
  }

  return (
    <header className={styles.header}>
      {/* Decorative background elements */}
      <div className={styles.backgroundDecor} />
      <div className={styles.decorElement1} />
      <div className={styles.decorElement2} />

      <div className={styles.container}>
        <div className={styles.headerGrid}>

          {/* Left - Logo */}
          <div className={styles.logoContainer}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/logo.png"
                alt="Washland Logo"
                width={160}
                height={63}
                className={styles.logo}
              />
            </Link>
          </div>

          {/* Center Navigation - Main menu items */}
          {shouldShowPublicNav() && (
            <nav className={styles.navLeft}>
            {!isLoggedIn && (
              <>
                <Link href="/franchise" className={styles.navItem}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7v11a2 2 0 002 2h10a2 2 0 002-2V7M9 7V5a3 3 0 016 0v2" />
                  </svg>
                  <span>Franchise</span>
                </Link>

                <Link href="/locations" className={styles.navItem}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Stores</span>
                </Link>

                <Link href="/pricing" className={styles.navItem}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Pricing</span>
                </Link>
              </>
            )}

            <Link href="/book-service" className={`${styles.navItem} ${styles.bookNowButton}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Book Now</span>
            </Link>

            <a 
              href="https://api.whatsapp.com/send/?phone=919888477748&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.navItem} ${styles.whatsappButton}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Book via WhatsApp</span>
            </a>
          </nav>
          )}

          {/* Right Navigation - Auth buttons */}
          <nav className={styles.navRight}>
            {/* Dashboard button - visible when user is signed in */}
            {(session || localRole) && (
              <button 
                onClick={openDashboard} 
                className={`${styles.navItem} ${styles.dashboardButton}`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Dashboard</span>
              </button>
            )}

            {/* Sign in / Sign out */}
            {session || localRole ? (
              <button 
                onClick={handleSignOut} 
                className={`${styles.navItem} ${styles.signOutButton}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21H5a2 2 0 01-2-2V5a2 2 0 012-2h2" />
                </svg>
                <span>Sign out</span>
              </button>
            ) : (
              <Link href="/auth/signin" className={`${styles.navItem} ${styles.signInButton}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Sign in</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

