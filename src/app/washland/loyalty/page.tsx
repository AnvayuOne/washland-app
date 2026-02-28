'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface LoyaltyUserSummary {
  userId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  pointsBalance: number
  lifetimePointsEarned: number
  lifetimePointsRedeemed: number
  lastActivityAt: string
  lastSource: string
}

interface LoyaltyTransaction {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  points: number
  source: string
  createdAt: string
  expiresAt: string | null
}

export default function LoyaltyPage() {
  const [users, setUsers] = useState<LoyaltyUserSummary[]>([])
  const [recentTransactions, setRecentTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchLoyaltyReport()
  }, [])

  async function fetchLoyaltyReport() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/admin/loyalty')
      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load loyalty report')
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
      setRecentTransactions(Array.isArray(data.recentTransactions) ? data.recentTransactions : [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load loyalty report')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalCustomers = users.length
    const totalPointsBalance = users.reduce((sum, user) => sum + user.pointsBalance, 0)
    const totalPointsEarned = users.reduce((sum, user) => sum + user.lifetimePointsEarned, 0)
    const totalPointsRedeemed = users.reduce((sum, user) => sum + user.lifetimePointsRedeemed, 0)

    return {
      totalCustomers,
      totalPointsBalance,
      totalPointsEarned,
      totalPointsRedeemed,
    }
  }, [users])

  return (
    <DashboardLayout userRole="SUPER_ADMIN">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
            Loyalty Report
          </h1>
          <p style={{ color: '#6b7280' }}>Per-customer balance and recent loyalty activity</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatsCard title="Customers" value={stats.totalCustomers.toLocaleString()} color="#2563eb" />
          <StatsCard title="Points Balance" value={stats.totalPointsBalance.toLocaleString()} color="#16a34a" />
          <StatsCard title="Lifetime Earned" value={stats.totalPointsEarned.toLocaleString()} color="#7c3aed" />
          <StatsCard title="Lifetime Redeemed" value={stats.totalPointsRedeemed.toLocaleString()} color="#ea580c" />
        </div>

        {loading ? (
          <Panel title="Loading">Loading loyalty report...</Panel>
        ) : error ? (
          <Panel title="Error">{error}</Panel>
        ) : (
          <>
            <Panel title={`Customer Balances (${users.length})`}>
              {users.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No loyalty activity found.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <Th>Customer</Th>
                        <Th>Email</Th>
                        <Th>Balance</Th>
                        <Th>Earned</Th>
                        <Th>Redeemed</Th>
                        <Th>Last Activity</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.userId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <Td>{user.fullName || `${user.firstName} ${user.lastName}`}</Td>
                          <Td>{user.email}</Td>
                          <Td>{user.pointsBalance}</Td>
                          <Td>{user.lifetimePointsEarned}</Td>
                          <Td>{user.lifetimePointsRedeemed}</Td>
                          <Td>{new Date(user.lastActivityAt).toLocaleString()} ({user.lastSource})</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Recent Transactions">
              {recentTransactions.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No transactions found.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.65rem' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {transaction.fullName} ({transaction.email})
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#64748b' }}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} points via {transaction.source}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(transaction.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function StatsCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem' }}>
      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{title}</div>
      <div style={{ color, fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem' }}>
      <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#0f172a' }}>{title}</h2>
      {children}
    </section>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '0.5rem', color: '#64748b', fontSize: '0.78rem' }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.55rem', color: '#0f172a', fontSize: '0.9rem' }}>{children}</td>
}
