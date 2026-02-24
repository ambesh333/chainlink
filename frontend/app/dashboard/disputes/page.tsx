'use client';

import { useState } from 'react';
import { AlertOctagon, Shield, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const DUMMY_DISPUTES = [
    {
        id: 'd1',
        resourceTitle: 'MEV Bot Strategy Video Tutorial',
        buyerAddress: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
        amount: '0.0085',
        status: 'PENDING',
        reason: 'Video content does not match the description. Expected advanced MEV strategies but received basic arbitrage tutorial.',
        aiScore: 72,
        aiVerdict: 'Dispute appears valid based on content mismatch analysis.',
        createdAt: '2 days ago',
        resolvedAt: null,
    },
    {
        id: 'd2',
        resourceTitle: 'DeFi Analytics Report Q1 2026',
        buyerAddress: '0xdeadbeef1234567890abcdef1234567890abcdef',
        amount: '0.005',
        status: 'PENDING',
        reason: 'Report data is from Q4 2025, not Q1 2026 as advertised.',
        aiScore: 88,
        aiVerdict: 'High confidence dispute — metadata timestamps confirm incorrect period.',
        createdAt: '5 days ago',
        resolvedAt: null,
    },
    {
        id: 'd3',
        resourceTitle: 'Ethereum Price Feed Dataset',
        buyerAddress: '0xfeedface9876543210fedcba9876543210fedcba',
        amount: '0.002',
        status: 'RESOLVED_MERCHANT',
        reason: 'Dataset missing entries for Feb 14-15.',
        aiScore: 41,
        aiVerdict: 'Low confidence dispute — minor data gap within acceptable tolerance.',
        createdAt: '12 days ago',
        resolvedAt: '10 days ago',
    },
    {
        id: 'd4',
        resourceTitle: 'Smart Contract Audit Pack',
        buyerAddress: '0xbabe123456789012345678901234567890123456',
        amount: '0.001',
        status: 'RESOLVED_BUYER',
        reason: 'Files were corrupted and could not be opened.',
        aiScore: 95,
        aiVerdict: 'Valid dispute — file integrity check failed on delivered content.',
        createdAt: '18 days ago',
        resolvedAt: '15 days ago',
    },
];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        PENDING: { label: 'Pending AI Review', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        RESOLVED_MERCHANT: { label: 'Resolved — Merchant', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        RESOLVED_BUYER: { label: 'Resolved — Buyer Refunded', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    };
    const info = map[status] ?? { label: status, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${info.cls}`}>
            {info.label}
        </span>
    );
}

function DisputeCard({ dispute }: { dispute: typeof DUMMY_DISPUTES[0] }) {
    const [expanded, setExpanded] = useState(false);

    const scoreColor =
        dispute.aiScore >= 80 ? 'text-red-400' :
        dispute.aiScore >= 60 ? 'text-yellow-400' :
        'text-green-400';

    return (
        <div className="bg-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden hover:border-[#375BD2]/30 transition-all">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[#F4F4F5] font-bold text-lg truncate">{dispute.resourceTitle}</h3>
                        <p className="text-gray-500 text-xs font-mono mt-1">
                            {dispute.buyerAddress.slice(0, 10)}...{dispute.buyerAddress.slice(-6)}
                        </p>
                    </div>
                    <StatusBadge status={dispute.status} />
                </div>

                <div className="flex items-center gap-6 mb-4">
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Amount</p>
                        <p className="text-white font-mono font-bold">{dispute.amount} ETH</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">AI Confidence</p>
                        <p className={`font-bold font-mono ${scoreColor}`}>{dispute.aiScore}/100</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Filed</p>
                        <p className="text-gray-400 text-sm">{dispute.createdAt}</p>
                    </div>
                    {dispute.resolvedAt && (
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Resolved</p>
                            <p className="text-gray-400 text-sm">{dispute.resolvedAt}</p>
                        </div>
                    )}
                </div>

                {/* AI Score Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Dispute validity score</span>
                        <span>{dispute.aiScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                dispute.aiScore >= 80 ? 'bg-red-400' :
                                dispute.aiScore >= 60 ? 'bg-yellow-400' :
                                'bg-green-400'
                            }`}
                            style={{ width: `${dispute.aiScore}%` }}
                        />
                    </div>
                </div>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#4C8BF5] transition-colors"
                >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? 'Hide details' : 'View AI analysis'}
                </button>
            </div>

            {expanded && (
                <div className="border-t border-white/10 p-6 bg-white/2 space-y-4">
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Buyer Reason</p>
                        <p className="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                            {dispute.reason}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">AI Verdict</p>
                        <div className="flex items-start gap-3 bg-[#375BD2]/5 border border-[#375BD2]/20 rounded-xl p-4">
                            <Shield size={16} className="text-[#4C8BF5] mt-0.5 shrink-0" />
                            <p className="text-[#4C8BF5] text-sm leading-relaxed">{dispute.aiVerdict}</p>
                        </div>
                    </div>

                    {dispute.status === 'PENDING' && (
                        <div className="flex gap-3 pt-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium transition-colors">
                                <CheckCircle size={14} /> Accept Resolution
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-colors">
                                <XCircle size={14} /> Escalate
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DisputesPage() {
    const pending = DUMMY_DISPUTES.filter(d => d.status === 'PENDING');
    const resolved = DUMMY_DISPUTES.filter(d => d.status !== 'PENDING');

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <AlertOctagon className="text-[#375BD2]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-[#F4F4F5]">Disputes</h2>
                        <p className="text-gray-400 text-sm">AI-powered dispute resolution for your resources</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full">
                    <Clock size={12} className="text-yellow-400" />
                    <span className="text-yellow-400">{pending.length} pending review</span>
                </div>
            </div>

            {/* Pending Disputes */}
            {pending.length > 0 && (
                <div className="mb-10">
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Clock size={14} className="text-yellow-400" /> Awaiting AI Resolution
                    </h3>
                    <div className="space-y-4">
                        {pending.map(d => <DisputeCard key={d.id} dispute={d} />)}
                    </div>
                </div>
            )}

            {/* Resolved Disputes */}
            {resolved.length > 0 && (
                <div>
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-400" /> Resolved
                    </h3>
                    <div className="space-y-4">
                        {resolved.map(d => <DisputeCard key={d.id} dispute={d} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
