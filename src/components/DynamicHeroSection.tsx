'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Use a local default hero content so hero text/buttons render immediately without an API call
import AnimatedLaundryBackground from '@/components/AnimatedLaundryBackground';
import HeroCarousel from './HeroCarousel';

export default function DynamicHeroSection() {
  const [heroContent, setHeroContent] = useState({
    title: 'Premium Dry Cleaning & Laundry',
    subtitle: 'Convenient pickup & delivery in your area',
    description: 'Experience the convenience of professional cleaning with fast turnaround, expert stain removal and free pickup within 12 km.',
    primaryBtnText: 'Book Service Now',
    primaryBtnLink: '/book-service',
    secondaryBtnText: 'Find Stores',
    secondaryBtnLink: '/locations',
    offers: [],
  })

  useEffect(() => {
    fetch('/api/public/hero')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setHeroContent(prev => ({
            ...prev,
            ...data.data
          }))
        }
      })
      .catch(err => console.error('Failed to fetch hero content:', err))
  }, [])

  return (
    <main style={{
      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1d3557 100%)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '80vh'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
          minHeight: '80vh',
          padding: '2rem 0'
        }} className="hero-grid">

          {/* Left Content */}
          <div style={{ padding: '2rem 0' }}>

            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1rem',
              lineHeight: '1.1',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {heroContent.title}<br />
              <span style={{ color: '#60a5fa' }}>{heroContent.subtitle}</span>
            </h1>

            {heroContent.description && (
              <p style={{
                fontSize: '1.125rem',
                color: '#dbeafe',
                marginBottom: '2rem',
                lineHeight: '1.6',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {heroContent.description}
              </p>
            )}

            {/* Offers Section */}
            {/* {heroContent.offers && heroContent.offers.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {heroContent.offers.map((offer, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      {offer.imageUrl ? (
                        <Image
                          src={offer.imageUrl}
                          alt={offer.title}
                          width={300}
                          height={120}
                          style={{ borderRadius: '0.75rem', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
                        />
                      ) : (
                        <div style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          padding: '1rem 1.5rem',
                          borderRadius: '0.75rem',
                          color: 'white',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {offer.discountText}
                          </div>
                          <div style={{ fontSize: '1rem' }}>{offer.title}</div>
                          {offer.description && (
                            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                              {offer.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', maxWidth: '600px' }} className="button-group">
              <Link
                href={heroContent.primaryBtnLink}
                style={{
                  backgroundColor: 'white',
                  color: '#1e40af',
                  fontWeight: '600',
                  padding: '1rem 2.5rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  fontSize: '1.125rem',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  border: '2px solid transparent'
                }}
              >
                📅 {heroContent.primaryBtnText}
              </Link>
              <Link
                href={heroContent.secondaryBtnLink}
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  fontWeight: '500',
                  padding: '1rem 2.5rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  fontSize: '1.125rem',
                  textAlign: 'center',
                  transition: 'all 0.3s'
                }}
              >
                📍 {heroContent.secondaryBtnText}
              </Link>
            </div>
          </div>

          {/* Right Content - Carousel (admin-configurable, fallback to public images) */}
          <div style={{ position: 'relative', height: '100%', minHeight: '400px' }}>
            <HeroCarousel />
          </div>
        </div>

        {/* Trust Indicators */}
        <div style={{
          textAlign: 'center',
          padding: '2rem 0',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          marginTop: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3rem',
            flexWrap: 'wrap',
            color: '#dbeafe'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>24hr</div>
              <div style={{ fontSize: '0.875rem' }}>Express Service</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>Free</div>
              <div style={{ fontSize: '0.875rem' }}>Pickup & Delivery</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>100%</div>
              <div style={{ fontSize: '0.875rem' }}>Satisfaction</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>50+</div>
              <div style={{ fontSize: '0.875rem' }}>Store Locations</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          
          .button-group {
            max-width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}

// Default fallback component
function DefaultHeroSection() {
  return (
    <main style={{
      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1d3557 100%)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '80vh'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', position: 'relative' }}>
        <div style={{ textAlign: 'center', padding: '6rem 0' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Premium Dry Cleaning &<br />
            <span style={{ color: '#60a5fa' }}>Laundry Services</span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#dbeafe',
            marginBottom: '2rem',
            maxWidth: '42rem',
            margin: '0 auto 2rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            Experience the convenience of professional cleaning with our premium dry cleaning and laundry services.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/book-service" style={{
              backgroundColor: 'white',
              color: '#1e40af',
              fontWeight: '600',
              padding: '1rem 2.5rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontSize: '1.125rem'
            }}>
              📅 Book Service Now
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}