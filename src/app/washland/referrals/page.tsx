'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

interface Referral {
    id: string;
    code: string;
    referrer: {
        id: string;
        name: string;
        email: string;
    };
    referred: {
        id: string;
        name: string;
        email: string;
    } | null;
    status: 'PENDING' | 'REWARDED' | 'REVOKED';
    createdAt: string;
    rewardedAt: string | null;
}

export default function ReferralsPage() {
    const router = useRouter();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        rewarded: 0,
        pending: 0
    });

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        try {
            const res = await fetch('/api/admin/referrals');
            const data = await res.json();
            if (data.success) {
                setReferrals(data.referrals);

                // Calculate stats
                const total = data.referrals.length;
                const rewarded = data.referrals.filter((r: Referral) => r.status === 'REWARDED').length;
                const pending = data.referrals.filter((r: Referral) => r.status === 'PENDING').length;
                setStats({ total, rewarded, pending });
            }
        } catch (error) {
            console.error('Error fetching referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REWARDED': return '#10b981'; // Green
            case 'REVOKED': return '#ef4444';  // Red
            default: return '#f59e0b';         // Yellow
        }
    };

    const statusLabelMap: Record<string, string> = {
        'REWARDED': 'Rewarded',
        'REVOKED': 'Revoked',
        'PENDING': 'Pending'
    };

    return (
        <DashboardLayout userRole="SUPER_ADMIN">
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#111827',
                                marginBottom: '0.5rem'
                            }}>
                                Referrals
                            </h1>
                            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                                Track and manage user referrals
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <StatsCard
                            title="Total Referrals"
                            value={stats.total.toString()}
                            icon={<UsersIcon />}
                            color="#3b82f6"
                        />
                        <StatsCard
                            title="Rewarded"
                            value={stats.rewarded.toString()}
                            icon={<CheckCircleIcon />}
                            color="#10b981"
                        />
                        <StatsCard
                            title="Pending"
                            value={stats.pending.toString()}
                            icon={<ClockIcon />}
                            color="#f59e0b"
                        />
                    </div>
                </div>

                {/* Referrals Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                            All Referrals ({stats.total})
                        </h3>
                    </div>

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            Loading referrals...
                        </div>
                    ) : referrals.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            No referrals found
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                    <tr>
                                        <th style={tableHeaderStyle}>Code</th>
                                        <th style={tableHeaderStyle}>Referrer</th>
                                        <th style={tableHeaderStyle}>Referred User</th>
                                        <th style={tableHeaderStyle}>Status</th>
                                        <th style={tableHeaderStyle}>Date</th>
                                    </tr>
                                </thead>
                                <tbody style={{ divideY: '1px solid #f3f4f6' }}>
                                    {referrals.map((referral) => (
                                        <tr key={referral.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tableCellStyle}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                                                    {referral.code}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <div>
                                                    <div style={{ fontWeight: '500', color: '#111827' }}>{referral.referrer.name}</div>
                                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{referral.referrer.email}</div>
                                                </div>
                                            </td>
                                            <td style={tableCellStyle}>
                                                {referral.referred ? (
                                                    <div>
                                                        <div style={{ fontWeight: '500', color: '#111827' }}>{referral.referred.name}</div>
                                                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{referral.referred.email}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unclaimed</span>
                                                )}
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    backgroundColor: `${getStatusColor(referral.status)}1a`,
                                                    color: getStatusColor(referral.status)
                                                }}>
                                                    {statusLabelMap[referral.status]}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {new Date(referral.createdAt).toLocaleDateString()}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                                    {new Date(referral.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)

const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M9 11l3 3L22 4" />
    </svg>
)

const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
)
