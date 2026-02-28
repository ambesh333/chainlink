'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Globe, TrendingUp, Zap, Shield, ArrowRight, Terminal, Loader2, Wallet, CheckCircle, Clock, Image, Video, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';

interface DashboardStats {
    totalResources: number;
    activeResources: number;
    totalTransactions: number;
    revenue: string;
    pendingDisputes: number;
    trustScore: number;
    trustLabel: string;
    recentTransactions: RecentTransaction[];
}

interface RecentTransaction {
    id: string;
    title: string;
    type: string;
    price: number;
    status: string;
    date: string;
}

interface ResourceEarning {
    resourceId: string;
    title: string;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    isActive: boolean;
    pendingCount: number;
    pendingAmount: number;
    settlementRequestedCount: number;
    settlementRequestedAmount: number;
    settledCount: number;
    settledAmount: number;
    totalTransactions: number;
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function DashboardPage() {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [earnings, setEarnings] = useState<ResourceEarning[]>([]);
    const [totalPending, setTotalPending] = useState(0);
    const [totalSettlementRequested, setTotalSettlementRequested] = useState(0);
    const [totalSettled, setTotalSettled] = useState(0);

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchEarnings = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/resources/earnings`, {
                headers: getHeaders(),
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setEarnings(data.earnings);
                setTotalPending(data.totalPending);
                setTotalSettlementRequested(data.totalSettlementRequested);
                setTotalSettled(data.totalSettled);
            }
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = getApiUrl();
                const token = getToken();
                const res = await fetch(`${API_URL}/resources/stats`, {
                    credentials: 'include',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (e) {
                console.error('Failed to fetch dashboard stats:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [getToken]);

    useEffect(() => {
        fetchEarnings();
    }, [getToken]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={16} className="text-[#375BD2]" />;
            case 'VIDEO': return <Video size={16} className="text-[#5B7FE8]" />;
            default: return <ExternalLink size={16} className="text-[#8BA4F0]" />;
        }
    };

    const totalResources = stats?.totalResources ?? 0;
    const activeResources = stats?.activeResources ?? 0;
    const totalTransactions = stats?.totalTransactions ?? 0;
    const pendingDisputes = stats?.pendingDisputes ?? 0;
    const trustScore = stats?.trustScore ?? 0;
    const trustLabel = stats?.trustLabel ?? 'N/A';
    const recentTransactions = stats?.recentTransactions ?? [];

    const activePercent = totalResources > 0 ? Math.round((activeResources / totalResources) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={32} className="animate-spin text-[#375BD2]" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Overview</h2>
                <p className="text-gray-400">Welcome to your Chainlink Agent dashboard.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Resources */}
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Resources</h3>
                        <Package size={16} className="text-[#375BD2]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-[#375BD2]">{totalResources}</span>
                        <span className="text-sm text-gray-400">registered</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#375BD2] h-full" style={{ width: `${Math.min(100, totalResources * 10)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Data assets in your portfolio</p>
                </div>

                {/* Active Resources */}
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Resources</h3>
                        <Zap size={16} className="text-[#4CAF50]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-[#4CAF50]">{activeResources}</span>
                        <span className="text-sm text-gray-400">live</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#4CAF50] h-full" style={{ width: `${activePercent}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Currently available on the network</p>
                </div>

                {/* Trust Score */}
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Trust Score</h3>
                        <Shield size={16} className="text-[#4C8BF5]" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-[#4C8BF5]">{trustScore}</span>
                        <span className="text-sm text-gray-400">/ 100</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#375BD2] to-[#4C8BF5] h-full" style={{ width: `${trustScore}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{trustLabel}</p>
                </div>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Total Transactions</h3>
                    <span className="text-3xl font-mono font-bold text-white">{totalTransactions}</span>
                    <p className="text-xs text-gray-500 mt-2">All-time completed purchases</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Awaiting Settlement</h3>
                        <Clock size={14} className="text-[#375BD2]" />
                    </div>
                    <span className="text-3xl font-mono font-bold text-[#375BD2]">{(totalPending + totalSettlementRequested).toFixed(5)} <span className="text-lg text-gray-500">ETH</span></span>
                    <p className="text-xs text-gray-500 mt-2">Pending + awaiting CRE workflow</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Settled</h3>
                        <CheckCircle size={14} className="text-green-400" />
                    </div>
                    <span className="text-3xl font-mono font-bold text-green-400">{totalSettled.toFixed(5)} <span className="text-lg text-gray-500">ETH</span></span>
                    <p className="text-xs text-gray-500 mt-2">Successfully settled to your wallet</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Pending Disputes</h3>
                    <span className="text-3xl font-mono font-bold text-yellow-400">{pendingDisputes}</span>
                    <p className="text-xs text-gray-500 mt-2">Awaiting AI resolution</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Link href="/dashboard/resources/new"
                    className="flex items-center gap-3 p-4 bg-[#375BD2]/10 border border-[#375BD2]/20 rounded-xl hover:bg-[#375BD2]/20 transition-colors group">
                    <Package size={20} className="text-[#375BD2]" />
                    <span className="text-white font-medium">Add Resource</span>
                    <ArrowRight size={16} className="text-gray-500 ml-auto group-hover:text-[#375BD2] transition-colors" />
                </Link>
                <Link href="/dashboard/explore"
                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                    <Globe size={20} className="text-[#4C8BF5]" />
                    <span className="text-white font-medium">Browse Marketplace</span>
                    <ArrowRight size={16} className="text-gray-500 ml-auto group-hover:text-[#4C8BF5] transition-colors" />
                </Link>
                <Link href="/dashboard/demo"
                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                    <Terminal size={20} className="text-gray-400" />
                    <span className="text-white font-medium">Try Agent Demo</span>
                    <ArrowRight size={16} className="text-gray-500 ml-auto group-hover:text-white transition-colors" />
                </Link>
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden mb-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <TrendingUp size={18} className="text-[#375BD2]" />
                        Recent Transactions
                    </h3>
                    {recentTransactions.length === 0 && (
                        <span className="text-xs text-gray-500">No transactions yet</span>
                    )}
                </div>
                <div className="divide-y divide-white/5">
                    {recentTransactions.length === 0 ? (
                        <div className="px-6 py-8 text-center text-gray-500 text-sm">
                            No transactions yet. Your transaction history will appear here.
                        </div>
                    ) : (
                        recentTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                                <div className={`w-2 h-2 rounded-full ${tx.status === 'SETTLED' ? 'bg-green-400' : tx.status === 'SETTLEMENT_REQUESTED' ? 'bg-[#375BD2]' : tx.status === 'REFUND_REQUESTED' ? 'bg-red-400' : tx.status === 'REFUNDED' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{tx.title}</p>
                                    <p className="text-gray-500 text-xs">{timeAgo(tx.date)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500 uppercase">{tx.type}</span>
                                    <span className="text-white text-sm font-mono">{tx.price} ETH</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        tx.status === 'SETTLED' ? 'bg-green-500/10 text-green-400' :
                                        tx.status === 'SETTLEMENT_REQUESTED' ? 'bg-[#375BD2]/10 text-[#375BD2]' :
                                        tx.status === 'REFUND_REQUESTED' ? 'bg-red-500/10 text-red-400' :
                                        tx.status === 'REFUNDED' ? 'bg-red-500/10 text-red-400' :
                                        'bg-yellow-500/10 text-yellow-400'
                                    }`}>{tx.status === 'REFUND_REQUESTED' ? 'DISPUTED' : tx.status === 'SETTLEMENT_REQUESTED' ? 'AWAITING CRE' : tx.status}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Earnings Table */}
            <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Wallet size={18} className="text-[#375BD2]" />
                        Earnings by Resource
                    </h3>
                </div>
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_100px_130px_130px_130px_120px] gap-4 px-6 py-4 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                    <div>Resource</div>
                    <div>Price</div>
                    <div>Pending</div>
                    <div>Awaiting CRE</div>
                    <div>Settled</div>
                    <div className="text-right">Status</div>
                </div>

                {/* Table Body */}
                {earnings.length === 0 ? (
                    <div className="p-12 text-center">
                        <Wallet className="w-10 h-10 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-500">No resources with transactions yet</p>
                    </div>
                ) : (
                    earnings.map((item) => {
                        const hasAwaitingCRE = item.settlementRequestedCount > 0;
                        const hasPending = item.pendingCount > 0;
                        const allSettled = !hasPending && !hasAwaitingCRE && item.settledCount > 0;

                        return (
                            <div
                                key={item.resourceId}
                                className="grid grid-cols-[1fr_100px_130px_130px_130px_120px] gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
                            >
                                {/* Resource */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white/5 rounded-lg shrink-0">
                                        {getTypeIcon(item.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm text-white font-medium truncate">{item.title}</div>
                                        <div className="text-xs text-gray-500">{item.type}</div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="font-mono text-sm text-gray-400">
                                    {item.price.toFixed(4)}
                                    <span className="text-gray-600 text-xs ml-1">ETH</span>
                                </div>

                                {/* Pending */}
                                <div>
                                    <div className={`font-mono text-sm font-medium ${hasPending ? 'text-yellow-400' : 'text-gray-600'}`}>
                                        {item.pendingAmount.toFixed(5)} ETH
                                    </div>
                                    <div className="text-xs text-gray-600">{item.pendingCount} txn{item.pendingCount !== 1 ? 's' : ''}</div>
                                </div>

                                {/* Awaiting CRE */}
                                <div>
                                    <div className={`font-mono text-sm font-medium ${hasAwaitingCRE ? 'text-[#375BD2]' : 'text-gray-600'}`}>
                                        {item.settlementRequestedAmount.toFixed(5)} ETH
                                    </div>
                                    <div className="text-xs text-gray-600">{item.settlementRequestedCount} txn{item.settlementRequestedCount !== 1 ? 's' : ''}</div>
                                </div>

                                {/* Settled */}
                                <div>
                                    <div className="font-mono text-sm text-green-400">
                                        {item.settledAmount.toFixed(5)} ETH
                                    </div>
                                    <div className="text-xs text-gray-600">{item.settledCount} txn{item.settledCount !== 1 ? 's' : ''}</div>
                                </div>

                                {/* Status */}
                                <div className="text-right">
                                    {hasAwaitingCRE ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#375BD2]/10 text-[#375BD2] border border-[#375BD2]/20">
                                            <Loader2 size={12} className="animate-spin" />
                                            Awaiting CRE
                                        </span>
                                    ) : hasPending ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                            <Clock size={12} />
                                            Pending
                                        </span>
                                    ) : allSettled ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-green-500/60">
                                            <CheckCircle size={12} />
                                            Settled
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-600">—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
