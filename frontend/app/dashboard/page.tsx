'use client';
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/config';
import { Package } from 'lucide-react';

const Shimmer = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded ${className}`}
        style={{ animation: 'shimmer 1.5s infinite' }} />
);

const CardSkeleton = () => (
    <div className="bg-[#0a0a0f] p-6 rounded-xl shadow-lg border border-white/10">
        <Shimmer className="h-3 w-24 mb-4" />
        <Shimmer className="h-10 w-32 mb-4" />
        <Shimmer className="h-3 w-40 mt-2" />
    </div>
);

interface Stats {
    totalResources: number;
    activeResources: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({ totalResources: 0, activeResources: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const API_URL = getApiUrl();
                const response = await fetch(`${API_URL}/resources`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
                    },
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    const resources = data.resources || [];
                    setStats({
                        totalResources: resources.length,
                        activeResources: resources.filter((r: any) => r.isActive).length,
                    });
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div>
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>

            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Overview</h2>
                <p className="text-gray-400">Welcome to your Chainlink Agent dashboard.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : (
                    <>
                        {/* Total Resources */}
                        <div className="bg-[#0a0a0f] p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Total Resources</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-mono font-bold text-[#375BD2]">{stats.totalResources}</span>
                                <span className="text-sm text-gray-400">registered</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                                <div className="bg-[#375BD2] h-full" style={{ width: `${Math.min(stats.totalResources * 10, 100)}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Data assets in your portfolio</p>
                        </div>

                        {/* Active Resources */}
                        <div className="bg-[#0a0a0f] p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Active Resources</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-mono font-bold text-[#4CAF50]">{stats.activeResources}</span>
                                <span className="text-sm text-gray-400">live</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                                <div className="bg-[#4CAF50] h-full" style={{ width: stats.totalResources ? `${(stats.activeResources / stats.totalResources) * 100}%` : '0%' }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Currently available on the network</p>
                        </div>

                        {/* Network Info */}
                        <div className="bg-[#0a0a0f] p-6 rounded-xl shadow-lg border border-white/10 bg-gradient-to-br from-[#0a0a0f] to-[#0d1230]">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Network</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#4CAF50] animate-pulse" />
                                <span className="text-2xl font-bold text-white">Sepolia</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <Package size={14} className="text-gray-500" />
                                <span className="text-xs text-gray-500">Ethereum Testnet — ETH payments</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
