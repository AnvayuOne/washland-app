"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import DynamicHeroSection from '@/components/DynamicHeroSection'
import NearbyStoreBanner from '@/components/NearbyStoreBanner'
import useNearestStore from '@/hooks/useNearestStore'
import ScrollObserver from '@/components/ScrollObserver'
import { defaultPricing } from '@/lib/defaults'

type ServiceIconKind = 'shirt' | 'linen' | 'shoe' | 'bag' | 'express'

function detectServiceIcon(name: string, description: string): ServiceIconKind {
  const tokens = `${name} ${description}`.toLowerCase()

  if (tokens.includes('shoe') || tokens.includes('sneaker')) return 'shoe'
  if (tokens.includes('bag') || tokens.includes('handbag') || tokens.includes('leather')) return 'bag'
  if (
    tokens.includes('bed') ||
    tokens.includes('linen') ||
    tokens.includes('blanket') ||
    tokens.includes('comforter') ||
    tokens.includes('pillow') ||
    tokens.includes('curtain') ||
    tokens.includes('sofa')
  ) {
    return 'linen'
  }
  if (tokens.includes('express') || tokens.includes('same day') || tokens.includes('steam')) return 'express'
  return 'shirt'
}

function ServiceIcon({ kind }: { kind: ServiceIconKind }) {
  const common = { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: '#1e40af', strokeWidth: '1.8' }

  if (kind === 'linen') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 13h6" />
      </svg>
    )
  }

  if (kind === 'shoe') {
    return (
      <svg {...common}>
        <path d="M3 15c2 0 3-2 5-2s3 2 5 2h8v3H3z" />
        <path d="M6 13V9l4 2" />
      </svg>
    )
  }

  if (kind === 'bag') {
    return (
      <svg {...common}>
        <rect x="5" y="8" width="14" height="11" rx="2" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
    )
  }

  if (kind === 'express') {
    return (
      <svg {...common}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M8 4l2 3h4l2-3 3 2-2 4v9H5v-9L3 6z" />
    </svg>
  )
}

export default function HomePage() {
  const { loading, error, nearest } = useNearestStore(12)
  const [pricing, setPricing] = useState<any[] | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/pricing?limit=6')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return
        // If API returns an empty array (or malformed), use defaultPricing as a resilient fallback
        const data = Array.isArray(j?.data) && j.data.length > 0 ? j.data : defaultPricing.slice(0, 6)
        setPricing(data)
      })
      .catch(() => {
        if (!mounted) return
        setPricing(null)
      })
      .finally(() => {
        if (!mounted) return
        setPricingLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const formatINR = (n?: number) => {
    if (n === undefined || n === null) return '—'
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    } catch (e) {
      return `₹${n}`
    }
  }

  return (
    <div className="min-h-screen">
      <ScrollObserver />
      {/* Header is provided globally via src/components/Header and included in layout.tsx */}
      {/* Nearby store banner (client hook) */}
      {nearest ? <NearbyStoreBanner store={nearest.store} distanceKm={nearest.distanceKm} /> : null}

      {/* Dynamic Hero Section */}
      <div className="hero" style={{ overflow: 'hidden' }}>
        <DynamicHeroSection />
      </div>

      {/* Features Section */}
      <section id="services" style={{ padding: '5rem 1rem', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Why Choose Washland?
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto' }}>
              Experience the difference with our premium cleaning services, cutting-edge technology, and customer-first approach.
            </p>
          </div>
          
          <div className="stagger" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '4rem' }}>
            <div className="card fade-in" style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', animationDelay: '80ms' }}>
              <div style={{ 
                width: '3rem', 
                height: '3rem', 
                backgroundColor: '#1e40af', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem',
                boxShadow: '0 4px 6px rgba(30, 64, 175, 0.3)'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af' }}>Lightning Fast Service</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
                Same-day and next-day service available for most items. Express 3-hour service for urgent needs.
              </p>
              <div style={{ marginTop: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#1e40af', fontWeight: '500' }}>
                ⚡ As fast as 3 hours
              </div>
            </div>

            <div className="card fade-in" style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', animationDelay: '160ms' }}>
              <div style={{ 
                width: '3rem', 
                height: '3rem', 
                backgroundColor: '#059669', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem',
                boxShadow: '0 4px 6px rgba(5, 150, 105, 0.3)'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#059669' }}>Free Pickup & Delivery</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
                Convenient pickup and delivery service at your doorstep. Schedule online and track your items in real-time.
              </p>
                <div style={{ marginTop: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#ecfdf5', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#059669', fontWeight: '500' }}>
                🚚 Free within 12 km
              </div>
            </div>

            <div className="card fade-in" style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', animationDelay: '240ms' }}>
              <div style={{ 
                width: '3rem', 
                height: '3rem', 
                backgroundColor: '#dc2626', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem',
                boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626' }}>100% Satisfaction Guarantee</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
                We stand behind our work with a complete satisfaction guarantee. Not happy? We'll make it right or refund your money.
              </p>
              <div style={{ marginTop: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: '500' }}>
                ✅ Money-back guarantee
              </div>
            </div>

            <div className="card fade-in" style={{ textAlign: 'center', padding: '1rem', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', animationDelay: '320ms' }}>
              <div style={{ 
                width: '3rem', 
                height: '3rem', 
                backgroundColor: '#7c3aed', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem',
                boxShadow: '0 4px 6px rgba(124, 58, 237, 0.3)'
              }}>
                <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#7c3aed' }}>24/7 Customer Support</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
                Got a question, request, or laundry emergency? We're always just a call or chat away, anytime you need us.
              </p>
              <div style={{ marginTop: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#f3e8ff', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#7c3aed', fontWeight: '500' }}>
                📞 Always available
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: '600', color: '#111827', marginBottom: '3rem' }}>
              How It Works
            </h3>
            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {[
                { step: '1', icon: '📱', title: 'Book Online or Call', desc: 'Schedule your service online, via WhatsApp, or give us a call — our team will collect your clothes from your doorstep at your convenience.' },
                { step: '2', icon: '✨', title: 'We Wash, Dry & Treat with Care', desc: 'We wash, dry, and clean your clothes using advanced techniques and fabric-safe detergents to ensure perfect results.' },
                { step: '3', icon: '🏠', title: 'We Deliver Fresh & Folded', desc: 'Once cleaned and neatly folded, your clothes are delivered back to you — fresh, pressed, and ready to wear.' }
              ].map((item, index) => (
                <div key={index} style={{ position: 'relative', textAlign: 'center' }}>
                  <div style={{ 
                    width: '4rem', 
                    height: '4rem', 
                    backgroundColor: '#1e40af', 
                    color: 'white', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 1.5rem',
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    boxShadow: '0 4px 6px rgba(30, 64, 175, 0.3)'
                  }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.95rem', color: '#6b7280', lineHeight: '1.6' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '1rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Choose Your Plan
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto' }}>
              Flexible pricing options to suit your cleaning needs. Save more with our monthly subscriptions.
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '3rem' }}>
            {/* Basic Plan */}
            <div className="card fade-in" style={{ 
              padding: '2rem', 
              border: '2px solid #e5e7eb', 
              position: 'relative',
              backgroundColor: 'white',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  Pay Per Service
                </h3>
                <p style={{ color: '#6b7280', fontSize: '1rem' }}>Perfect for occasional cleaning needs</p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '700', color: '#1e40af' }}>₹12,000</span>
                <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>/item</span>
              </div>
              
              <ul style={{ marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
                {[
                  'Professional dry cleaning',
                  'Standard turnaround (2-3 days)',
                  'Free pickup & delivery',
                  'Basic stain treatment',
                  'Online order tracking'
                ].map((feature, index) => (
                  <li key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.75rem',
                    fontSize: '1rem',
                    color: '#374151'
                  }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#10b981', marginRight: '0.75rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button className="btn-animate" style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                backgroundColor: 'white',
                color: '#1e40af',
                border: '2px solid #1e40af',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#1e40af';
                target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = 'white';
                target.style.color = '#1e40af';
              }}>
                Get Started
              </button>
            </div>

            {/* Premium Plan */}
            <div className="card fade-in" style={{ 
              padding: '2rem', 
              border: '2px solid #1e40af', 
              position: 'relative',
              backgroundColor: 'white',
              transform: 'scale(1.05)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '-12px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                backgroundColor: '#1e40af',
                color: 'white',
                padding: '0.5rem 1.5rem',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                MOST POPULAR
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  Monthly Unlimited
                </h3>
                <p style={{ color: '#6b7280', fontSize: '1rem' }}>Best value for regular customers</p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '700', color: '#1e40af' }}>₹7,500</span>
                <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>/month</span>
                <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500', marginTop: '0.25rem' }}>
                  Save up to 40% vs pay-per-item
                </div>
              </div>
              
              <ul style={{ marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
                {[
                  'Unlimited dry cleaning items',
                  'Express service (24-48 hours)',
                  'Free pickup & delivery',
                  'Premium stain treatment',
                  'Priority customer support',
                  'Online order tracking',
                  'Special occasion rush service'
                ].map((feature, index) => (
                  <li key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.75rem',
                    fontSize: '1rem',
                    color: '#374151'
                  }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#10b981', marginRight: '0.75rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button className="btn-animate" style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#1d4ed8';
                target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#1e40af';
                target.style.transform = 'translateY(0)';
              }}>
                Start Free Trial
              </button>
            </div>

            {/* Family Plan */}
            <div className="card fade-in" style={{ 
              padding: '2rem', 
              border: '2px solid #e5e7eb', 
              position: 'relative',
              backgroundColor: 'white',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                  Family Plan
                </h3>
                <p style={{ color: '#6b7280', fontSize: '1rem' }}>Perfect for households of 4+ people</p>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '700', color: '#1e40af' }}>₹13,500</span>
                <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>/month</span>
                <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500', marginTop: '0.25rem' }}>
                  Covers up to 6 family members
                </div>
              </div>
              
              <ul style={{ marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
                {[
                  'Unlimited items for 6 people',
                  'Same-day express service',
                  'Free pickup & delivery',
                  'Premium stain treatment',
                  'Dedicated family account manager',
                  'Bulk order discounts',
                  'Holiday & event rush service',
                  'Garment care consultation'
                ].map((feature, index) => (
                  <li key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '0.75rem',
                    fontSize: '1rem',
                    color: '#374151'
                  }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#10b981', marginRight: '0.75rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button className="btn-animate" style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                backgroundColor: 'white',
                color: '#1e40af',
                border: '2px solid #1e40af',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#1e40af';
                target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = 'white';
                target.style.color = '#1e40af';
              }}>
                Contact Sales
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f9fafb', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1rem' }}>
              💡 <strong>New customers:</strong> Get your first month 50% off any subscription plan!
            </p>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              All plans include free pickup & delivery within 12 km. No contracts, cancel anytime.
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <a href="/profile/referral" style={{ textDecoration: 'none', backgroundColor: '#fde68a', color: '#92400e', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                🎁 Refer & earn ₹100
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section style={{ padding: '4rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Our Services
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Comprehensive cleaning solutions for all your needs
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {((pricingLoading ? Array.from({ length: 6 }) : (pricing ?? defaultPricing.slice(0, 6)))).map((service: any, index: number) => {
              const key = service?.id ?? `svc-${index}`
              const name = service?.title ?? service?.name ?? 'Service'
              const desc = service?.description ?? ''
              const price = service?.price ?? undefined
              const unit = service?.unit ?? ''
              const iconKind = detectServiceIcon(name, desc)

              return (
                <div
                  key={key}
                  className="card fade-in"
                  style={{
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    animationDelay: `${index * 80}ms`,
                    padding: '1.25rem',
                    borderRadius: '0.85rem',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                  }}
                >
                  <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                    <ServiceIcon kind={iconKind} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e40af', lineHeight: 1.25 }}>
                    {pricingLoading ? 'Loading...' : name}
                  </h3>
                  <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem', minHeight: '2.35rem' }}>
                    {pricingLoading ? ' ' : desc}
                  </p>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#059669' }}>
                    {pricingLoading ? ' ' : `${formatINR(price)} ${unit}`}
                  </p>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link
              href="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#1e40af',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              View More Services
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '4rem 1rem', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Everything you need to know about our laundry services
            </p>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', maxWidth: '60rem', margin: '0 auto' }}>
            {[
              {
                question: 'How does Washland\'s laundry service work?',
                answer: 'Simply schedule a pickup, and our team will collect, clean, and deliver your clothes back to you—fresh and neatly folded. You can book online, via WhatsApp, or by calling us directly.'
              },
              {
                question: 'What types of clothes and fabrics do you handle?',
                answer: 'We handle all types of clothing including daily wear, ethnic wear, designer outfits, woollens, jackets, sarees, lehengas, and formal wear. Our expert team uses appropriate cleaning methods for each fabric type.'
              },
              {
                question: 'How long does the laundry process take?',
                answer: 'Standard service takes 24-48 hours. We also offer express service (same-day/next-day) and emergency 3-hour service for urgent needs. Delivery timelines depend on your location and service type.'
              },
              {
                question: 'Are your detergents and cleaning methods safe for my clothes?',
                answer: 'Yes, we use eco-friendly, fabric-safe detergents and advanced cleaning techniques. Our methods are gentle on fabrics while ensuring thorough cleaning and stain removal.'
              },
              {
                question: 'Do you offer doorstep pickup and delivery?',
                answer: 'Absolutely! We provide free pickup and delivery within 12 km of our store locations. You can schedule pickup at your convenience, and we\'ll deliver your fresh, folded clothes right to your doorstep.'
              },
              {
                question: 'What if I have specific washing or ironing instructions?',
                answer: 'Please let us know about any special care instructions when booking. Our team carefully follows all specific requirements to ensure your garments are handled exactly as requested.'
              },
              {
                question: 'How do I make a payment?',
                answer: 'We accept multiple payment methods including UPI, credit/debit cards (via Razorpay), cash on delivery, and digital wallets. You can pay online when booking or upon delivery.'
              }
            ].map((faq, index) => (
              <div key={index} className="card fade-in" style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                animationDelay: `${index * 100}ms`
              }}>
                <details style={{ padding: '1.5rem' }}>
                  <summary style={{
                    cursor: 'pointer',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.5rem',
                    listStyle: 'none'
                  }}>
                    {faq.question}
                  </summary>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    margin: 0,
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    {faq.answer}
                  </p>
                </details>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Still have questions? We're here to help!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="tel:+919876543210"
                style={{
                  backgroundColor: '#1e40af',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📞 Call +91 98765 43210
              </a>
              <a
                href="https://wa.me/919876543210"
                style={{
                  backgroundColor: '#25d366',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                💬 WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '4rem 1rem', background: 'linear-gradient(to right, #1e40af, #1e3a8a)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'white', marginBottom: '1rem' }}>
            Ready to Experience Premium Cleaning?
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#dbeafe', marginBottom: '2rem' }}>
            Join thousands of satisfied customers. Book your first service today!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              href="/auth/signup" 
              style={{
                backgroundColor: 'white',
                color: '#1e40af',
                fontWeight: '500',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1.125rem'
              }}
            >
              Sign Up Now
            </Link>
            <Link 
              href="/book-service" 
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid white',
                fontWeight: '500',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1.125rem'
              }}
            >
              Book Service
            </Link>
          </div>
        </div>
      </section>

      {/* Commercial Laundry Service Section */}
      <section style={{ padding: '4rem 1rem', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              Commercial Laundry Service
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto' }}>
              Professional laundry solutions for businesses. Bulk discounts, weekly schedules, and free pickup & delivery.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '3rem' }}>
            {[
              { title: 'Nail Salons & Beauty Parlors', icon: '💅' },
              { title: 'Nursing Homes & Clinics', icon: '🏥' },
              { title: 'Daycare Centers & Schools', icon: '🏫' },
              { title: 'Offices & Corporate Organizations', icon: '🏢' },
              { title: 'Salons & Spas', icon: '💆' },
              { title: 'Restaurants & Cafés', icon: '🍽️' },
              { title: 'Hotels & Guest Houses', icon: '🏨' },
              { title: 'Gyms & Fitness Studios', icon: '💪' }
            ].map((business, index) => (
              <div key={index} className="card fade-in" style={{
                padding: '2rem',
                textAlign: 'center',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                backgroundColor: 'white',
                animationDelay: `${index * 100}ms`
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{business.icon}</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>
                  {business.title}
                </h3>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#eff6ff', borderRadius: '1rem', border: '1px solid #dbeafe' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e40af', marginBottom: '1rem' }}>
              Bulk Discounts • Weekly Schedules • Free Pickup & Delivery
            </h3>
            <p style={{ color: '#3730a3', marginBottom: '1.5rem' }}>
              Perfect for businesses that need regular laundry services. Contact us for customized commercial packages.
            </p>
            <Link
              href="/contact"
              style={{
                backgroundColor: '#1e40af',
                color: 'white',
                fontWeight: '500',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1rem',
                display: 'inline-block'
              }}
            >
              Get Commercial Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ padding: '4rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
              What Our Customers Say
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Don't just take our word for it - hear from our satisfied customers
            </p>
          </div>

          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {[
              {
                name: 'Ananya R.',
                rating: 5,
                text: 'Excellent service! Washland made my laundry hassle-free with quick pickup and delivery. My clothes came back fresh and neatly folded!',
                avatar: '👩'
              },
              {
                name: 'Vikram S.',
                rating: 5,
                text: 'Super convenient! I love how easy it is to schedule a pickup. Clothes are always perfectly washed and ironed.',
                avatar: '👨'
              },
              {
                name: 'Priya M.',
                rating: 5,
                text: 'Outstanding quality and service! My sarees and delicate clothes are handled with such care. Highly recommend!',
                avatar: '👩'
              },
              {
                name: 'Rahul K.',
                rating: 5,
                text: 'Best laundry service in Hyderabad. Reliable, affordable, and the staff is very professional.',
                avatar: '👨'
              }
            ].map((testimonial, index) => (
              <div key={index} className="card fade-in" style={{
                padding: '2rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                backgroundColor: '#f9fafb',
                animationDelay: `${index * 150}ms`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>{testimonial.avatar}</div>
                  <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {testimonial.name}
                    </h4>
                    <div style={{ display: 'flex', marginTop: '0.25rem' }}>
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <span key={i} style={{ color: '#fbbf24', fontSize: '1rem' }}>⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  "{testimonial.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Plan Section */}
      <section style={{ padding: '4rem 1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'white', marginBottom: '1rem' }}>
            Looking for a Custom Plan?
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#e0e7ff', marginBottom: '2rem', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto' }}>
            Get a tailored quote for your business laundry needs. We offer customized solutions for hotels, restaurants, offices, and more.
          </p>

          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '3rem', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏨</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>Hotels & Hospitality</h3>
              <p style={{ color: '#e0e7ff', fontSize: '0.875rem', margin: 0 }}>Daily linen and uniform services</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>Corporate Offices</h3>
              <p style={{ color: '#e0e7ff', fontSize: '0.875rem', margin: 0 }}>Bulk uniform and facility laundry</p>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍽️</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>Restaurants & Cafes</h3>
              <p style={{ color: '#e0e7ff', fontSize: '0.875rem', margin: 0 }}>Table linens and staff uniforms</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/contact"
              style={{
                backgroundColor: 'white',
                color: '#667eea',
                fontWeight: '600',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1.125rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              Request a Quote
            </Link>
            <a
              href="tel:+919876543210"
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                fontWeight: '600',
                padding: '1rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1.125rem'
              }}
            >
              Call +91 98765 43210
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#111827', color: 'white', padding: '3rem 1rem 1rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <Image 
                  src="/logo2.png" 
                  alt="Washland Logo" 
                  width={32} 
                  height={32}
                  style={{ marginRight: '0.75rem' }}
                />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Washland</h3>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Premium dry cleaning and laundry services with convenient pickup & delivery across multiple franchise locations.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.25rem' }} title="Facebook">📘</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.25rem' }} title="Instagram">📷</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.25rem' }} title="Twitter">🐦</a>
                <a href="#" style={{ color: '#9ca3af', fontSize: '1.25rem' }} title="LinkedIn">💼</a>
                <a href="https://wa.me/919876543210" style={{ color: '#9ca3af', fontSize: '1.25rem' }} title="WhatsApp">💬</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Services</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Dry Cleaning</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Laundry Service</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Shoe Cleaning</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Saree Care</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Bag & Leather Cleaning</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/book-service" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Curtain Cleaning</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#about" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>About Us</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#locations" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Locations</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/franchise" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Franchise</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/contact" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Contact</a></li>
              </ul>
            </div>
            {/* <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Support</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Help Center</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Track Order</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>FAQs</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="/contact" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Contact Support</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#feedback" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Feedback</a></li>
              </ul>
            </div> */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Contact Info</h4>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Phone:</strong><br />
                  +91 98765 43210
                </p>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Email:</strong><br />
                  washland.drycleaners@gmail.com
                </p>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0.5rem 0' }}>
              Payments: UPI, Credit/Debit cards (Razorpay) · WhatsApp: +91 98765 43210
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
              © 2025 Washland. All rights reserved. Powered by <a href="https://anvayuone.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>AnvayuOne</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
