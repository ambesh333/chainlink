'use client';
import { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle, ArrowDownToLine, Image, Video, ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';

interface ResourceEarning {
    resourceId: string;
    title: string;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    isActive: boolean;
    pendingCount: number;
    pendingAmount: number;
    settledCount: number;
    settledAmount: number;
    totalTransactions: number;
}

export default function EarningsPage() {
    const { getToken } = useAuth();
    const [earnings, setEarnings] = useState<ResourceEarning[]>([]);
    const [totalPending, setTotalPending] = useState(0);
    const [totalSettled, setTotalSettled] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());

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
                setTotalSettled(data.totalSettled);
            }
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchEarnings(); }, []);

    const handleClaim = async (resourceId: string) => {
        setClaimingIds(prev => new Set(prev).add(resourceId));
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/resources/claim/${resourceId}`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.message);
                await fetchEarnings();
            } else {
                alert(`Claim failed: ${data.error}`);
            }
        } catch (error: any) {
            alert(`Claim failed: ${error.message}`);
        } finally {
            setClaimingIds(prev => { const s = new Set(prev); s.delete(resourceId); return s; });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={16} className="text-[#375BD2]" />;
            case 'VIDEO': return <Video size={16} className="text-[#5B7FE8]" />;
            default: return <ExternalLink size={16} className="text-[#8BA4F0]" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={32} className="animate-spin text-[#375BD2]" />
            </div>
        );
    }

    return (
        <div className="text-white">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <Wallet className="text-[#375BD2]" size={24} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">Earnings</h2>
                    <p className="text-gray-400 text-sm">Claim settled payments from your resources</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Unclaimed</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-yellow-400">{totalPending.toFixed(5)}</span>
                        <span className="text-sm text-gray-500">ETH</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Pending settlement from escrow</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Claimed</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-green-400">{totalSettled.toFixed(5)}</span>
                        <span className="text-sm text-gray-500">ETH</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Successfully settled to your wallet</p>
                </div>
            </div>

            {/* Resources Table */}
            <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_100px_140px_140px_100px_140px] gap-4 px-6 py-4 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                    <div>Resource</div>
                    <div>Price</div>
                    <div>Unclaimed</div>
                    <div>Claimed</div>
                    <div>Txns</div>
                    <div className="text-right">Action</div>
                </div>

                {/* Table Body */}
                {earnings.length === 0 ? (
                    <div className="p-12 text-center">
                        <Wallet className="w-10 h-10 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-500">No resources with transactions yet</p>
                    </div>
                ) : (
                    earnings.map((item) => {
                        const isClaiming = claimingIds.has(item.resourceId);
                        const hasUnclaimed = item.pendingCount > 0;

                        return (
                            <div
                                key={item.resourceId}
                                className="grid grid-cols-[1fr_100px_140px_140px_100px_140px] gap-4 px-6 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
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

                                {/* Unclaimed */}
                                <div>
                                    <div className={`font-mono text-sm font-medium ${hasUnclaimed ? 'text-yellow-400' : 'text-gray-600'}`}>
                                        {item.pendingAmount.toFixed(5)} ETH
                                    </div>
                                    <div className="text-xs text-gray-600">{item.pendingCount} txn{item.pendingCount !== 1 ? 's' : ''}</div>
                                </div>

                                {/* Claimed */}
                                <div>
                                    <div className="font-mono text-sm text-green-400">
                                        {item.settledAmount.toFixed(5)} ETH
                                    </div>
                                    <div className="text-xs text-gray-600">{item.settledCount} txn{item.settledCount !== 1 ? 's' : ''}</div>
                                </div>

                                {/* Total Txns */}
                                <div className="text-sm text-gray-400 font-mono">
                                    {item.totalTransactions}
                                </div>

                                {/* Action */}
                                <div className="text-right">
                                    {hasUnclaimed ? (
                                        <button
                                            onClick={() => handleClaim(item.resourceId)}
                                            disabled={isClaiming}
                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#375BD2]/10 hover:bg-[#375BD2]/20 text-[#375BD2] border border-[#375BD2]/20 hover:border-[#375BD2]/40 transition-all flex items-center gap-2 ml-auto disabled:opacity-50"
                                        >
                                            {isClaiming ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <ArrowDownToLine size={14} />
                                            )}
                                            Claim
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-green-500/60">
                                            <CheckCircle size={12} />
                                            Claimed
                                        </span>
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
