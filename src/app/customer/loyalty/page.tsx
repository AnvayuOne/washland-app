"use client"

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface LoyaltyTransaction {
  id: string
  points: number
  source: string
  expiresAt: string | null
  createdAt: string
}

interface LoyaltyResponse {
  pointsBalance: number
  lifetimePointsEarned: number
  lifetimePointsRedeemed: number
  recentTransactions: LoyaltyTransaction[]
}

export default function CustomerLoyaltyPage() {
  const toast = useToast()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Customer')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null)

  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || '')
    setUserName(localStorage.getItem('userName') || 'Customer')
    void loadLoyalty()
  }, [])

  async function loadLoyalty() {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/loyalty')
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch loyalty data')
      }

      setLoyalty(payload.loyalty)
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to fetch loyalty data')
    } finally {
      setLoading(false)
    }
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault()

    const points = Number(redeemPoints)
    if (!Number.isInteger(points) || points <= 0) {
      toast.error('Error', 'Enter a valid redeem points value')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/customer/loyalty/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to redeem points')
      }

      toast.success('Redeemed', `Credited ${payload.redemption.creditedAmount} to your wallet`)
      setRedeemPoints('')
      await loadLoyalty()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to redeem points')
    } finally {
      setSubmitting(false)
    }
  }

  const recentTransactions = useMemo(() => loyalty?.recentTransactions ?? [], [loyalty])

  return (
    <CustomerDashboardLayout currentPage="loyalty" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '2rem', fontWeight: 700 }}>Loyalty</h1>
          <p style={{ color: '#6b7280', marginTop: '0.35rem' }}>Track points and redeem to wallet credit</p>
        </div>

        {loading ? (
          <Panel title="Loading">Loading loyalty data...</Panel>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <StatsCard title="Points Balance" value={(loyalty?.pointsBalance ?? 0).toLocaleString()} color="#f59e0b" />
              <StatsCard title="Lifetime Earned" value={(loyalty?.lifetimePointsEarned ?? 0).toLocaleString()} color="#10b981" />
              <StatsCard title="Lifetime Redeemed" value={(loyalty?.lifetimePointsRedeemed ?? 0).toLocaleString()} color="#8b5cf6" />
            </div>

            <Panel title="Redeem Points">
              <form onSubmit={redeem} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="1"
                  value={redeemPoints}
                  onChange={(event) => setRedeemPoints(event.target.value)}
                  placeholder="Points to redeem"
                  style={{ flex: 1, minWidth: 220, border: '1px solid #d1d5db', borderRadius: 8, padding: '0.65rem' }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ border: 'none', borderRadius: 8, padding: '0.65rem 1rem', background: '#2563eb', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Redeeming...' : 'Redeem to Wallet'}
                </button>
              </form>
            </Panel>

            <Panel title="Recent Loyalty Transactions">
              {recentTransactions.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No transactions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.7rem' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} points
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.86rem' }}>{transaction.source}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(transaction.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </CustomerDashboardLayout>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
      <h2 style={{ margin: '0 0 0.7rem 0', color: '#0f172a', fontSize: '1rem' }}>{title}</h2>
      {children}
    </section>
  )
}

function StatsCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem' }}>
      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{title}</div>
      <div style={{ color, fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
    </div>
  )
}
