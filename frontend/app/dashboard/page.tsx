'use client';

import { useEffect, useState } from 'react';
import { Package, TrendingUp, Zap, Shield, Loader2, Wallet, CheckCircle, Clock, Image, Video, ExternalLink, Bot, ArrowLeft, ArrowUpRight, Link2, ArrowDownLeft, ArrowUpFromLine, AlertTriangle, Activity } from 'lucide-react';
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

interface Dispute {
    id: string;
    transactionId: string;
    agentId: string;
    amount: number;
    encryptedReason: string;
    resourceName: string;
    createdAt: string;
    receiptCode: string | null;
    escrowKey: string | null;
    status: 'REFUND_REQUESTED' | 'SETTLED' | 'REFUNDED';
    resolution: 'pending' | 'refunded_to_agent' | 'paid_to_merchant';
    resolvedAt: string | null;
    aiDecision: 'AI_VALID' | 'AI_INVALID' | null;
    aiReasoning: string | null;
    aiConfidence: number | null;
    aiAnalyzedAt: string | null;
    merchantExplanation: string | null;
    creStatus: 'CRE_PROCESSING' | 'CRE_RESOLVED' | null;
}

type TabKey = 'transactions' | 'earnings' | 'disputes';

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
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [disputesLoading, setDisputesLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('transactions');
    const [visible, setVisible] = useState(false);

    // Trigger animations once data is loaded
    useEffect(() => {
        if (!loading) {
            requestAnimationFrame(() => setVisible(true));
        }
    }, [loading]);

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

    const fetchDisputes = async () => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/disputes`, {
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setDisputes(data.disputes);
                if (selectedDispute) {
                    const updated = data.disputes.find((d: Dispute) => d.id === selectedDispute.id);
                    if (updated) setSelectedDispute(updated);
                }
            }
        } catch (error) {
            console.error('Failed to fetch disputes:', error);
        } finally {
            setDisputesLoading(false);
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

    useEffect(() => { fetchEarnings(); }, [getToken]);
    useEffect(() => { fetchDisputes(); }, [getToken]);

    // Auto-refresh disputes when CRE is processing
    useEffect(() => {
        const hasProcessing = disputes.some(d => d.resolution === 'pending');
        if (!hasProcessing) return;
        const interval = setInterval(fetchDisputes, 10000);
        return () => clearInterval(interval);
    }, [disputes]);

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

    // ============= DISPUTE HELPERS =============
    const getOutcomeBadge = (dispute: Dispute) => {
        if (dispute.resolution === 'paid_to_merchant') {
            return (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1.5">
                    <ArrowDownLeft size={10} />
                    Funds &rarr; Merchant
                </span>
            );
        }
        if (dispute.resolution === 'refunded_to_agent') {
            return (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                    <ArrowUpFromLine size={10} />
                    Refunded to Agent
                </span>
            );
        }
        if (dispute.creStatus === 'CRE_PROCESSING') {
            return (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#375BD2]/20 text-[#375BD2] border border-[#375BD2]/30 flex items-center gap-1.5">
                    <Loader2 size={10} className="animate-spin" />
                    CRE Processing
                </span>
            );
        }
        return (
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1.5">
                <Loader2 size={10} className="animate-spin" />
                Pending
            </span>
        );
    };

    const getStatusBadge = (dispute: Dispute) => {
        if (dispute.resolution !== 'pending') {
            return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">Resolved</span>;
        }
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Active</span>;
    };

    // ============= CRE TIMELINE =============
    const CRETimeline = ({ dispute }: { dispute: Dispute }) => {
        if (!dispute.escrowKey) return null;
        const isResolved = dispute.resolution !== 'pending';
        const steps = [
            { label: 'Dispute Raised', icon: <Zap size={14} />, done: true, description: 'On-chain DisputeRaised event emitted' },
            { label: 'CRE Processing', icon: <Loader2 size={14} className={dispute.creStatus === 'CRE_PROCESSING' ? 'animate-spin' : ''} />, done: dispute.creStatus === 'CRE_PROCESSING' || dispute.creStatus === 'CRE_RESOLVED' || !!dispute.aiDecision || isResolved, active: dispute.creStatus === 'CRE_PROCESSING', description: 'CRE workflow picks up event, calls AI via Confidential HTTP' },
            { label: 'AI Analysis', icon: <Bot size={14} />, done: !!dispute.aiDecision || dispute.creStatus === 'CRE_RESOLVED' || isResolved, description: dispute.aiReasoning || 'Dual-LLM AI analyzes dispute context' },
            { label: 'On-chain Resolution', icon: <Shield size={14} />, done: dispute.creStatus === 'CRE_RESOLVED' || isResolved, description: isResolved ? `Resolved: ${dispute.resolution === 'paid_to_merchant' ? 'Funds released to merchant' : 'Funds refunded to agent'}` : 'CRE writes resolution to DisputeConsumer contract' },
        ];

        return (
            <div className="mt-6 p-4 bg-[#0a0a1a] rounded-xl border border-[#375BD2]/20">
                <div className="flex items-center gap-2 mb-4">
                    <Link2 size={14} className="text-[#375BD2]" />
                    <span className="text-xs font-medium text-[#375BD2] uppercase tracking-wider">CRE Workflow Timeline</span>
                </div>
                <div className="space-y-0">
                    {steps.map((step, index) => (
                        <div key={step.label} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${step.done ? 'bg-[#375BD2]/20 border-[#375BD2]/50 text-[#375BD2]' : step.active ? 'bg-[#375BD2]/10 border-[#375BD2]/30 text-[#375BD2] animate-pulse' : 'bg-gray-800/50 border-gray-700 text-gray-600'}`}>
                                    {step.icon}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-px h-8 ${step.done ? 'bg-[#375BD2]/30' : 'bg-gray-800'}`} />
                                )}
                            </div>
                            <div className="pb-6">
                                <div className={`text-sm font-medium ${step.done ? 'text-white' : 'text-gray-500'}`}>
                                    {step.label}
                                    {step.active && <span className="ml-2 text-xs text-[#375BD2]">In Progress...</span>}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Escrow Key:</span>
                        <code className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded">
                            {dispute.escrowKey!.slice(0, 10)}...{dispute.escrowKey!.slice(-8)}
                        </code>
                    </div>
                </div>
            </div>
        );
    };

    // ============= DISPUTE DETAIL VIEW =============
    if (selectedDispute) {
        const dispute = disputes.find(d => d.id === selectedDispute.id) || selectedDispute;
        const isCREProcessing = dispute.creStatus === 'CRE_PROCESSING';
        const isResolved = dispute.resolution !== 'pending';
        const confidence = dispute.aiConfidence || 0;
        const isDisputeValid = dispute.aiDecision === 'AI_VALID';

        return (
            <div>
                <div className="flex items-center justify-center">
                    <div className="w-full max-w-lg">
                        <button onClick={() => setSelectedDispute(null)} className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 transition-colors text-sm">
                            <ArrowLeft size={16} />
                            <span>Back to Dashboard</span>
                        </button>

                        {isCREProcessing && (
                            <div className="mb-4 p-4 bg-[#375BD2]/10 rounded-xl border border-[#375BD2]/20 flex items-center gap-3">
                                <Loader2 size={18} className="text-[#375BD2] animate-spin" />
                                <div>
                                    <div className="text-sm font-medium text-[#375BD2]">CRE Resolution In Progress</div>
                                    <div className="text-xs text-gray-400">Chainlink CRE workflow is analyzing this dispute on-chain</div>
                                </div>
                            </div>
                        )}

                        {isResolved && (
                            <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 ${dispute.resolution === 'paid_to_merchant' ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                {dispute.resolution === 'paid_to_merchant' ? (
                                    <>
                                        <ArrowDownLeft size={18} className="text-green-400" />
                                        <div>
                                            <div className="text-sm font-medium text-green-400">Funds Released to You</div>
                                            <div className="text-xs text-gray-400">
                                                The dispute was found invalid — you kept the payment
                                                {dispute.resolvedAt && <span> on {new Date(dispute.resolvedAt).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpFromLine size={18} className="text-orange-400" />
                                        <div>
                                            <div className="text-sm font-medium text-orange-400">Refunded to Agent</div>
                                            <div className="text-xs text-gray-400">
                                                The dispute was found valid — funds were returned to the buyer
                                                {dispute.resolvedAt && <span> on {new Date(dispute.resolvedAt).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#141420] to-[#0f1a0f] rounded-3xl border border-white/10 overflow-hidden">
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[100px] opacity-30 ${isCREProcessing ? 'bg-[#375BD2]' : isResolved ? dispute.resolution === 'paid_to_merchant' ? 'bg-green-500' : 'bg-orange-500' : 'bg-gray-500'}`} />

                            <div className="relative p-6 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${isCREProcessing ? 'bg-[#375BD2]/20' : isResolved ? dispute.resolution === 'paid_to_merchant' ? 'bg-green-500/20' : 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                                        {isCREProcessing
                                            ? <Link2 size={18} className="text-[#375BD2]" />
                                            : <Bot size={18} className={isResolved ? dispute.resolution === 'paid_to_merchant' ? 'text-green-400' : 'text-orange-400' : 'text-gray-400'} />
                                        }
                                    </div>
                                    <span className="text-white font-medium">{isCREProcessing ? 'CRE Workflow' : 'AI Verdict'}</span>
                                </div>
                                <span className="px-3 py-1.5 bg-[#252525] rounded-full text-xs text-gray-300 border border-white/10">{dispute.resourceName}</span>
                            </div>

                            <div className="relative p-8">
                                {isCREProcessing ? (
                                    <div className="text-center py-4">
                                        <Loader2 size={40} className="text-[#375BD2] animate-spin mx-auto mb-4" />
                                        <div className="text-lg font-medium text-white mb-2">CRE Analyzing Dispute</div>
                                        <p className="text-gray-500 text-sm">The Chainlink CRE workflow has picked up the DisputeRaised event and is performing dual-LLM analysis via Confidential HTTP.</p>
                                    </div>
                                ) : (
                                    <>
                                        {dispute.aiDecision && (
                                            <div className="mb-6">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-7xl font-extralight text-white tracking-tight">{confidence}%</span>
                                                    <ArrowUpRight size={24} className={`mt-3 ${isDisputeValid ? 'text-red-400' : 'text-green-400'}`} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <span className="text-white font-medium">
                                                {dispute.aiDecision ? isDisputeValid ? 'Dispute was valid' : 'Dispute was invalid' : 'Awaiting AI analysis'}
                                            </span>
                                            {dispute.aiDecision && <span className="text-gray-500"> based on AI analysis.</span>}
                                        </div>
                                        {dispute.aiReasoning && (
                                            <p className="text-gray-600 text-sm leading-relaxed mb-6">{dispute.aiReasoning}</p>
                                        )}
                                        {dispute.encryptedReason && (
                                            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                                                <div className="text-xs text-gray-500 mb-2">Agent&apos;s Dispute Reason:</div>
                                                <p className="text-sm text-gray-300">{dispute.encryptedReason}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <CRETimeline dispute={dispute} />

                        <div className="mt-4 text-center">
                            <span className="text-gray-500 text-sm">Dispute Amount: </span>
                            <span className="text-white font-mono font-medium">{dispute.amount.toFixed(5)} ETH</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============= TABS CONFIG =============
    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'transactions', label: 'Recent Transactions', icon: <TrendingUp size={14} />, count: recentTransactions.length },
        { key: 'earnings', label: 'Earnings by Resource', icon: <Wallet size={14} />, count: earnings.length },
        { key: 'disputes', label: 'Disputes', icon: <AlertTriangle size={14} />, count: disputes.length },
    ];

    return (
        <div className="relative">
            {/* Ambient glow */}
            <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#375BD2]/5 rounded-full blur-[150px] animate-pulse-glow pointer-events-none" />
            <div className="absolute -top-20 right-1/4 w-72 h-72 bg-[#4C8BF5]/4 rounded-full blur-[120px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1.5s' }} />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* Total Resources */}
                <div
                    className={`feature-card group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: '0.1s' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#375BD2]/5 rounded-full blur-[60px] group-hover:bg-[#375BD2]/10 transition-colors duration-500 pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">Total Resources</h3>
                            <div className="w-8 h-8 rounded-lg bg-[#375BD2]/10 flex items-center justify-center group-hover:bg-[#375BD2]/20 group-hover:scale-110 transition-all duration-300">
                                <Package size={14} className="text-[#375BD2]" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-mono font-bold text-white group-hover:text-[#375BD2] transition-colors duration-300">{totalResources}</span>
                            <span className="text-sm text-gray-500">registered</span>
                        </div>
                        <div className="flex items-end gap-[3px] h-9">
                            {Array.from({ length: 28 }).map((_, i) => {
                                const filled = i < Math.min(28, Math.round((activeResources / Math.max(totalResources, 1)) * 28));
                                const intensity = filled ? 0.4 + (i / 28) * 0.6 : 0.08;
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-[2px] transition-all duration-500"
                                        style={{
                                            height: `${35 + Math.sin(i * 0.45) * 20 + (filled ? 45 : 0)}%`,
                                            background: filled
                                                ? `rgba(55, 91, 210, ${intensity})`
                                                : 'rgba(255,255,255,0.04)',
                                            transitionDelay: `${i * 20}ms`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-3">
                            {activePercent}% active{' '}
                            <span className="text-gray-700">•</span>{' '}
                            {activeResources} / {totalResources} resources
                        </p>
                    </div>
                </div>

                {/* Active Resources */}
                <div
                    className={`feature-card group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: '0.2s' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-[60px] group-hover:bg-[#10B981]/10 transition-colors duration-500 pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">Active Resources</h3>
                            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center group-hover:bg-[#10B981]/20 group-hover:scale-110 transition-all duration-300">
                                <Zap size={14} className="text-[#10B981]" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-mono font-bold text-white group-hover:text-[#10B981] transition-colors duration-300">{activeResources}</span>
                            <span className="text-sm text-gray-500">live</span>
                        </div>
                        {/* Segmented progress */}
                        <div className="flex gap-1 mt-5">
                            {Array.from({ length: 12 }).map((_, i) => {
                                const isFilled = i < Math.round((activePercent / 100) * 12);
                                return (
                                    <div
                                        key={i}
                                        className="flex-1 h-2 rounded-full transition-all duration-500"
                                        style={{
                                            background: isFilled
                                                ? `rgba(16, 185, 129, ${0.3 + (i / 12) * 0.7})`
                                                : 'rgba(255,255,255,0.04)',
                                            transitionDelay: `${i * 40}ms`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-3">Currently available on the network</p>
                    </div>
                </div>

                {/* Trust Score */}
                <div
                    className={`feature-card group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
                    style={{ animationDelay: '0.3s' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4C8BF5]/5 rounded-full blur-[60px] group-hover:bg-[#4C8BF5]/10 transition-colors duration-500 pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">Trust Score</h3>
                            <div className="w-8 h-8 rounded-lg bg-[#4C8BF5]/10 flex items-center justify-center group-hover:bg-[#4C8BF5]/20 group-hover:scale-110 transition-all duration-300">
                                <Shield size={14} className="text-[#4C8BF5]" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-mono font-bold text-white group-hover:text-[#4C8BF5] transition-colors duration-300">{trustScore}</span>
                            <span className="text-sm text-gray-500">/ 100</span>
                        </div>
                        {/* Arc-style progress */}
                        <div className="relative mt-5 h-2 rounded-full overflow-hidden bg-white/[0.04]">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${trustScore}%`,
                                    background: 'linear-gradient(90deg, #375BD2, #4C8BF5, #7C3AED)',
                                    boxShadow: '0 0 12px rgba(76, 139, 245, 0.4)',
                                }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-600 mt-3">{trustLabel}</p>
                    </div>
                </div>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    {
                        label: 'Total Transactions',
                        value: <span className="text-white">{totalTransactions}</span>,
                        sub: 'All-time completed purchases',
                        icon: <Activity size={13} />,
                        color: '#ffffff',
                        delay: '0.4s',
                    },
                    {
                        label: 'Awaiting Settlement',
                        value: <><span className="text-[#375BD2]">{(totalPending + totalSettlementRequested).toFixed(5)}</span> <span className="text-lg text-gray-600">ETH</span></>,
                        sub: 'Pending + awaiting CRE workflow',
                        icon: <Clock size={13} />,
                        color: '#375BD2',
                        delay: '0.5s',
                    },
                    {
                        label: 'Settled',
                        value: <><span className="text-[#10B981]">{totalSettled.toFixed(5)}</span> <span className="text-lg text-gray-600">ETH</span></>,
                        sub: 'Successfully settled to your wallet',
                        icon: <CheckCircle size={13} />,
                        color: '#10B981',
                        delay: '0.6s',
                    },
                    {
                        label: 'Pending Disputes',
                        value: <span className="text-yellow-400">{pendingDisputes}</span>,
                        sub: 'Awaiting AI resolution',
                        icon: <AlertTriangle size={13} />,
                        color: '#EAB308',
                        delay: '0.7s',
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className={`feature-card group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
                        style={{ animationDelay: card.delay }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">{card.label}</h3>
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                                style={{ background: `${card.color}10`, color: card.color }}
                            >
                                {card.icon}
                            </div>
                        </div>
                        <div className="text-2xl font-mono font-bold">{card.value}</div>
                        <p className="text-[11px] text-gray-600 mt-2">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Tabbed Section */}
            <div
                className={`rounded-2xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-sm overflow-hidden ${visible ? 'animate-fade-up' : 'opacity-0'}`}
                style={{ animationDelay: '0.8s' }}
            >
                {/* Tab Bar */}
                <div className="flex border-b border-white/[0.06]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-300 relative ${
                                activeTab === tab.key
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <span className={`transition-transform duration-300 ${activeTab === tab.key ? 'scale-110' : ''}`}>
                                {tab.icon}
                            </span>
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full transition-all duration-300 ${
                                    activeTab === tab.key
                                        ? 'bg-[#375BD2]/20 text-[#375BD2]'
                                        : 'bg-white/5 text-gray-500'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.key && (
                                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-[#375BD2] to-[#4C8BF5]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'transactions' && (
                    <div className="divide-y divide-white/5">
                        {recentTransactions.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-500 text-sm">
                                No transactions yet. Your transaction history will appear here.
                            </div>
                        ) : (
                            recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
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
                )}

                {activeTab === 'earnings' && (
                    <>
                        {/* Table Header */}
                        <div className="grid grid-cols-[1fr_100px_130px_130px_130px_120px] gap-4 px-6 py-4 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                            <div>Resource</div>
                            <div>Price</div>
                            <div>Pending</div>
                            <div>Awaiting CRE</div>
                            <div>Settled</div>
                            <div className="text-right">Status</div>
                        </div>

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
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-white/5 rounded-lg shrink-0">
                                                {getTypeIcon(item.type)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm text-white font-medium truncate">{item.title}</div>
                                                <div className="text-xs text-gray-500">{item.type}</div>
                                            </div>
                                        </div>
                                        <div className="font-mono text-sm text-gray-400">
                                            {item.price.toFixed(4)}
                                            <span className="text-gray-600 text-xs ml-1">ETH</span>
                                        </div>
                                        <div>
                                            <div className={`font-mono text-sm font-medium ${hasPending ? 'text-yellow-400' : 'text-gray-600'}`}>
                                                {item.pendingAmount.toFixed(5)} ETH
                                            </div>
                                            <div className="text-xs text-gray-600">{item.pendingCount} txn{item.pendingCount !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div>
                                            <div className={`font-mono text-sm font-medium ${hasAwaitingCRE ? 'text-[#375BD2]' : 'text-gray-600'}`}>
                                                {item.settlementRequestedAmount.toFixed(5)} ETH
                                            </div>
                                            <div className="text-xs text-gray-600">{item.settlementRequestedCount} txn{item.settlementRequestedCount !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div>
                                            <div className="font-mono text-sm text-green-400">
                                                {item.settledAmount.toFixed(5)} ETH
                                            </div>
                                            <div className="text-xs text-gray-600">{item.settledCount} txn{item.settledCount !== 1 ? 's' : ''}</div>
                                        </div>
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
                    </>
                )}

                {activeTab === 'disputes' && (
                    <>
                        {/* CRE Info Banner */}
                        {disputes.some(d => d.creStatus) && (
                            <div className="mx-6 mt-4 mb-2 p-3 bg-[#375BD2]/5 rounded-xl border border-[#375BD2]/10 flex items-center gap-3">
                                <Link2 size={14} className="text-[#375BD2]" />
                                <span className="text-xs text-gray-400">
                                    Disputes are automatically resolved by <span className="text-[#375BD2] font-medium">Chainlink CRE</span> workflows on-chain
                                </span>
                            </div>
                        )}

                        {/* Table Header */}
                        <div className="grid grid-cols-[60px_1fr_1fr_120px_100px_160px_100px] gap-4 px-6 py-4 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                            <div>No</div>
                            <div>Agent</div>
                            <div>Resource</div>
                            <div>Amount</div>
                            <div>Status</div>
                            <div>Outcome</div>
                            <div className="text-right">Action</div>
                        </div>

                        {disputesLoading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#375BD2] mb-3" />
                                <p className="text-gray-500">Loading disputes...</p>
                            </div>
                        ) : disputes.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="w-10 h-10 mx-auto text-green-500/30 mb-3" />
                                <p className="text-gray-500">No disputes</p>
                            </div>
                        ) : (
                            disputes.map((dispute, index) => (
                                <div
                                    key={dispute.id}
                                    className="grid grid-cols-[60px_1fr_1fr_120px_100px_160px_100px] gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
                                >
                                    <div className="text-2xl font-bold text-gray-600 font-mono">
                                        {String(index + 1).padStart(2, '0')}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#375BD2] to-[#4C8BF5] flex items-center justify-center text-white font-bold text-xs">
                                            {dispute.agentId.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-mono text-sm text-white">
                                                {dispute.agentId.slice(0, 6)}...{dispute.agentId.slice(-4)}
                                            </div>
                                            <div className="text-xs text-gray-500">Agent Wallet</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-white">{dispute.resourceName}</div>
                                        <div className="text-xs text-gray-500">#{dispute.receiptCode || dispute.id.slice(0, 8)}</div>
                                    </div>
                                    <div className="font-mono text-white font-medium">
                                        {dispute.amount.toFixed(4)}
                                        <span className="text-gray-500 text-xs ml-1">ETH</span>
                                    </div>
                                    <div>{getStatusBadge(dispute)}</div>
                                    <div>{getOutcomeBadge(dispute)}</div>
                                    <div className="text-right">
                                        <button
                                            onClick={() => setSelectedDispute(dispute)}
                                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
