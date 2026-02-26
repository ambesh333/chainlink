'use client';
import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Package, Home, Globe, AlertOctagon, Terminal, Wallet } from 'lucide-react';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useAuth } from '@/components/AuthContext';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/dashboard/resources', label: 'My Resources', icon: Package },
        { href: '/dashboard/explore', label: 'Explore', icon: Globe },
        { href: '/dashboard/earnings', label: 'Earnings', icon: Wallet },
        { href: '/dashboard/disputes', label: 'Disputes', icon: AlertOctagon },
        { href: '/dashboard/demo', label: 'Demo', icon: Terminal },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Announcement Bar */}
            <div className="bg-[#375BD2] text-white border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="py-1.5 text-center text-sm font-semibold">
                        🔗 Chainlink Agent — Ethereum Sepolia Testnet
                    </div>
                </div>
            </div>

            {/* Dashboard Navigation */}
            <div className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between py-4">
                        <nav className="flex items-center gap-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive
                                            ? 'text-[#375BD2]'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <ConnectWalletButton />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {!isLoading && !isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#375BD2]/20 via-[#2B4ABF]/10 to-transparent rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10">
                            <div className="mb-8 flex justify-center">
                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#375BD2] via-[#2B4ABF] to-[#1a2d6d] p-0.5">
                                    <div className="w-full h-full bg-[#0a0a0f] rounded-2xl flex items-center justify-center">
                                        <div className="text-6xl">🔐</div>
                                    </div>
                                </div>
                            </div>

                            <h2 className="text-5xl font-bold text-white mb-4">Connect Wallet</h2>
                            <p className="text-gray-400 text-lg mb-12 max-w-md mx-auto">
                                Connect your Ethereum wallet to get started
                            </p>

                            <div className="flex justify-center">
                                <ConnectWalletButton />
                            </div>
                        </div>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
}
