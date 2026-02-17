'use client';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthContext';
import { useAccount } from 'wagmi';
import { Shield, Zap, Link2, ArrowRight } from 'lucide-react';

export default function Home() {
    const { isAuthenticated, user } = useAuth();
    const { isConnected } = useAccount();

    return (
        <>
            <Navbar />
            <main className="min-h-screen pt-24 px-6">
                {/* Hero Section */}
                <section className="max-w-5xl mx-auto text-center py-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#375BD2]/10 border border-[#375BD2]/20 text-[#4C8BF5] text-sm mb-8">
                        <Zap size={14} />
                        <span>Ethereum × Chainlink</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        Chainlink
                        <span className="bg-gradient-to-r from-[#375BD2] to-[#4C8BF5] bg-clip-text text-transparent"> Agent</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
                        Ethereum-based agent platform powered by Chainlink oracles.
                        Connect your wallet to get started.
                    </p>

                    {/* Auth Status Card */}
                    {isAuthenticated ? (
                        <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#111827] border border-[#375BD2]/30 shadow-xl shadow-[#375BD2]/5">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#375BD2] to-[#4C8BF5] flex items-center justify-center">
                                <Shield size={28} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-lg">Welcome back!</p>
                                <p className="text-gray-400 text-sm mt-1 font-mono">
                                    {user?.walletAddress.slice(0, 6)}...{user?.walletAddress.slice(-4)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Authenticated
                            </div>
                        </div>
                    ) : (
                        <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#111827] border border-white/5">
                            <p className="text-gray-400 text-sm">
                                {isConnected
                                    ? '✅ Wallet connected — click "Sign In with Wallet" above'
                                    : '🔗 Connect your Ethereum wallet to begin'}
                            </p>
                        </div>
                    )}
                </section>

                {/* Feature Cards */}
                <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                    {[
                        {
                            icon: <Shield size={24} />,
                            title: 'Wallet Auth',
                            desc: 'Sign in with your Ethereum wallet using EIP-191 message signing.',
                            color: '#375BD2',
                        },
                        {
                            icon: <Link2 size={24} />,
                            title: 'Chainlink Oracles',
                            desc: 'Real-world data feeds powered by Chainlink decentralized oracles.',
                            color: '#4C8BF5',
                        },
                        {
                            icon: <Zap size={24} />,
                            title: 'Agent Framework',
                            desc: 'Extensible agent system for on-chain automation and tasks.',
                            color: '#6B8AFF',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            className="group p-6 rounded-2xl bg-[#111827] border border-white/5 hover:border-[#375BD2]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#375BD2]/5"
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                                style={{ backgroundColor: `${card.color}20` }}
                            >
                                <span style={{ color: card.color }}>{card.icon}</span>
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">{card.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
                            <div className="flex items-center gap-1 mt-4 text-[#4C8BF5] text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                Coming soon <ArrowRight size={14} />
                            </div>
                        </div>
                    ))}
                </section>
            </main>
        </>
    );
}
