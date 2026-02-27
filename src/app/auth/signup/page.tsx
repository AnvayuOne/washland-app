"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from 'next/image'
import { useToast } from '@/components/ToastProvider'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    referralCode: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          referralCode: formData.referralCode
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast.success("Account Created Successfully", "Redirecting you to sign in page...")
        setTimeout(() => {
          router.push("/auth/signin?message=Account created successfully. Please sign in.")
        }, 2000)
      } else {
        // Handle specific error types
        if (data.type === 'duplicate') {
          toast.error("Duplicate Information", data.error)
        } else {
          toast.error("Sign Up Failed", data.error || "An error occurred")
        }
        setError(data.error || "An error occurred")
      }
    } catch (err) {
      toast.error("Network Error", "An error occurred. Please try again.")
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card" style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div style={{ color: "#059669", marginBottom: "0.75rem" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" stroke="#059669" strokeWidth="1.2" opacity="0.12" /></svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "#111827" }}>
            Welcome aboard — Account created!
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Redirecting to sign in so you can start booking services.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', overflow: 'visible' }}>
      <div className="card" style={{ maxWidth: "560px", width: "100%", position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '1.25rem' }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Image src="/logo.png" alt="Washland" width={160} height={64} style={{ objectFit: 'contain', margin: '0 auto' }} />
          </Link>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>Create your account — quick and secure</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label htmlFor="firstName" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none",
                boxSizing: "border-box"
              }}
              required
            />
          </div>


          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="phone" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="referralCode" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
              Referral Code (Optional)
            </label>
            <input
              type="text"
              id="referralCode"
              name="referralCode"
              value={formData.referralCode}
              onChange={handleChange}
              placeholder="Ex. JOHN123"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="password" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none",
                boxSizing: "border-box"
              }}
              required
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="confirmPassword" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                outline: "none",
                boxSizing: "border-box"
              }}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              borderRadius: "0.5rem",
              fontSize: "0.875rem"
            }}>
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
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "1rem"
            }}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Already have an account?{" "}
            <Link href="/auth/signin" style={{ color: "#1e40af", textDecoration: "none", fontWeight: "500" }}>
              Sign in
            </Link>
          </p>
        </div>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/" style={{ fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}