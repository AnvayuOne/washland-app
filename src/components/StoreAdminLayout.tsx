"use client"

import { ReactNode, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import UnifiedSidebar from '@/components/UnifiedSidebar'

interface StoreAdminLayoutProps {
  children: ReactNode
  userRole: string
  userName: string
  userEmail: string
  storeName?: string
  onSignOut: () => void
}

export default function StoreAdminLayout({
  children,
  userRole,
  userName,
  userEmail,
  storeName,
  onSignOut
}: StoreAdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed])

  return (
    <div className="store-admin-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <UnifiedSidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        storeName={storeName}
        onSignOut={onSignOut}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((open) => !open)}
      />

      {/* Main Content */}
      <div className="store-admin-main" style={{
        marginLeft: isCollapsed ? '80px' : '280px',
        flex: 1,
        padding: '2rem',
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease'
      }}>
        {children}
      </div>
      <style jsx>{`
        .store-mobile-toolbar {
          display: none;
        }

        @media (max-width: 767px) {
          .store-admin-main {
            margin-left: 0 !important;
            width: 100%;
            min-width: 0;
            padding: 0.75rem 1rem 1.25rem !important;
            overflow-x: hidden;
          }

          .store-mobile-toolbar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            min-height: 48px;
            margin: -0.25rem 0 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .store-mobile-toolbar button {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex: 0 0 auto;
            width: 40px;
            height: 40px;
            padding: 0;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fff;
            cursor: pointer;
          }

          .store-mobile-toolbar button span {
            width: 18px;
            height: 2px;
            border-radius: 2px;
            background: #1e40af;
          }

          .store-mobile-toolbar div {
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .store-mobile-toolbar strong {
            font-size: 0.95rem;
            color: #1e293b;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .store-mobile-toolbar span {
            font-size: 0.75rem;
            color: #64748b;
          }
        }
      `}</style>
    </div>
  )
}