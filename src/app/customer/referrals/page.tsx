"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface ReferralData {
  referralCode: string
  totalReferrals: number
  successfulReferrals: number
  pendingReferrals: number
  totalEarnings: number
  referralHistory: ReferralRecord[]
  bonusStructure: BonusInfo[]
}

interface ReferralRecord {
  id: string
  refereeEmail: string
  refereeName?: string
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED'
  bonusEarned: number
  dateReferred: string
  dateCompleted?: string
}

interface BonusInfo {
  condition: string
  bonus: number
  type: 'POINTS' | 'CASH' | 'DISCOUNT'
}

export default function CustomerReferralsPage() {
  const router = useRouter()
  const toast = useToast()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [newReferralEmail, setNewReferralEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    const name = localStorage.getItem('userName') || 'Customer'
    setUserEmail(email)
    setUserName(name)
    
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      if (!userId || userRole !== 'CUSTOMER') {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/customer/referrals', {
        headers: {
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReferralData(data.referral)
      } else {
        toast.error('Error', 'Failed to fetch referral data')
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
      toast.error('Error', 'Failed to fetch referral data')
    } finally {
      setLoading(false)
    }
  }

  const shareReferralCode = async (method: 'copy' | 'whatsapp' | 'email') => {
    setSharing(true)

    try {
      const referralLink = `${window.location.origin}/auth/signup?ref=${referralData?.referralCode}`
      const shareText = `Join Washland and get your laundry done hassle-free! Use my referral code ${referralData?.referralCode} and we both get amazing rewards. Sign up here: ${referralLink}`

      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(shareText)
          toast.success('Success', 'Referral text copied to clipboard!')
          break
        
        case 'whatsapp':
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
          window.open(whatsappUrl, '_blank')
          break
        
        case 'email':
          const mailtoUrl = `mailto:?subject=Join Washland with my referral&body=${encodeURIComponent(shareText)}`
          window.open(mailtoUrl, '_blank')
          break
      }
    } catch (error) {
      console.error('Error sharing referral:', error)
      toast.error('Error', 'Failed to share referral')
    } finally {
      setSharing(false)
    }
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newReferralEmail) {
      toast.error('Error', 'Please enter an email address')
      return
    }

    setSendingInvite(true)

    try {
      const userId = localStorage.getItem('userId')
      const userRole = localStorage.getItem('userRole')
      const userEmail = localStorage.getItem('userEmail')

      const response = await fetch('/api/customer/referrals/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: newReferralEmail 
        })
      })

      if (response.ok) {
        toast.success('Success', 'Invitation sent successfully!')
        setNewReferralEmail('')
        fetchReferralData() // Refresh data
      } else {
        const errorData = await response.json()
        toast.error('Error', errorData.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      toast.error('Error', 'Failed to send invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  if (loading) {
    return (
      <CustomerDashboardLayout currentPage="referrals" userEmail={userEmail} userName={userName}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #e5e7eb', 
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#6b7280' }}>Loading referral data...</p>
          </div>
        </div>
      </CustomerDashboardLayout>
    )
  }

  return (
    <CustomerDashboardLayout currentPage="referrals" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Refer Friends & Earn
          </h1>
          <p style={{ color: '#6b7280' }}>
            Share Washland with friends and earn rewards for every successful referral
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.25rem' }}>
              {referralData?.totalReferrals || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Referrals</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.25rem' }}>
              {referralData?.successfulReferrals || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Successful</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.25rem' }}>
              {referralData?.pendingReferrals || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pending</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.25rem' }}>
              ₹{referralData?.totalEarnings || 0}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Earned</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          {/* Referral Code & Sharing */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Your Referral Code
            </h2>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '2px dashed #3b82f6',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#3b82f6',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                marginBottom: '0.5rem'
              }}>
                {referralData?.referralCode || 'LOADING...'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Share this code with friends
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Quick Share
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => shareReferralCode('copy')}
                  disabled={sharing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: sharing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📋 Copy Text
                </button>
                <button
                  onClick={() => shareReferralCode('whatsapp')}
                  disabled={sharing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: sharing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📱 WhatsApp
                </button>
                <button
                  onClick={() => shareReferralCode('email')}
                  disabled={sharing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#ea4335',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: sharing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  ✉️ Email
                </button>
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Send Personal Invite
              </label>
              <form onSubmit={sendInvite} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  value={newReferralEmail}
                  onChange={(e) => setNewReferralEmail(e.target.value)}
                  placeholder="friend@example.com"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingInvite}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: sendingInvite ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: sendingInvite ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {sendingInvite ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>

          {/* Bonus Structure */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#111827',
              marginBottom: '1.5rem'
            }}>
              Referral Rewards
            </h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {referralData?.bonusStructure?.map((bonus, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {bonus.condition}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: bonus.type === 'POINTS' ? '#f59e0b' : 
                            bonus.type === 'CASH' ? '#10b981' : '#8b5cf6'
                    }}>
                      {bonus.type === 'POINTS' ? `${bonus.bonus} pts` :
                       bonus.type === 'CASH' ? `₹${bonus.bonus}` :
                       `${bonus.bonus}% off`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#ddd6fe',
              borderRadius: '8px',
              border: '1px solid #c4b5fd'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#5b21b6', fontWeight: '500', marginBottom: '0.5rem' }}>
                💡 Pro Tip
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#6b46c1' }}>
                Your friends get a welcome bonus too! Share the love and grow your earnings together.
              </div>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f3f4f6',
          marginTop: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '1.5rem'
          }}>
            Referral History
          </h2>

          {referralData?.referralHistory?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                No referrals yet
              </h3>
              <p style={{ color: '#6b7280' }}>
                Start sharing your referral code to see your referrals here
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {referralData?.referralHistory?.map((referral) => (
                <div
                  key={referral.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: referral.status === 'COMPLETED' ? '#10b981' : 
                                      referral.status === 'PENDING' ? '#f59e0b' : '#ef4444',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      color: 'white'
                    }}>
                      {referral.status === 'COMPLETED' ? '✅' : 
                       referral.status === 'PENDING' ? '⏳' : '❌'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', color: '#111827' }}>
                        {referral.refereeName || referral.refereeEmail}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Referred on {new Date(referral.dateReferred).toLocaleDateString()}
                        {referral.dateCompleted && ` • Completed on ${new Date(referral.dateCompleted).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: referral.status === 'COMPLETED' ? '#10b981' : '#6b7280'
                    }}>
                      {referral.status === 'COMPLETED' ? `+₹${referral.bonusEarned}` : '₹0'}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: referral.status === 'COMPLETED' ? '#059669' : 
                            referral.status === 'PENDING' ? '#d97706' : '#dc2626',
                      textTransform: 'capitalize'
                    }}>
                      {referral.status.toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </CustomerDashboardLayout>
  )
}
