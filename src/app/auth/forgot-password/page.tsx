'use client'

import { useState } from 'react'
import Link from 'next/link'

import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setEmail('')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', overflow: 'visible' }}>
      <div className="card" style={{ maxWidth: "420px", width: "100%", position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Image src="/logo.png" alt="Washland" width={140} height={56} style={{ objectFit: 'contain' }} />
            <p className="text-gray-600 mt-2">Reset your password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8l8.5 5L20 8" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {isLoading ? "Sending..." : "Send Reset Link"}
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