'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface OrderStat {
    status: string;
    count: number;
}

interface DailyRevenue {
    date: string;
    amount: number;
    displayDate: string;
}

export default function OrderAnalyticsPage() {
    const [stats, setStats] = useState<{
        totalRevenue: number;
        ordersByStatus: OrderStat[];
        dailyRevenue: DailyRevenue[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/admin/orders/analytics');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const maxDailyRevenue = stats?.dailyRevenue.reduce((max, d) => Math.max(max, d.amount), 0) || 1;

    // Status colors
    const statusColors: Record<string, string> = {
        'PENDING': 'bg-yellow-500',
        'CONFIRMED': 'bg-blue-500',
        'PICKED_UP': 'bg-purple-500',
        'IN_PROCESS_WASHING': 'bg-indigo-500',
        'IN_PROCESS_IRONING': 'bg-pink-500',
        'IN_PROCESS_DRY_CLEANING': 'bg-cyan-500',
        'READY_FOR_DELIVERY': 'bg-teal-500',
        'OUT_FOR_DELIVERY': 'bg-orange-500',
        'DELIVERED': 'bg-green-600',
        'CANCELLED': 'bg-red-500'
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
                                Order Analytics
                            </h1>
                            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                                Revenue and order volume insights
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading analytics...</div>
                ) : !stats ? (
                    <div className="text-center py-20 text-gray-500">Failed to load analytics</div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Top Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                            <StatsCard
                                title="Total Revenue (All Time)"
                                value={`₹${stats.totalRevenue.toLocaleString()}`}
                                icon={<BanknoteIcon />}
                                color="#10b981"
                            />
                            <StatsCard
                                title="Active Orders"
                                value={stats.ordersByStatus.reduce((sum, s) => ['DELIVERED', 'CANCELLED'].includes(s.status) ? sum : sum + s.count, 0).toString()}
                                icon={<ShoppingBagIcon />}
                                color="#3b82f6"
                            />
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Daily Revenue Chart */}
                            <div style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                                    Revenue Trend (Last 7 Days)
                                </h3>

                                <div className="flex items-end justify-between h-64 gap-2">
                                    {stats.dailyRevenue.map((day) => (
                                        <div key={day.date} className="flex flex-col items-center flex-1 group">
                                            <div className="relative w-full flex items-end justify-center h-full">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                                    ₹{day.amount.toLocaleString()}
                                                </div>
                                                {/* Bar */}
                                                <div
                                                    className="bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors w-full mx-1"
                                                    style={{
                                                        height: `${(day.amount / maxDailyRevenue) * 100}%`,
                                                        minHeight: '4px'
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500 font-medium rotate-0 truncate w-full text-center">
                                                {day.displayDate}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Order Status Breakdown */}
                            <div style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                                    Orders by Status
                                </h3>

                                <div className="space-y-4">
                                    {stats.ordersByStatus.map(status => (
                                        <div key={status.status}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700 capitalize">
                                                    {status.status.replace(/_/g, ' ').toLowerCase()}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">{status.count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${statusColors[status.status] || 'bg-gray-500'}`}
                                                    style={{
                                                        width: `${(status.count / stats.ordersByStatus.reduce((sum, s) => sum + s.count, 0)) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.ordersByStatus.length === 0 && (
                                        <div className="text-center text-gray-500 py-10">No order data available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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

// Icons
const BanknoteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
)

const ShoppingBagIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
)
