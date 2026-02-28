'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { getApiUrl } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import {
    Store, Shield, Star, AlertTriangle,
    Loader2, Plus, Trash2, Copy, Check,
} from 'lucide-react';

interface PublicResource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    network: 'SEPOLIA';
    token: 'ETH';
    isActive: boolean;
    createdAt: string;
    trustScore: number;
    trustLabel: string;
}

interface MyResource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    url: string | null;
    network: 'SEPOLIA';
    token: 'ETH';
    isActive: boolean;
    createdAt: string;
}

function TrustBadge({ score, label }: { score: number; label: string }) {
    const getColor = () => {
        if (score >= 85) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
        if (score >= 70) return { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' };
        if (score >= 55) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
        if (score >= 40) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
    };

    const getIcon = () => {
        if (score >= 70) return <Shield size={12} />;
        if (score >= 40) return <Star size={12} />;
        return <AlertTriangle size={12} />;
    };

    const colors = getColor();

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
            {getIcon()}
            {label} · {score}
        </div>
    );
}

const CARD_BGS = ['/marketplace/1.png', '/marketplace/2.png', '/marketplace/3.png'];

function getCardBg(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return CARD_BGS[Math.abs(hash) % CARD_BGS.length];
}

function ResourceCard({ resource, trustScore, trustLabel, onDelete }: {
    resource: PublicResource | MyResource;
    trustScore?: number;
    trustLabel?: string;
    onDelete?: (id: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const API_URL = getApiUrl();
        const url = `${API_URL}/gateway/resource/${resource.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-2xl border border-white/10 hover:border-[#375BD2]/50 transition-all duration-300 group shadow-xl shadow-black/50 flex flex-col overflow-hidden relative">
            {/* Background image */}
            <NextImage
                src={getCardBg(resource.id)}
                alt=""
                fill
                className="object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

            {/* Card content */}
            <div className="relative z-10 p-6 flex flex-col flex-1">
                {/* Top row: network + type + badge */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-white/10 text-white/80 border border-white/15 backdrop-blur-sm">
                            {resource.network}
                        </div>
                        <span className="text-xs font-bold uppercase text-white/60 tracking-wider">
                            {resource.type}
                        </span>
                    </div>
                    {trustScore !== undefined && trustLabel && (
                        <TrustBadge score={trustScore} label={trustLabel} />
                    )}
                </div>

                {/* Title + description */}
                <div className="mb-4">
                    <Link href={`/dashboard/resources/${resource.id}`} className="text-lg font-bold text-white mb-2 truncate block hover:text-[#7BA1FF] transition-colors">
                        {resource.title}
                    </Link>
                    <p className="text-white/50 text-sm line-clamp-2 h-10">
                        {resource.description || 'No description provided'}
                    </p>
                </div>

                {/* Copy Gateway URL */}
                <div className="mb-4">
                    <label className="text-[10px] uppercase font-bold text-white/40 block mb-2 tracking-wider">Gateway URL</label>
                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm">
                        <code className="text-[10px] text-[#7BA1FF] truncate flex-1 font-mono">
                            {`${getApiUrl()}/gateway/resource/${resource.id}`}
                        </code>
                        <button
                            onClick={handleCopy}
                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${copied ? 'text-green-400 bg-green-500/20' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            title="Copy URL"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                    </div>
                </div>

                {/* Footer: price + actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-white tracking-tight">
                            {resource.price > 0 ? resource.price.toFixed(5) : 'Free'}
                            {resource.price > 0 && <span className="ml-1 text-sm font-medium text-white/50">ETH</span>}
                        </span>
                    </div>
                    {onDelete && (
                        <button
                            onClick={() => onDelete(resource.id)}
                            className="p-2.5 text-white/40 hover:text-[#dc2626] hover:bg-[#dc2626]/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Resource"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDeleting }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; isDeleting: boolean }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#375BD2] to-[#ef4444]" />

                <div className="flex items-center gap-3 text-[#ef4444]">
                    <AlertTriangle size={24} />
                    <h3 className="text-xl font-bold text-[#F4F4F5]">Delete Resource?</h3>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed">
                    This action cannot be undone. This resource will be permanently removed.
                </p>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-gray-400 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-[#dc2626]/80 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 p-6 animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg" />
                    <div className="w-16 h-4 bg-white/5 rounded mt-3" />
                </div>
                <div className="w-20 h-6 bg-white/5 rounded-full" />
            </div>
            <div className="space-y-3 mb-6">
                <div className="w-3/4 h-6 bg-white/5 rounded" />
                <div className="w-full h-4 bg-white/5 rounded" />
            </div>
            <div className="flex gap-2 mb-4">
                <div className="w-14 h-5 bg-white/5 rounded-full" />
                <div className="w-14 h-5 bg-white/5 rounded-full" />
            </div>
            <div className="border-t border-white/5 pt-4 flex justify-between">
                <div className="w-24 h-8 bg-white/5 rounded" />
                <div className="w-20 h-8 bg-white/5 rounded-xl" />
            </div>
        </div>
    );
}

export default function MarketplacePage() {
    const { isAuthenticated } = useAuth();
    const [allResources, setAllResources] = useState<PublicResource[]>([]);
    const [myResources, setMyResources] = useState<MyResource[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [isLoadingMine, setIsLoadingMine] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const API_URL = getApiUrl();
        setIsLoadingAll(true);
        setError(null);

        fetch(`${API_URL}/explore`)
            .then(r => r.ok ? r.json() : Promise.reject('Failed to load resources'))
            .then(data => setAllResources(data.resources ?? []))
            .catch(err => setError(typeof err === 'string' ? err : err.message))
            .finally(() => setIsLoadingAll(false));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        const API_URL = getApiUrl();
        const token = localStorage.getItem('auth_token');
        setIsLoadingMine(true);
        fetch(`${API_URL}/resources`, {
            credentials: 'include',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load your resources');
                return res.json();
            })
            .then(data => setMyResources(data.resources ?? []))
            .catch(() => {})
            .finally(() => setIsLoadingMine(false));
    }, [isAuthenticated]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        const API_URL = getApiUrl();
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_URL}/resources/${deleteId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('Delete failed');
            setMyResources(prev => prev.filter(r => r.id !== deleteId));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleteId(null);
            setIsDeleting(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <Store className="text-[#375BD2]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-[#F4F4F5]">Marketplace</h2>
                        <p className="text-gray-400 text-sm">Discover and manage data resources</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {isLoadingAll ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                                {allResources.length} resources available
                            </>
                        )}
                    </div>
                    {isAuthenticated && (
                        <Link
                            href="/dashboard/resources/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#375BD2] to-[#2B4ABF] hover:opacity-90 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={18} /> Add Resource
                        </Link>
                    )}
                </div>
            </div>

            {/* Hero Banner */}
            <div className="relative w-full h-[200px] rounded-2xl overflow-hidden mb-8 border border-white/10">
                <NextImage
                    src="/marketplace/banner.png"
                    alt="Marketplace banner"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-10">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                        Discover Premium Resources
                    </h1>
                    <p className="text-gray-300 text-lg max-w-lg">
                        Trade verified data assets with on-chain escrow protection
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-[#dc2626]/10 border border-[#dc2626]/30 text-[#ef4444] p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* Tab Switcher — centered */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                            ? 'bg-[#375BD2] text-white shadow-lg shadow-[#375BD2]/20'
                            : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        All Resources
                    </button>
                    {isAuthenticated && (
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mine'
                                ? 'bg-[#375BD2] text-white shadow-lg shadow-[#375BD2]/20'
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            My Resources
                            {myResources.length > 0 && (
                                <span className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                                    {myResources.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* All Resources Tab */}
            {activeTab === 'all' && (
                <>
                    {isLoadingAll ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <CardSkeleton key={i} />
                            ))}
                        </div>
                    ) : allResources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-[#0a0a0f] rounded-2xl border border-white/5">
                            <div className="p-4 bg-white/5 rounded-full mb-4">
                                <Store size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400 font-medium">No resources available yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allResources.map((resource) => (
                                <ResourceCard
                                    key={resource.id}
                                    resource={resource}
                                    trustScore={resource.trustScore}
                                    trustLabel={resource.trustLabel}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* My Resources Tab */}
            {activeTab === 'mine' && isAuthenticated && (
                <>
                    {isLoadingMine ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <CardSkeleton key={i} />
                            ))}
                        </div>
                    ) : myResources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-[#0a0a0f] rounded-2xl border border-white/5">
                            <div className="p-4 bg-white/5 rounded-full mb-4">
                                <Store size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400 mb-6 font-medium">No resources yet</p>
                            <Link
                                href="/dashboard/resources/new"
                                className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold text-sm text-[#F4F4F5] transition-all"
                            >
                                <Plus size={16} /> Create Your First Resource
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myResources.map((resource) => (
                                <ResourceCard
                                    key={resource.id}
                                    resource={resource}
                                    onDelete={(id) => setDeleteId(id)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <DeleteConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
