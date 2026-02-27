'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

interface LoyaltyPoint {
    id: string;
    points: number;
    source: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    expiresAt: string | null;
    createdAt: string;
}

export default function LoyaltyPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<LoyaltyPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPoints: 0,
        totalTransactions: 0
    });

    useEffect(() => {
        fetchLoyaltyPoints();
    }, []);

    const fetchLoyaltyPoints = async () => {
        try {
            const res = await fetch('/api/admin/loyalty');
            const data = await res.json();
            if (data.success) {
                setTransactions(data.points);

                // Calculate stats
                const totalTransactions = data.points.length;
                const totalPoints = data.points.reduce((sum: number, p: LoyaltyPoint) => sum + p.points, 0);
                setStats({ totalPoints, totalTransactions });
            }
        } catch (error) {
            console.error('Error fetching loyalty points:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole="SUPER_ADMIN">
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#111827',
                                marginBottom: '0.5rem'
                            }}>
                                Loyalty Points
                            </h1>
                            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                                Track customer loyalty points history
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <StatsCard
                            title="Total Points Issued"
                            value={stats.totalPoints.toLocaleString()}
                            icon={<StarIcon />}
                            color="#3b82f6"
                        />
                        <StatsCard
                            title="Total Transactions"
                            value={stats.totalTransactions.toString()}
                            icon={<ListIcon />}
                            color="#10b981"
                        />
                    </div>
                </div>

                {/* Transactions List */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                            Points History ({stats.totalTransactions})
                        </h3>
                    </div>

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            Loading loyalty history...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            No loyalty history found
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                    <tr>
                                        <th style={tableHeaderStyle}>User</th>
                                        <th style={tableHeaderStyle}>Points</th>
                                        <th style={tableHeaderStyle}>Source</th>
                                        <th style={tableHeaderStyle}>Expires</th>
                                        <th style={tableHeaderStyle}>Date</th>
                                    </tr>
                                </thead>
                                <tbody style={{ divideY: '1px solid #f3f4f6' }}>
                                    {transactions.map((t) => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tableCellStyle}>
                                                <div>
                                                    <div style={{ fontWeight: '500', color: '#111827' }}>{t.user.name}</div>
                                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{t.user.email}</div>
                                                </div>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{ fontWeight: '700', color: '#2563eb' }}>
                                                    +{t.points}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    backgroundColor: '#f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {t.source}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : 'Never'}
                                                </div>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

// Helper Components & Styles
interface StatsCardProps {
    title: string
    value: string
    icon: React.ReactNode
    color: string
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
    return (
        <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: `${color}1a`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {title}
                </div>
            </div>
        </div>
    )
}

const tableHeaderStyle = {
    padding: '0.75rem 1rem',
    textAlign: 'left' as const,
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
}

const tableCellStyle = {
    padding: '1rem',
    fontSize: '0.875rem'
}

// Icons
const StarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
)

const ListIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
)
