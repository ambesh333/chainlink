'use client';
import { useState, useEffect } from 'react';
import { Bot, CheckCircle, Loader2, ArrowLeft, ArrowUpRight, Link2, Zap, Shield, ArrowDownLeft, ArrowUpFromLine } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';

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

export default function DisputesPage() {
    const { getToken } = useAuth();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
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
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDisputes(); }, []);

    // Auto-refresh when CRE is processing
    useEffect(() => {
        const hasProcessing = disputes.some(d => d.resolution === 'pending');
        if (!hasProcessing) return;

        const interval = setInterval(fetchDisputes, 10000);
        return () => clearInterval(interval);
    }, [disputes]);

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
        // pending
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

    // ============= CRE TIMELINE COMPONENT =============
    const CRETimeline = ({ dispute }: { dispute: Dispute }) => {
        if (!dispute.escrowKey) return null;

        const isResolved = dispute.resolution !== 'pending';

        const steps = [
            {
                label: 'Dispute Raised',
                icon: <Zap size={14} />,
                done: true,
                description: 'On-chain DisputeRaised event emitted',
            },
            {
                label: 'CRE Processing',
                icon: <Loader2 size={14} className={dispute.creStatus === 'CRE_PROCESSING' ? 'animate-spin' : ''} />,
                done: dispute.creStatus === 'CRE_PROCESSING' || dispute.creStatus === 'CRE_RESOLVED' || !!dispute.aiDecision || isResolved,
                active: dispute.creStatus === 'CRE_PROCESSING',
                description: 'CRE workflow picks up event, calls AI via Confidential HTTP',
            },
            {
                label: 'AI Analysis',
                icon: <Bot size={14} />,
                done: !!dispute.aiDecision || dispute.creStatus === 'CRE_RESOLVED' || isResolved,
                description: dispute.aiReasoning || 'Dual-LLM AI analyzes dispute context',
            },
            {
                label: 'On-chain Resolution',
                icon: <Shield size={14} />,
                done: dispute.creStatus === 'CRE_RESOLVED' || isResolved,
                description: isResolved
                    ? `Resolved: ${dispute.resolution === 'paid_to_merchant' ? 'Funds released to merchant' : 'Funds refunded to agent'}`
                    : 'CRE writes resolution to DisputeConsumer contract',
            },
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
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${step.done
                                    ? 'bg-[#375BD2]/20 border-[#375BD2]/50 text-[#375BD2]'
                                    : step.active
                                        ? 'bg-[#375BD2]/10 border-[#375BD2]/30 text-[#375BD2] animate-pulse'
                                        : 'bg-gray-800/50 border-gray-700 text-gray-600'
                                    }`}>
                                    {step.icon}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-px h-8 ${step.done ? 'bg-[#375BD2]/30' : 'bg-gray-800'}`} />
                                )}
                            </div>

                            <div className="pb-6">
                                <div className={`text-sm font-medium ${step.done ? 'text-white' : 'text-gray-500'}`}>
                                    {step.label}
                                    {step.active && (
                                        <span className="ml-2 text-xs text-[#375BD2]">In Progress...</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                    {step.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Escrow Key */}
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

    // ============= DETAIL CARD VIEW =============
    if (selectedDispute) {
        const dispute = disputes.find(d => d.id === selectedDispute.id) || selectedDispute;
        const isCREProcessing = dispute.creStatus === 'CRE_PROCESSING';
        const isResolved = dispute.resolution !== 'pending';
        const confidence = dispute.aiConfidence || 0;
        const isDisputeValid = dispute.aiDecision === 'AI_VALID';

        return (
            <div className="text-white p-6 flex items-center justify-center">
                <div className="w-full max-w-lg">
                    {/* Back Button */}
                    <button
                        onClick={() => setSelectedDispute(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 transition-colors text-sm"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Disputes</span>
                    </button>

                    {/* CRE Processing Banner */}
                    {isCREProcessing && (
                        <div className="mb-4 p-4 bg-[#375BD2]/10 rounded-xl border border-[#375BD2]/20 flex items-center gap-3">
                            <Loader2 size={18} className="text-[#375BD2] animate-spin" />
                            <div>
                                <div className="text-sm font-medium text-[#375BD2]">CRE Resolution In Progress</div>
                                <div className="text-xs text-gray-400">Chainlink CRE workflow is analyzing this dispute on-chain</div>
                            </div>
                        </div>
                    )}

                    {/* Outcome Card (for resolved disputes) */}
                    {isResolved && (
                        <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 ${dispute.resolution === 'paid_to_merchant'
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-orange-500/10 border-orange-500/20'
                            }`}>
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

                    {/* Main Card */}
                    <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#141420] to-[#0f1a0f] rounded-3xl border border-white/10 overflow-hidden">
                        {/* Glow Effect */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[100px] opacity-30 ${isCREProcessing
                            ? 'bg-[#375BD2]'
                            : isResolved
                                ? dispute.resolution === 'paid_to_merchant' ? 'bg-green-500' : 'bg-orange-500'
                                : 'bg-gray-500'
                            }`} />

                        {/* Card Header */}
                        <div className="relative p-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isCREProcessing
                                    ? 'bg-[#375BD2]/20'
                                    : isResolved
                                        ? dispute.resolution === 'paid_to_merchant' ? 'bg-green-500/20' : 'bg-orange-500/20'
                                        : 'bg-gray-500/20'
                                    }`}>
                                    {isCREProcessing
                                        ? <Link2 size={18} className="text-[#375BD2]" />
                                        : <Bot size={18} className={
                                            isResolved
                                                ? dispute.resolution === 'paid_to_merchant' ? 'text-green-400' : 'text-orange-400'
                                                : 'text-gray-400'
                                        } />
                                    }
                                </div>
                                <span className="text-white font-medium">
                                    {isCREProcessing ? 'CRE Workflow' : 'AI Verdict'}
                                </span>
                            </div>
                            <span className="px-3 py-1.5 bg-[#252525] rounded-full text-xs text-gray-300 border border-white/10">
                                {dispute.resourceName}
                            </span>
                        </div>

                        {/* Card Content */}
                        <div className="relative p-8">
                            {isCREProcessing ? (
                                <div className="text-center py-4">
                                    <Loader2 size={40} className="text-[#375BD2] animate-spin mx-auto mb-4" />
                                    <div className="text-lg font-medium text-white mb-2">CRE Analyzing Dispute</div>
                                    <p className="text-gray-500 text-sm">
                                        The Chainlink CRE workflow has picked up the DisputeRaised event
                                        and is performing dual-LLM analysis via Confidential HTTP.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Large Confidence Percentage */}
                                    {dispute.aiDecision && (
                                        <div className="mb-6">
                                            <div className="flex items-start gap-2">
                                                <span className="text-7xl font-extralight text-white tracking-tight">
                                                    {confidence}%
                                                </span>
                                                <ArrowUpRight size={24} className={`mt-3 ${isDisputeValid ? 'text-red-400' : 'text-green-400'}`} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Text */}
                                    <div className="mb-4">
                                        <span className="text-white font-medium">
                                            {dispute.aiDecision
                                                ? isDisputeValid ? 'Dispute was valid' : 'Dispute was invalid'
                                                : 'Awaiting AI analysis'}
                                        </span>
                                        {dispute.aiDecision && <span className="text-gray-500"> based on AI analysis.</span>}
                                    </div>

                                    {/* Reasoning */}
                                    {dispute.aiReasoning && (
                                        <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                            {dispute.aiReasoning}
                                        </p>
                                    )}

                                    {/* Dispute Reason from Agent */}
                                    {dispute.encryptedReason && (
                                        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <div className="text-xs text-gray-500 mb-2">Agent&apos;s Dispute Reason:</div>
                                            <p className="text-sm text-gray-300">
                                                {dispute.encryptedReason}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* CRE Timeline */}
                    <CRETimeline dispute={dispute} />

                    {/* Amount Info */}
                    <div className="mt-4 text-center">
                        <span className="text-gray-500 text-sm">Dispute Amount: </span>
                        <span className="text-white font-mono font-medium">{dispute.amount.toFixed(5)} ETH</span>
                    </div>
                </div>
            </div>
        );
    }

    // ============= TABLE VIEW =============
    return (
        <div className="text-white">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#375BD2]"></div>
                <h2 className="text-xl font-semibold text-white">Disputes</h2>
                <span className="text-gray-500 text-sm">{disputes.length} Dispute{disputes.length !== 1 ? 's' : ''}</span>
            </div>

            {/* CRE Info Banner */}
            {disputes.some(d => d.creStatus) && (
                <div className="mb-6 p-4 bg-[#375BD2]/5 rounded-xl border border-[#375BD2]/10 flex items-center gap-3">
                    <Link2 size={16} className="text-[#375BD2]" />
                    <span className="text-sm text-gray-400">
                        Disputes are automatically resolved by <span className="text-[#375BD2] font-medium">Chainlink CRE</span> workflows on-chain
                    </span>
                </div>
            )}

            {/* Table */}
            <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 overflow-hidden">
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

                {/* Table Body */}
                {isLoading ? (
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
                            {/* Number */}
                            <div className="text-2xl font-bold text-gray-600 font-mono">
                                {String(index + 1).padStart(2, '0')}
                            </div>

                            {/* Agent */}
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

                            {/* Resource */}
                            <div>
                                <div className="text-sm text-white">{dispute.resourceName}</div>
                                <div className="text-xs text-gray-500">#{dispute.receiptCode || dispute.id.slice(0, 8)}</div>
                            </div>

                            {/* Amount */}
                            <div className="font-mono text-white font-medium">
                                {dispute.amount.toFixed(4)}
                                <span className="text-gray-500 text-xs ml-1">ETH</span>
                            </div>

                            {/* Status */}
                            <div>{getStatusBadge(dispute)}</div>

                            {/* Outcome */}
                            <div>{getOutcomeBadge(dispute)}</div>

                            {/* Action */}
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
            </div>
        </div>
    );
}
