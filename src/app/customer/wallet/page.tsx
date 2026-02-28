"use client"

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import CustomerDashboardLayout from '@/components/CustomerDashboardLayout'

interface WalletTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT'
  amount: number
  source: string
  status: string
  metadata?: unknown
  createdAt: string
}

interface WalletPayload {
  walletBalance: number
  pendingTopups: number
  totalSpent: number
  transactions: WalletTransaction[]
}

export default function CustomerWalletPage() {
  const toast = useToast()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('Customer')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [wallet, setWallet] = useState<WalletPayload | null>(null)

  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || '')
    setUserName(localStorage.getItem('userName') || 'Customer')
    void loadWallet()
  }, [])

  async function loadWallet() {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/wallet')
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch wallet data')
      }
      setWallet(payload.wallet)
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to fetch wallet data')
    } finally {
      setLoading(false)
    }
  }

  async function requestTopup(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Error', 'Enter a valid amount')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/customer/wallet/add-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parsedAmount }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create top-up request')
      }

      toast.success('Top-up Requested', payload.message || 'Payment integration pending')
      setAmount('')
      await loadWallet()
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'Failed to request top-up')
    } finally {
      setSubmitting(false)
    }
  }

  const transactions = useMemo(() => wallet?.transactions ?? [], [wallet])

  return (
    <CustomerDashboardLayout currentPage="wallet" userEmail={userEmail} userName={userName}>
      <div style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '2rem', fontWeight: 700 }}>Wallet</h1>
          <p style={{ color: '#6b7280', marginTop: '0.35rem' }}>Balance, top-up requests, and transaction history</p>
        </div>

        {loading ? (
          <Panel title="Loading">Loading wallet data...</Panel>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <StatsCard title="Wallet Balance" value={(wallet?.walletBalance ?? 0).toFixed(2)} prefix="INR " color="#10b981" />
              <StatsCard title="Pending Topups" value={(wallet?.pendingTopups ?? 0).toFixed(2)} prefix="INR " color="#f59e0b" />
              <StatsCard title="Total Spent" value={(wallet?.totalSpent ?? 0).toFixed(2)} prefix="INR " color="#8b5cf6" />
            </div>

            <Panel title="Request Wallet Topup">
              <form onSubmit={requestTopup} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                  style={{ flex: 1, minWidth: 220, border: '1px solid #d1d5db', borderRadius: 8, padding: '0.65rem' }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ border: 'none', borderRadius: 8, padding: '0.65rem 1rem', background: '#2563eb', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Submitting...' : 'Create Topup Request'}
                </button>
              </form>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                Payment integration is pending. Topup requests are recorded as PENDING transactions.
              </div>
            </Panel>

            <Panel title="Recent Wallet Transactions">
              {transactions.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No transactions yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {transactions.map((transaction) => (
                    <div key={transaction.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.7rem' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {transaction.type === 'DEBIT' ? '-' : '+'} INR {transaction.amount.toFixed(2)}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.86rem' }}>{transaction.source} ({transaction.status})</div>
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

function StatsCard({ title, value, prefix = '', color }: { title: string; value: string; prefix?: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem' }}>
      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{title}</div>
      <div style={{ color, fontSize: '1.5rem', fontWeight: 700 }}>{prefix}{value}</div>
    </div>
  )
}
