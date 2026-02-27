"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from 'next/image'

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else if (result?.ok) {
        // Get the session to determine redirect based on role
        const session = await getSession()
        if (session?.user) {
          // Store user data in localStorage for dashboard access
          localStorage.setItem('userId', session.user.id)
          localStorage.setItem('userEmail', session.user.email || '')
          localStorage.setItem('userRole', session.user.role)
          localStorage.setItem('userName', `${session.user.firstName} ${session.user.lastName}`)

          // Dispatch event to notify Header component
          window.dispatchEvent(new CustomEvent('auth:session', {
            detail: {
              role: session.user.role,
              email: session.user.email,
              id: session.user.id,
              name: `${session.user.firstName} ${session.user.lastName}`
            }
          }))

          switch (session.user.role) {
            case "SUPER_ADMIN":
              router.push("/washland/dashboard")
              break
            case "FRANCHISE_ADMIN":
              router.push("/franchise/dashboard")
              break
            case "STORE_ADMIN":
              router.push("/admin/dashboard")
              break
            case "CUSTOMER":
              router.push("/customer/dashboard")
              break
            case "RIDER":
              router.push("/rider/dashboard")
              break
            default:
              router.push("/")
          }
        } else {
          setError("Authentication failed - no session")
        }
      } else {
        setError("Authentication failed")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
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
            <p className="text-gray-600 mt-2">Welcome back — sign in to continue</p>
          </div>

          </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8l8.5 5L20 8" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11V8a5 5 0 0110 0v3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Password
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
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <a href="#" style={{ fontSize: '0.875rem', color: '#1e40af', textDecoration: 'none' }}>Forgot password?</a>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
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
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/auth/signup" style={{ color: "#1e40af", textDecoration: "none" }}>
              Create one — it only takes a minute
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
