'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password reset successfully! Redirecting to sign in...')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', overflow: 'visible' }}>
        <div className="card" style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div style={{ color: "#dc2626", marginBottom: "0.75rem", display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#111827" }}>
            Invalid Reset Link
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "0.875rem" }}>
            This password reset link is invalid or has expired.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link
              href="/auth/forgot-password"
              style={{ fontSize: '0.875rem', color: '#1e40af', textDecoration: 'none', fontWeight: 500 }}
            >
              Request a new password reset
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', overflow: 'visible' }}>
      <div className="card" style={{ maxWidth: "420px", width: "100%", position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Image src="/logo.png" alt="Washland" width={140} height={56} style={{ objectFit: 'contain' }} />
            <p className="text-gray-600 mt-2">Set new password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none"
              }}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none"
              }}
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: "100%",
              backgroundColor: isLoading ? "#9ca3af" : "#1e40af",
              color: "white",
              fontWeight: "500",
              padding: "0.75rem 2rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/signin" style={{ fontSize: '0.875rem', color: '#1e40af', textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}