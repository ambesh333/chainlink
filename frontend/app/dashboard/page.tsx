'use client';

import Link from 'next/link';
import { Package, Globe, AlertOctagon, TrendingUp, Zap, Shield, ArrowRight, Terminal } from 'lucide-react';

const DUMMY_STATS = {
    totalResources: 12,
    activeResources: 9,
    totalTransactions: 248,
    revenue: '0.04821',
    pendingDisputes: 2,
    trustScore: 87,
};

const DUMMY_RECENT = [
    { id: '1', title: 'Ethereum Price Feed Dataset', type: 'LINK', price: 0.002, status: 'SETTLED', date: '2 hours ago' },
    { id: '2', title: 'DeFi Analytics Report Q1', type: 'IMAGE', price: 0.005, status: 'PENDING', date: '5 hours ago' },
    { id: '3', title: 'Smart Contract Audit Pack', type: 'LINK', price: 0.001, status: 'SETTLED', date: '1 day ago' },
    { id: '4', title: 'MEV Bot Strategy Video', type: 'VIDEO', price: 0.0085, status: 'DISPUTED', date: '2 days ago' },
];

export default function DashboardPage() {
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
                        <span className="text-4xl font-mono font-bold text-[#375BD2]">{DUMMY_STATS.totalResources}</span>
                        <span className="text-sm text-gray-400">registered</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#375BD2] h-full" style={{ width: '75%' }} />
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
                        <span className="text-4xl font-mono font-bold text-[#4CAF50]">{DUMMY_STATS.activeResources}</span>
                        <span className="text-sm text-gray-400">live</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-[#4CAF50] h-full" style={{ width: '75%' }} />
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
                        <span className="text-4xl font-mono font-bold text-[#4C8BF5]">{DUMMY_STATS.trustScore}</span>
                        <span className="text-sm text-gray-400">/ 100</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#375BD2] to-[#4C8BF5] h-full" style={{ width: `${DUMMY_STATS.trustScore}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Excellent — Top 15% of merchants</p>
                </div>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Total Transactions</h3>
                    <span className="text-3xl font-mono font-bold text-white">{DUMMY_STATS.totalTransactions}</span>
                    <p className="text-xs text-gray-500 mt-2">All-time completed purchases</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Revenue</h3>
                    <span className="text-3xl font-mono font-bold text-white">{DUMMY_STATS.revenue} <span className="text-lg text-gray-500">ETH</span></span>
                    <p className="text-xs text-gray-500 mt-2">Total earned from resources</p>
                </div>
                <div className="bg-[#0a0a0f] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Pending Disputes</h3>
                    <span className="text-3xl font-mono font-bold text-yellow-400">{DUMMY_STATS.pendingDisputes}</span>
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
            <div className="bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <TrendingUp size={18} className="text-[#375BD2]" />
                        Recent Transactions
                    </h3>
                    <span className="text-xs text-gray-500">Demo data</span>
                </div>
                <div className="divide-y divide-white/5">
                    {DUMMY_RECENT.map((tx) => (
                        <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                            <div className={`w-2 h-2 rounded-full ${tx.status === 'SETTLED' ? 'bg-green-400' : tx.status === 'DISPUTED' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{tx.title}</p>
                                <p className="text-gray-500 text-xs">{tx.date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 uppercase">{tx.type}</span>
                                <span className="text-white text-sm font-mono">{tx.price} ETH</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    tx.status === 'SETTLED' ? 'bg-green-500/10 text-green-400' :
                                    tx.status === 'DISPUTED' ? 'bg-red-500/10 text-red-400' :
                                    'bg-yellow-500/10 text-yellow-400'
                                }`}>{tx.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
