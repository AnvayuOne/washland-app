'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface ServiceCategory {
    id: string;
    name: string;
}

export default function ServiceFormPage({ params }: { params: Promise<{ id: string }> | undefined }) {
    const router = useRouter();
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        basePrice: '',
        categoryId: '',
        isActive: true
    });

    useEffect(() => {
        const init = async () => {
            // If params exists, we are editing
            if (params) {
                const { id } = await params;
                setServiceId(id);
                await fetchService(id);
            }
            await fetchCategories();
            setLoading(false);
        };
        init();
    }, [params]);

    const fetchCategories = async () => {
        try {
            // Reuse existing endpoint
            const res = await fetch('/api/admin/services/categories');
            const data = await res.json();
            if (data.success) setCategories(data.categories);
        } catch (e) {
            console.error(e);
        }
    }

    const fetchService = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/services/${id}`);
            const data = await res.json();
            if (data.success) {
                const s = data.service;
                setFormData({
                    name: s.name,
                    description: s.description || '',
                    basePrice: s.basePrice.toString(),
                    categoryId: s.categoryId || '', // This might be empty if legacy
                    isActive: s.isActive
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = serviceId
                ? `/api/admin/services/${serviceId}`
                : '/api/admin/services';

            const method = serviceId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/washland/services');
            } else {
                alert(data.error || 'Failed to save service');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole="SUPER_ADMIN">
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole="SUPER_ADMIN">
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {serviceId ? 'Edit Service' : 'Add New Service'}
                    </h1>
                    <Link href="/washland/services" style={{ color: '#2563eb', textDecoration: 'none' }}>
                        &larr; Back to Services
                    </Link>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Name */}
                        <div>
                            <label style={labelStyle}>Service Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. Men's Shirt"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select
                                required
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">Select a Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                <Link href="/washland/services/categories" target="_blank" style={{ color: '#2563eb' }}>
                                    Manage Categories &rarr;
                                </Link>
                            </div>
                        </div>

                        {/* Price */}
                        <div>
                            <label style={labelStyle}>Base Price (₹)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.basePrice}
                                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                style={inputStyle}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    minHeight: '100px'
                                }}
                                placeholder="Details about this service..."
                            />
                        </div>

                        {/* Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="isActive" style={{ fontWeight: '500', cursor: 'pointer' }}>
                                Service is Active
                            </label>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <Link
                                href="/washland/services"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    textDecoration: 'none',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Service'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

const labelStyle = {
    display: 'block',
    fontSize: '0.925rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
}

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const
}
