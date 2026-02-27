'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

export default function LoyaltyConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [config, setConfig] = useState({
        pointsPerOrderCurrency: 1,
        pointsForSignUp: 50,
        pointsForReferral: 100,
        minOrderForPoints: 0,
        isActive: true
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/loyalty/config');
            const data = await res.json();
            if (data.success && data.config) {
                setConfig({
                    pointsPerOrderCurrency: data.config.pointsPerOrderCurrency,
                    pointsForSignUp: data.config.pointsForSignUp,
                    pointsForReferral: data.config.pointsForReferral,
                    minOrderForPoints: data.config.minOrderForPoints,
                    isActive: data.config.isActive
                });
            }
        } catch (error) {
            console.error('Error fetching config:', error);
            setMessage({ text: 'Failed to load configuration', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/loyalty/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ text: 'Configuration saved successfully', type: 'success' });
            } else {
                setMessage({ text: data.error || 'Failed to save', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving config:', error);
            setMessage({ text: 'An unexpected error occurred', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout userRole="SUPER_ADMIN">
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '0.5rem'
                    }}>
                        Loyalty Configuration
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                        Set the rules for earning points and referral rewards
                    </p>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                            Program Rules
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: config.isActive ? '#10b981' : '#6b7280'
                            }}>
                                {config.isActive ? 'Program Active' : 'Program Paused'}
                            </span>
                            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    style={{ display: 'none' }}
                                    checked={config.isActive}
                                    onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                                />
                                <div style={{
                                    width: '2.75rem',
                                    height: '1.5rem',
                                    backgroundColor: config.isActive ? '#2563eb' : '#e5e7eb',
                                    borderRadius: '9999px',
                                    position: 'relative',
                                    transition: 'background-color 0.2s'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '50%',
                                        height: '1.25rem',
                                        width: '1.25rem',
                                        transition: 'transform 0.2s',
                                        transform: config.isActive ? 'translateX(100%)' : 'translateX(0)'
                                    }}></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>

                        {message && (
                            <div style={{
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '1.5rem',
                                backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: message.type === 'success' ? '#047857' : '#b91c1c'
                            }}>
                                {message.text}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* Points per Currency */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                    Points per Currency Unit
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    How many points user gets for every ₹1 spent
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    style={inputStyle}
                                    value={config.pointsPerOrderCurrency}
                                    onChange={(e) => setConfig({ ...config, pointsPerOrderCurrency: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Min Order */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                    Minimum Order Value
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    Min amount needed to earn points
                                </p>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.75rem', top: '0.5rem', color: '#6b7280' }}>₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        style={{ ...inputStyle, paddingLeft: '1.75rem' }}
                                        value={config.minOrderForPoints}
                                        onChange={(e) => setConfig({ ...config, minOrderForPoints: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #f3f4f6', margin: '1.5rem 0' }} />

                        <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#111827', marginBottom: '1rem' }}>Bonus Points</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* Sign Up Bonus */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                    Sign Up Bonus
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    Points given to user immediately on registration
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    style={inputStyle}
                                    value={config.pointsForSignUp}
                                    onChange={(e) => setConfig({ ...config, pointsForSignUp: parseInt(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Referral Bonus */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                    Referral Reward
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    Points given to both referrer and referee
                                </p>
                                <input
                                    type="number"
                                    min="0"
                                    style={inputStyle}
                                    value={config.pointsForReferral}
                                    onChange={(e) => setConfig({ ...config, pointsForReferral: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' }}>
                            <button
                                type="submit"
                                disabled={saving || loading}
                                style={{
                                    padding: '0.625rem 1.5rem',
                                    backgroundColor: saving ? '#93c5fd' : '#2563eb',
                                    color: 'white',
                                    fontWeight: '500',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
};
