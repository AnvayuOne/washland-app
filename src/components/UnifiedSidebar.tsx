"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, ReactElement, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface SidebarItem {
  label: string
  href: string
  icon: ReactElement
  badge?: string | number
  children?: SidebarItem[]
}

interface UnifiedSidebarProps {
  userRole: string
  userName?: string
  userEmail?: string
  storeName?: string
  onSignOut: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default React.memo(function UnifiedSidebar({
  userRole,
  userName,
  userEmail,
  storeName,
  onSignOut,
  isCollapsed = false,
  onToggleCollapse
}: UnifiedSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Define navigation items based on role
  const getNavigationItems = (role: string): SidebarItem[] => {
    const roleNormalized = role.toLowerCase().replace(/[_-]/g, '')

    if (roleNormalized === 'superadmin' || role === 'SUPER_ADMIN') {
      return [
        {
          label: 'Dashboard',
          href: '/washland/dashboard',
          icon: <DashboardIcon />
        },
        {
          label: 'Franchises',
          href: '/washland/franchises',
          icon: <FranchiseIcon />,
          children: [
            { label: 'All Franchises', href: '/washland/franchises', icon: <ListIcon /> },
            { label: 'Add Franchise', href: '/washland/franchises/new', icon: <PlusIcon /> }
          ]
        },
        {
          label: 'Stores',
          href: '/washland/stores',
          icon: <StoreIcon />,
          children: [
            { label: 'All Stores', href: '/washland/stores', icon: <ListIcon /> },
            { label: 'Add Store', href: '/washland/stores/new', icon: <PlusIcon /> }
          ]
        },
        {
          label: 'Users',
          href: '/washland/users',
          icon: <UsersIcon />,
          children: [
            { label: 'All Users', href: '/washland/users', icon: <ListIcon /> },
            { label: 'Add User', href: '/washland/users/new', icon: <PlusIcon /> },
            { label: 'Roles & Permissions', href: '/washland/users/roles', icon: <ShieldIcon /> }
          ]
        },
        {
          label: 'Services',
          href: '/washland/services',
          icon: <ServicesIcon />,
          children: [
            { label: 'All Services', href: '/washland/services', icon: <ListIcon /> },
            { label: 'Add Service', href: '/washland/services/new', icon: <PlusIcon /> },
            { label: 'Categories', href: '/washland/services/categories', icon: <CategoryIcon /> }
          ]
        },
        {
          label: 'Orders',
          href: '/washland/orders',
          icon: <OrdersIcon />,
          children: [
            { label: 'All Orders', href: '/washland/orders', icon: <ListIcon /> },
            { label: 'Order Analytics', href: '/washland/orders/analytics', icon: <AnalyticsIcon /> }
          ]
        },
        {
          label: 'Referrals & Loyalty',
          href: '/washland/referrals',
          icon: <ReferralIcon />,
          children: [
            { label: 'Referral Codes', href: '/washland/referrals', icon: <CodeIcon /> },
            { label: 'Loyalty Points', href: '/washland/loyalty', icon: <PointsIcon /> },
            { label: 'Rewards Config', href: '/washland/loyalty/config', icon: <SettingsIcon /> }
          ]
        },
        {
          label: 'Reports',
          href: '/washland/reports',
          icon: <ReportsIcon />,
          children: [
            { label: 'Business Analytics', href: '/washland/reports', icon: <AnalyticsIcon /> },
            { label: 'Financial Reports', href: '/washland/reports/financial', icon: <FinanceIcon /> },
            { label: 'Customer Reports', href: '/washland/reports/customers', icon: <CustomersIcon /> }
          ]
        },
        {
          label: 'Settings',
          href: '/washland/settings',
          icon: <SettingsIcon />,
          children: [
            { label: 'General Settings', href: '/washland/settings', icon: <SettingsIcon /> },
            { label: 'Payment Settings', href: '/washland/settings/payments', icon: <PaymentIcon /> },
            { label: 'Notification Settings', href: '/washland/settings/notifications', icon: <NotificationIcon /> }
          ]
        }
      ]
    }

    if (roleNormalized === 'franchiseadmin' || role === 'FRANCHISE_ADMIN') {
      return [
        {
          label: 'Dashboard',
          href: '/franchise/dashboard',
          icon: <DashboardIcon />
        },
        {
          label: 'My Stores',
          href: '/franchise/stores',
          icon: <StoreIcon />,
          children: [
            { label: 'All Stores', href: '/franchise/stores', icon: <ListIcon /> },
            { label: 'Add Store', href: '/franchise/stores/new', icon: <PlusIcon /> }
          ]
        },
        {
          label: 'Orders',
          href: '/franchise/orders',
          icon: <OrdersIcon />
        },
        {
          label: 'Staff',
          href: '/franchise/staff',
          icon: <UsersIcon />,
          children: [
            { label: 'Store Managers', href: '/franchise/staff', icon: <ListIcon /> },
            { label: 'Add Staff', href: '/franchise/staff/new', icon: <PlusIcon /> }
          ]
        },
        {
          label: 'Reports',
          href: '/franchise/reports',
          icon: <ReportsIcon />
        },
        {
          label: 'Settings',
          href: '/franchise/settings',
          icon: <SettingsIcon />
        }
      ]
    }

    if (roleNormalized === 'storeadmin' || role === 'STORE_ADMIN') {
      return [
        {
          label: 'Dashboard',
          href: '/admin/dashboard',
          icon: <DashboardIcon />
        },
        {
          label: 'Orders',
          href: '/admin/orders',
          icon: <OrdersIcon />,
          children: [
            { label: 'Active Orders', href: '/admin/orders', icon: <ListIcon /> },
            { label: 'Order History', href: '/admin/orders/history', icon: <HistoryIcon /> }
          ]
        },
        {
          label: 'Customers',
          href: '/admin/customers',
          icon: <CustomersIcon />
        },
        {
          label: 'Inventory',
          href: '/admin/inventory',
          icon: <InventoryIcon />
        },
        {
          label: 'Reports',
          href: '/admin/reports',
          icon: <ReportsIcon />
        },
        {
          label: 'Settings',
          href: '/admin/settings',
          icon: <SettingsIcon />
        }
      ]
    }

    if (roleNormalized === 'customer' || role === 'CUSTOMER') {
      return [
        {
          label: 'Dashboard',
          href: '/customer/dashboard',
          icon: <DashboardIcon />
        },
        {
          label: 'My Orders',
          href: '/customer/orders',
          icon: <OrdersIcon />,
          children: [
            { label: 'Current Orders', href: '/customer/orders/current', icon: <ClockIcon /> },
            { label: 'Order History', href: '/customer/orders/history', icon: <HistoryIcon /> }
          ]
        },
        {
          label: 'Book Service',
          href: '/book-service',
          icon: <BookServiceIcon />
        },
        {
          label: 'My Cart',
          href: '/customer/cart',
          icon: <CartIcon />
        },
        {
          label: 'My Subscriptions',
          href: '/customer/subscriptions',
          icon: <PaymentIcon />
        },
        {
          label: 'My Addresses',
          href: '/customer/addresses',
          icon: <AddressIcon />
        },
        {
          label: 'My Profile',
          href: '/customer/profile',
          icon: <ProfileIcon />
        },
        {
          label: 'Loyalty Points',
          href: '/customer/loyalty',
          icon: <LoyaltyIcon />
        },
        {
          label: 'Refer Friends',
          href: '/customer/referrals',
          icon: <ReferralIcon />
        },
        {
          label: 'My Wallet',
          href: '/customer/wallet',
          icon: <WalletIcon />
        }
      ]
    }

    // Default items for any other role
    return [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <DashboardIcon />
      }
    ]
  }

  const navigationItems = getNavigationItems(userRole)

  const toggleExpanded = (itemLabel: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemLabel)) {
      newExpanded.delete(itemLabel)
    } else {
      newExpanded.add(itemLabel)
    }
    setExpandedItems(newExpanded)
  }

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getRoleDisplayName = (role: string) => {
    const roleNormalized = role.toLowerCase().replace(/[_-]/g, '')
    if (roleNormalized === 'superadmin' || role === 'SUPER_ADMIN') return 'Super Admin'
    if (roleNormalized === 'franchiseadmin' || role === 'FRANCHISE_ADMIN') return 'Franchise Admin'
    if (roleNormalized === 'storeadmin' || role === 'STORE_ADMIN') return 'Store Admin'
    if (roleNormalized === 'customer' || role === 'CUSTOMER') return 'Customer'
    return 'Dashboard'
  }

  return (
    <div className="sidebar" style={{
      width: isCollapsed ? '80px' : '280px',
      height: 'calc(100vh - 4.5rem)', // Adjust height to account for header
      backgroundColor: '#f8fafc', // Light gray background
      color: '#1e293b', // Dark text for contrast
      position: 'fixed',
      left: 0,
      top: '4.5rem', // Start below the header (header height is 4.5rem)
      overflowY: 'auto',
      overflowX: 'visible', // Allow tooltips to extend outside
      zIndex: 50, // Lower z-index to stay below header
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.1)',
      border: 'none',
      borderRight: '1px solid #e2e8f0',
      transition: 'width 0.3s ease'
    }}>
      {/* Logo Header */}
      <div style={{
        padding: isCollapsed ? '1rem' : '1.5rem 1rem',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        position: 'relative'
      }}>
        {/* Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              position: 'absolute',
              top: isCollapsed ? 'auto' : '1rem',
              bottom: isCollapsed ? '0.5rem' : 'auto',
              right: isCollapsed ? '50%' : '1rem',
              transform: isCollapsed ? 'translateX(50%)' : 'none',
              width: '32px',
              height: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <CollapseIcon isCollapsed={isCollapsed} />
          </button>
        )}

        <Link href={
          userRole === 'SUPER_ADMIN' ? '/washland/dashboard' :
          userRole === 'FRANCHISE_ADMIN' ? '/franchise/dashboard' :
          userRole === 'STORE_ADMIN' ? '/admin/dashboard' :
          userRole === 'CUSTOMER' ? '/customer/dashboard' :
          '/dashboard'
        } style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? '0' : '1rem',
            marginBottom: isCollapsed ? '0' : '0.75rem',
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Image
                src="/logo2.png"
                alt="Washland"
                width={32}
                height={32}
                style={{
                  filter: 'brightness(0) invert(1)',
                  objectFit: 'contain'
                }}
              />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  Washland
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500'
                }}>
                  {getRoleDisplayName(userRole)}
                </div>
              </div>
            )}
          </div>
        </Link>

        {!isCollapsed && (
          <>
            {storeName && (
              <div style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.25rem',
                fontWeight: '600'
              }}>
                {storeName}
              </div>
            )}
            {userName && (
              <div style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.25rem'
              }}>
                {userName}
              </div>
            )}
            {userEmail && (
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                {userEmail}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav style={{
        padding: '1rem 0',
        overflow: 'visible' // Allow tooltips to extend outside
      }}
      onMouseLeave={() => {
        // Hide all tooltips when mouse leaves navigation area
        if (isCollapsed) {
          setTimeout(() => {
            const allTooltips = document.querySelectorAll('.tooltip-text') as NodeListOf<HTMLElement>
            allTooltips.forEach(tooltip => {
              if (!tooltip.matches(':hover')) {
                tooltip.style.opacity = '0'
                tooltip.style.pointerEvents = 'none'
              }
            })
          }, 150)
        }
      }}
      >
        {navigationItems.map((item) => (
          <div key={item.label}>
            {/* Menu Item */}
            {item.children && !isCollapsed ? (
              // For items with children in expanded mode, use div with click handler
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  margin: '0 0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isActiveRoute(item.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: isActiveRoute(item.href) ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  color: isActiveRoute(item.href) ? '#1e40af' : '#475569',
                  justifyContent: 'flex-start',
                  position: 'relative'
                }}
                data-menu-item={item.label}
                onClick={() => toggleExpanded(item.label)}
                onMouseEnter={(e) => {
                  if (!isActiveRoute(item.href)) {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
                    e.currentTarget.style.color = '#1e40af'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute(item.href)) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#475569'
                  }
                }}
              >
                <div style={{
                  marginRight: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {item.icon}
                </div>
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500' }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '9999px',
                    minWidth: '1.25rem',
                    textAlign: 'center'
                  }}>
                    {item.badge}
                  </span>
                )}
                {item.children && (
                  <div style={{
                    marginLeft: '0.5rem',
                    transform: expandedItems.has(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <ChevronDownIcon />
                  </div>
                )}
              </div>
            ) : (
              // For all other cases, use Link component
              <Link
                href={item.href}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                    margin: isCollapsed ? '0.25rem 0.5rem' : '0 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isActiveRoute(item.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    border: isActiveRoute(item.href) ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    color: isActiveRoute(item.href) ? '#1e40af' : '#475569',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActiveRoute(item.href)) {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
                      e.currentTarget.style.color = '#1e40af'
                    }

                    // Show tooltip for collapsed mode
                    if (isCollapsed) {
                      const tooltip = e.currentTarget.querySelector('.tooltip-text') as HTMLElement
                      if (tooltip) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        tooltip.style.top = `${rect.top + rect.height / 2}px`
                        tooltip.style.opacity = '1'
                        tooltip.style.pointerEvents = item.children ? 'auto' : 'none'
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActiveRoute(item.href)) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#475569'
                    }

                    // Hide tooltip for collapsed mode
                    if (isCollapsed) {
                      setTimeout(() => {
                        const tooltip = e.currentTarget.querySelector('.tooltip-text') as HTMLElement
                        if (tooltip && !tooltip.matches(':hover')) {
                          tooltip.style.opacity = '0'
                          tooltip.style.pointerEvents = 'none'
                        }
                      }, 100)
                    }
                  }}
                >
              <div style={{
                marginRight: isCollapsed ? '0' : '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {item.icon}

                {/* Tooltip/Submenu for collapsed mode */}
                {isCollapsed && (
                  <div style={{
                    position: 'fixed',
                    left: '90px',
                    top: '0px', // Will be updated via JavaScript
                    transform: 'translateY(-50%)',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    padding: item.children ? '0.5rem 0' : '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    opacity: '0',
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease',
                    zIndex: '9999',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    minWidth: item.children ? '200px' : 'auto'
                  }}
                  className="tooltip-text"
                  onMouseEnter={(e) => {
                    if (item.children) {
                      // Hide all other tooltips first
                      const allTooltips = document.querySelectorAll('.tooltip-text') as NodeListOf<HTMLElement>
                      allTooltips.forEach(tooltip => {
                        if (tooltip !== e.currentTarget) {
                          tooltip.style.opacity = '0'
                          tooltip.style.pointerEvents = 'none'
                        }
                      })

                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.pointerEvents = 'auto'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (item.children) {
                      e.currentTarget.style.opacity = '0'
                      e.currentTarget.style.pointerEvents = 'none'
                    }
                  }}
                  >
                    {item.children ? (
                      /* Submenu dropdown for items with children */
                      <div>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {item.label}
                        </div>
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.75rem',
                              color: 'white',
                              textDecoration: 'none',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                              {child.icon}
                            </div>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      /* Simple tooltip for items without children */
                      item.label
                    )}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500' }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '9999px',
                      minWidth: '1.25rem',
                      textAlign: 'center'
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {item.children && (
                    <div style={{
                      marginLeft: '0.5rem',
                      transform: expandedItems.has(item.label) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}>
                      <ChevronDownIcon />
                    </div>
                  )}
                </>
              )}
                </div>
              </Link>
            )}

            {/* Submenu - only show when not collapsed */}
            {!isCollapsed && item.children && expandedItems.has(item.label) && (
              <div style={{
                backgroundColor: 'rgba(241, 245, 249, 0.6)',
                margin: '0.25rem 0.75rem',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                {item.children.map((child) => (
                  <Link
                    key={child.label}
                    href={child.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem 0.5rem 2.5rem',
                      fontSize: '0.875rem',
                      color: isActiveRoute(child.href) ? '#1e40af' : '#64748b',
                      textDecoration: 'none',
                      backgroundColor: isActiveRoute(child.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      transition: 'all 0.2s ease',
                      borderLeft: isActiveRoute(child.href) ? '2px solid #3b82f6' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActiveRoute(child.href)) {
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
                        e.currentTarget.style.color = '#1e40af'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActiveRoute(child.href)) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#64748b'
                      }
                    }}
                  >
                    <div style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
                      {child.icon}
                    </div>
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '1rem',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={onSignOut}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'center',
              gap: isCollapsed ? '0' : '0.5rem',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              // Hide all other tooltips first
              const allTooltips = document.querySelectorAll('.tooltip-text') as NodeListOf<HTMLElement>
              allTooltips.forEach(tooltip => {
                tooltip.style.opacity = '0'
                tooltip.style.pointerEvents = 'none'
              })

              e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'

              // Show tooltip for collapsed mode
              if (isCollapsed) {
                const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-text') as HTMLElement
                if (tooltip) {
                  tooltip.style.opacity = '1'
                  tooltip.style.pointerEvents = 'auto'
                }
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = 'none'

              // Hide tooltip
              if (isCollapsed) {
                const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-text') as HTMLElement
                if (tooltip) {
                  tooltip.style.opacity = '0'
                  tooltip.style.pointerEvents = 'none'
                }
              }
            }}
          >
            <SignOutIcon />
            {!isCollapsed && 'Sign Out'}
          </button>

          {/* Tooltip for collapsed mode */}
          {isCollapsed && (
            <div
              style={{
                position: 'fixed',
                left: '70px',
                bottom: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              className="tooltip-text"
            >
              Sign Out
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Icon Components
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const FranchiseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L22 8.5V21H2V8.5L12 2Z"/>
    <path d="M12 2V12"/>
    <path d="M8 12V21"/>
    <path d="M16 12V21"/>
  </svg>
)

const StoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7"/>
    <rect x="3" y="7" width="18" height="13" rx="1"/>
    <path d="M8 7V5"/>
    <path d="M16 7V5"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21V19C17 16.2386 14.7614 14 12 14H5C2.23858 14 0 16.2386 0 19V21"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21V19C22.9993 17.1137 21.9683 15.4628 20.4 14.8"/>
    <path d="M16 3.13C17.5312 3.74055 18.5321 5.24693 18.5321 6.995C18.5321 8.74307 17.5312 10.2495 16 10.86"/>
  </svg>
)

const ServicesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

const OrdersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6C4 4.89543 4.89543 4 6 4H8"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M9 14L11 16L15 12"/>
  </svg>
)

const ReferralIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21"/>
    <circle cx="8.5" cy="7" r="4"/>
    <path d="M22 11L20 13L22 15"/>
    <path d="M16 13H20"/>
  </svg>
)

const ReportsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3V21H21"/>
    <path d="M9 9L12 6L16 10L20 6"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2578 9.77251 19.9887C9.5799 19.7197 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.87653 4.85912 3.77588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 22.0391 22.4142 22.4142C22.7893 22.7893 23 23.2196 23 23.75C23 24.2804 22.7893 24.7891 22.4142 25.1642C22.0391 25.5393 21.5304 25.75 21 25.75H20.91C20.5882 25.7513 20.2738 25.8466 20.0055 26.0243C19.7372 26.202 19.5268 26.4532 19.4 26.75Z"/>
  </svg>
)

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22S8 18 8 12V7L12 5L16 7V12C16 18 12 22 12 22Z"/>
  </svg>
)

const CategoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const AnalyticsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3V21H21"/>
    <path d="M9 9L12 6L16 10L20 6"/>
  </svg>
)

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16,18 22,12 16,6"/>
    <polyline points="8,6 2,12 8,18"/>
  </svg>
)

const PointsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9 17,14.74 18.18,21.02 12,17.77 5.82,21.02 7,14.74 2,9 8.91,8.26"/>
  </svg>
)

const FinanceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5C17 13.8807 15.8807 15 14.5 15H7"/>
    <line x1="10" y1="1" x2="10" y2="5"/>
    <line x1="14" y1="19" x2="14" y2="23"/>
  </svg>
)

const CustomersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21V19C20 16.2386 17.7614 14 15 14H9C6.23858 14 4 16.2386 4 19V21"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const PaymentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)

const NotificationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"/>
    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"/>
  </svg>
)

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
)

const InventoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8C20.9996 7.64928 20.9071 7.30481 20.7315 7.00116C20.556 6.69751 20.3037 6.44536 20 6.27L13 2.27C12.696 2.09446 12.3511 2.00205 12 2.00205C11.6489 2.00205 11.304 2.09446 11 2.27L4 6.27C3.69626 6.44536 3.44398 6.69751 3.26846 7.00116C3.09294 7.30481 3.00036 7.64928 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9988C3.44398 17.3025 3.69626 17.5546 4 17.73L11 21.73C11.304 21.9055 11.6489 21.9979 12 21.9979C12.3511 21.9979 12.696 21.9055 13 21.73L20 17.73C20.3037 17.5546 20.556 17.3025 20.7315 16.9988C20.9071 16.6952 20.9996 16.3507 21 16Z"/>
    <polyline points="7.5,4.21 12,6.81 16.5,4.21"/>
    <polyline points="7.5,19.79 7.5,14.6 3,12"/>
    <polyline points="21,12 16.5,14.6 16.5,19.79"/>
    <polyline points="12,22.08 12,17"/>
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6,9 12,15 18,9"/>
  </svg>
)

const SignOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const CollapseIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {isCollapsed ? (
      // Expand icon (chevrons pointing right)
      <>
        <polyline points="9,18 15,12 9,6"/>
        <polyline points="15,18 21,12 15,6"/>
      </>
    ) : (
      // Collapse icon (chevrons pointing left)
      <>
        <polyline points="15,18 9,12 15,6"/>
        <polyline points="9,18 3,12 9,6"/>
      </>
    )}
  </svg>
)

// Additional Customer Icons
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
)

const BookServiceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L22 8.5V21H2V8.5L12 2Z"/>
    <path d="M12 2V12"/>
    <path d="M8 12V21"/>
    <path d="M16 12V21"/>
    <circle cx="12" cy="7" r="2"/>
  </svg>
)

const CartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h8.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)

const AddressIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LoyaltyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9 17,14.74 18.18,21.02 12,17.77 5.82,21.02 7,14.74 2,9 8.91,8.26"/>
  </svg>
)

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
