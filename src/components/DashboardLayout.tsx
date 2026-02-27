"use client"

import { ReactNode, useState } from 'react'
import DashboardSidebar from './DashboardSidebar'

interface DashboardLayoutProps {
  children: ReactNode
  userRole: string
  userName?: string
  userEmail?: string
  onSignOut?: () => void
}

export default function DashboardLayout({ 
  children, 
  userRole, 
  userName, 
  userEmail, 
  onSignOut = () => {} 
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }
  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      overflow: 'visible' // Allow tooltips to extend outside
    }}>
      {/* Sidebar */}
      <DashboardSidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: isCollapsed ? '80px' : '280px',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
        overflow: 'visible' // Allow tooltips to be visible
      }}>
        {/* Header Bar */}
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 40, // Lower than sidebar (50)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#111827',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {userRole === 'SUPER_ADMIN' ? 'Washland Admin Portal' : 
               userRole === 'FRANCHISE_ADMIN' ? 'Franchise Management' :
               userRole === 'STORE_ADMIN' ? 'Store Management' : 'Dashboard'}
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* User info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {userName ? userName.charAt(0).toUpperCase() : userEmail?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  {userName || 'Admin'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {userRole === 'SUPER_ADMIN' ? 'Super Admin' : 
                   userRole === 'FRANCHISE_ADMIN' ? 'Franchise Admin' :
                   userRole === 'STORE_ADMIN' ? 'Store Admin' : 'User'}
                </div>
              </div>
            </div>
            
            {/* Notification bell */}
            <div style={{
              padding: '0.5rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid #e2e8f0',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9'
              e.currentTarget.style.color = '#3b82f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.color = '#6b7280'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"/>
                <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"/>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Page Content */}
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
