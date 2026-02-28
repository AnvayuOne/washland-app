"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useMemo } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, newToast.duration)
  }, [])

  // Use refs to create stable function references
  const addToastRef = useRef(addToast)
  addToastRef.current = addToast

  const success = useCallback((title: string, message?: string) => {
    addToastRef.current({ type: 'success', title, message })
  }, [])

  const error = useCallback((title: string, message?: string) => {
    addToastRef.current({ type: 'error', title, message })
  }, [])

  const warning = useCallback((title: string, message?: string) => {
    addToastRef.current({ type: 'warning', title, message })
  }, [])

  const info = useCallback((title: string, message?: string) => {
    addToastRef.current({ type: 'info', title, message })
  }, [])

  const value = useMemo<ToastContextType>(() => ({
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }), [addToast, removeToast, success, error, warning, info])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemoveToast }: { toasts: Toast[]; onRemoveToast: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      maxWidth: '400px'
    }}>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    const baseStyles = {
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      minWidth: '320px',
      animation: 'slideIn 0.3s ease-out',
      cursor: 'pointer'
    }

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          borderColor: '#10b981',
          backgroundColor: '#f0fdf4'
        }
      case 'error':
        return {
          ...baseStyles,
          borderColor: '#ef4444',
          backgroundColor: '#fef2f2'
        }
      case 'warning':
        return {
          ...baseStyles,
          borderColor: '#f59e0b',
          backgroundColor: '#fffbeb'
        }
      case 'info':
        return {
          ...baseStyles,
          borderColor: '#3b82f6',
          backgroundColor: '#eff6ff'
        }
      default:
        return baseStyles
    }
  }

  const getIconColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getIcon = (type: ToastType) => {
    const iconProps = {
      width: '20',
      height: '20',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      style: { color: getIconColor(type), flexShrink: 0 }
    }

    switch (type) {
      case 'success':
        return (
          <svg {...iconProps}>
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
      case 'error':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      case 'warning':
        return (
          <svg {...iconProps}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      case 'info':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
    }
  }

  return (
    <div style={getToastStyles(toast.type)} onClick={onClose}>
      {getIcon(toast.type)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '0.875rem', 
          marginBottom: toast.message ? '0.25rem' : '0',
          color: '#111827'
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            lineHeight: '1.4'
          }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#6b7280'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af'
        }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
