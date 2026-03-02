'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Home, Twitter, ChevronRight, Zap, Shield, Bot, ArrowRight, Sparkles, Lock, Workflow } from 'lucide-react';

const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'escrow', title: 'How Escrow Works' },
    { id: 'x402', title: 'x402 Payment Flow' },
    { id: 'cre', title: 'CRE Workflows' },
    { id: 'contracts', title: 'Smart Contracts' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'api', title: 'API Reference' },
    { id: 'future', title: 'Future Integrations' },
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState('overview');
    const [overviewVisible, setOverviewVisible] = useState(false);
    const overviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = overviewRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setOverviewVisible(true); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const sectionElements = sections.map(s => document.getElementById(s.id));
            const scrollPos = window.scrollY + 150;
            for (let i = sectionElements.length - 1; i >= 0; i--) {
                const section = sectionElements[i];
                if (section && section.offsetTop <= scrollPos) {
                    setActiveSection(sections[i].id);
                    break;
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="flex">
                {/* Left Sidebar */}
                <aside className="hidden lg:block w-64 shrink-0 border-r border-white/10 h-screen sticky top-0 overflow-y-auto">
                    <div className="p-6">
                        <Link href="/" className="flex items-center gap-2 mb-8">
                            <span className="text-xl font-bold bg-gradient-to-r from-[#375BD2] to-[#4C8BF5] bg-clip-text text-transparent">CA</span>
                            <span className="text-white font-medium">Docs</span>
                        </Link>
                        <div className="mb-6 space-y-1">
                            <Link href="/" className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-all">
                                <Home size={14} /> Home
                            </Link>
                            <Link href="/dashboard/explore" className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-all">
                                <span className="text-[#375BD2]">◈</span> Marketplace
                            </Link>
                        </div>
                        <div className="border-t border-white/10 pt-4 mb-2">
                            <span className="text-xs text-gray-600 uppercase tracking-wider px-3">Documentation</span>
                        </div>
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button key={section.id} onClick={() => scrollToSection(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === section.id ? 'bg-[#375BD2]/20 text-[#375BD2] font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    {activeSection === section.id && <ChevronRight size={14} />}
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    <div className="max-w-3xl mx-auto px-6 py-16">
                        {/* Hero Banner */}
                        <div className="mb-16 rounded-2xl overflow-hidden border border-white/10">
                            <img src="/docs/banner3.jpg" alt="Chainlink Agent" className="w-full h-auto" />
                        </div>

                        {/* 1. Overview */}
                        <section id="overview" className="mb-20 relative" ref={overviewRef}>
                            {/* Ambient glow orbs */}
                            <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#375BD2]/10 rounded-full blur-[120px] animate-pulse-glow pointer-events-none" />
                            <div className="absolute -top-10 right-0 w-56 h-56 bg-[#4C8BF5]/8 rounded-full blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1.5s' }} />

                            {/* Badge */}
                            <div
                                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#375BD2]/20 bg-[#375BD2]/5 mb-6 ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.1s' }}
                            >
                                <Sparkles size={12} className="text-[#4C8BF5]" />
                                <span className="text-xs font-medium text-[#4C8BF5] tracking-wide">Decentralized Data Marketplace</span>
                            </div>

                            {/* Title */}
                            <h1
                                className={`text-5xl font-bold mb-4 leading-tight ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.2s' }}
                            >
                                Chainlink{' '}
                                <span className="relative">
                                    <span className="bg-gradient-to-r from-[#375BD2] via-[#4C8BF5] to-[#375BD2] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
                                        Agent
                                    </span>
                                </span>
                                <br />
                                <span className="text-gray-400 text-4xl font-medium">Documentation</span>
                            </h1>

                            {/* Description */}
                            <p
                                className={`text-gray-400 text-lg leading-relaxed mb-10 max-w-2xl ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.35s' }}
                            >
                                A trustless marketplace where AI agents and humans purchase data resources with{' '}
                                <span className="text-white/80 font-medium">escrow-backed payments</span> on Ethereum Sepolia.
                                Settlement, disputes, and expiry are fully automated by{' '}
                                <span className="text-[#375BD2] font-semibold">Chainlink CRE</span> workflows.
                            </p>

                            {/* Feature Cards — Pinterest-style staggered grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                {[
                                    {
                                        icon: <Zap size={20} />,
                                        title: 'x402 Payment Protocol',
                                        desc: 'Native HTTP 402 flow lets AI agents discover, pay for, and access resources programmatically.',
                                        color: '#375BD2',
                                        delay: '0.4s',
                                    },
                                    {
                                        icon: <Lock size={20} />,
                                        title: 'On-Chain Escrow',
                                        desc: 'ETH and ERC-20 funds are held in a smart contract until delivery is verified or disputes are resolved.',
                                        color: '#4C8BF5',
                                        delay: '0.5s',
                                    },
                                    {
                                        icon: <Workflow size={20} />,
                                        title: 'Automated Settlement',
                                        desc: 'CRE workflows verify delivery, resolve disputes with AI analysis, and handle expired escrows automatically.',
                                        color: '#10B981',
                                        delay: '0.6s',
                                    },
                                    {
                                        icon: <Bot size={20} />,
                                        title: 'AI Dispute Resolution',
                                        desc: 'When buyers raise disputes, an AI model analyzes the resource and description to produce a fair verdict.',
                                        color: '#7C3AED',
                                        delay: '0.7s',
                                    },
                                ].map((feature) => (
                                    <div
                                        key={feature.title}
                                        className={`feature-card group rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] p-5 cursor-default ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                        style={{ animationDelay: feature.delay }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: `${feature.color}15`, color: feature.color }}
                                            >
                                                {feature.icon}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold text-sm mb-1.5 group-hover:text-[#4C8BF5] transition-colors duration-300">
                                                    {feature.title}
                                                </h4>
                                                <p className="text-gray-500 text-[13px] leading-relaxed">
                                                    {feature.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats row */}
                            <div
                                className={`flex items-center gap-8 mb-10 ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.8s' }}
                            >
                                {[
                                    { value: 'x402', label: 'Protocol' },
                                    { value: '3', label: 'CRE Workflows' },
                                    { value: 'ETH', label: '& ERC-20' },
                                    { value: 'AI', label: 'Dispute Engine' },
                                ].map((stat) => (
                                    <div key={stat.label} className="group cursor-default">
                                        <div className="text-xl font-bold text-white group-hover:text-[#375BD2] transition-colors duration-300">
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Buttons */}
                            <div
                                className={`flex items-center gap-4 ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.9s' }}
                            >
                                <Link
                                    href="/dashboard"
                                    className="group relative inline-flex items-center gap-2 px-7 py-3.5 bg-[#375BD2] hover:bg-[#2A4AB0] text-white font-medium rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(55,91,210,0.4)]"
                                >
                                    Get Started
                                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    href="/dashboard/demo"
                                    className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-medium rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
                                >
                                    Try Demo
                                    <Sparkles size={14} className="text-gray-500 group-hover:text-[#4C8BF5] transition-colors duration-300" />
                                </Link>
                            </div>
                        </section>

                        {/* 2. How Escrow Works */}
                        <section id="escrow" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">2</span>
                                How Escrow Works
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Every purchase flows through an on-chain escrow that protects both buyers and merchants. Here is the complete lifecycle:
                            </p>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-4">Escrow State Machine</h3>
                                <pre className="text-sm text-gray-400 overflow-x-auto">{`Created ──[deposit()]──▶ Funded
                              │
                ┌─────────────┼──────────────┐
                │             │              │
                ▼             ▼              ▼
   [requestSettlement()]  [raiseDispute()]  [expiry exceeded]
                │             │              │
                ▼             ▼              ▼
    SettlementRequested   Disputed        Released
                │             │           (auto-refund)
        [CRE verifies]   [CRE AI verdict]
                │             │
                ▼             ▼
            Settled      Settled OR Refunded`}</pre>
                            </div>
                            <div className="grid gap-4">
                                {[
                                    ['Created', 'An escrow record is created when a buyer initiates a purchase. No funds deposited yet.'],
                                    ['Funded', 'The buyer calls deposit() on the EscrowMarketplace contract, locking ETH or ERC-20 tokens.'],
                                    ['SettlementRequested', 'After receiving the resource, the buyer calls requestSettlement(). CRE verifies delivery and settles.'],
                                    ['Disputed', 'If the resource is unsatisfactory, the buyer calls raiseDispute(). CRE runs AI analysis to decide the outcome.'],
                                    ['Settled', 'Funds are released to the merchant. This happens after successful settlement verification or a dispute ruling in the merchant\'s favor.'],
                                    ['Refunded', 'Funds are returned to the buyer after a dispute ruling in the buyer\'s favor.'],
                                    ['Released', 'If the escrow exceeds its expiry window without settlement, the CRE Expiry Watchdog auto-refunds the buyer.'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-1">{title}</h4>
                                        <p className="text-gray-500 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. x402 Payment Flow */}
                        <section id="x402" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">3</span>
                                x402 Payment Flow
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/landing/mcp.jpeg" alt="Protocol Integration" className="w-full h-auto" />
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                The x402 protocol enables AI agents to discover and pay for resources using standard HTTP. Here is the step-by-step flow:
                            </p>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <ol className="space-y-4 text-gray-400">
                                    {[
                                        ['Agent requests resource', 'The agent sends GET /api/explore/:id/access to the backend.'],
                                        ['Backend returns 402', 'The server responds with HTTP 402 Payment Required, including the escrow deposit address, price, and token type.'],
                                        ['Agent deposits funds', 'The agent calls deposit() on EscrowMarketplace.sol, sending ETH or ERC-20 to the escrow contract.'],
                                        ['Agent retries with payment proof', 'The agent sends the request again with an X-Payment header containing the escrow ID.'],
                                        ['Backend verifies and delivers', 'The backend checks the on-chain escrow state (must be Funded), then delivers the resource content.'],
                                        ['Agent requests settlement', 'After receiving the resource, the agent calls requestSettlement() on-chain, then notifies POST /api/gateway/settle.'],
                                        ['CRE finalizes', 'The CRE Settlement Verifier workflow picks up the event, verifies delivery, and calls finalizeSettlement() on-chain.'],
                                    ].map(([step, desc], i) => (
                                        <li key={step} className="flex items-start gap-3">
                                            <span className="w-6 h-6 bg-[#375BD2] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                                            <span><strong className="text-white">{step}:</strong> {desc}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-5">
                                <p className="text-[#4C8BF5] text-sm">
                                    <strong>Note:</strong> All payments are secured by the on-chain escrow. Funds are only released after CRE verifies delivery or resolves a dispute. If neither happens before expiry, funds are automatically returned to the buyer.
                                </p>
                            </div>
                        </section>

                        {/* 4. CRE Workflows */}
                        <section id="cre" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">4</span>
                                CRE Workflows
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Chainlink CRE (Compute Runtime Environment) runs three automated workflows that handle the entire post-purchase lifecycle. Each workflow executes off-chain logic, signs a report, submits it to the DisputeConsumer contract, and notifies the backend.
                            </p>
                            <div className="grid gap-6">
                                {/* Settlement Verifier */}
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 text-sm font-bold">1</span>
                                        <h3 className="text-xl font-semibold text-white">Settlement Verifier</h3>
                                    </div>
                                    <div className="space-y-3 text-gray-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">TRIGGER</span>
                                            <span><code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">SettlementRequested</code> event emitted on-chain</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">STEPS</span>
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/verify-delivery/:key</code> to check if the resource was actually delivered to the buyer.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs a report with <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = true</code> and submits to DisputeConsumer on-chain.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">OUTCOME</span>
                                            <span>Merchant receives payment. Backend notified via <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">POST /api/cre/settlement-complete</code>.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dispute Resolver */}
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-sm font-bold">2</span>
                                        <h3 className="text-xl font-semibold text-white">Dispute Resolver</h3>
                                    </div>
                                    <div className="space-y-3 text-gray-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">TRIGGER</span>
                                            <span><code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">DisputeRaised</code> event emitted on-chain</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">STEPS</span>
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/analyze-dispute/:key</code> which runs AI analysis comparing the resource content against its description.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs a report with <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = verdict</code> (true if resource matches description, false otherwise) and submits to DisputeConsumer.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">OUTCOME</span>
                                            <span>Merchant is paid or buyer is refunded based on AI verdict. Backend notified via <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">POST /api/cre/dispute-resolved</code>.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expiry Watchdog */}
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">3</span>
                                        <h3 className="text-xl font-semibold text-white">Expiry Watchdog</h3>
                                    </div>
                                    <div className="space-y-3 text-gray-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">TRIGGER</span>
                                            <span>Cron schedule — runs every 60 seconds</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">STEPS</span>
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/expired-escrows</code> to find escrows past their expiry window that haven&apos;t been settled or disputed.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs a report with <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = false</code> for each expired escrow and submits to DisputeConsumer.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">OUTCOME</span>
                                            <span>Buyer is automatically refunded. This ensures funds are never locked indefinitely.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 5. Smart Contracts */}
                        <section id="contracts" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">5</span>
                                Smart Contracts
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/docs/banner1.jpg" alt="Smart Contracts" className="w-full h-auto" />
                            </div>

                            {/* EscrowMarketplace */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-2">EscrowMarketplace.sol</h3>
                                <p className="text-gray-400 text-sm mb-4">The core contract that holds funds in escrow and manages the payment lifecycle. Supports both ETH and ERC-20 tokens.</p>
                                <h4 className="text-white font-medium mb-3 text-sm">Key Functions</h4>
                                <div className="space-y-2">
                                    {[
                                        ['deposit()', 'Lock ETH or ERC-20 tokens into escrow for a specific resource purchase.'],
                                        ['requestSettlement()', 'Buyer signals that the resource was received and settlement can proceed.'],
                                        ['raiseDispute()', 'Buyer raises a dispute if the resource does not match its description.'],
                                        ['finalizeSettlement()', 'Facilitator-only. Releases escrowed funds to the merchant.'],
                                        ['resolveDispute()', 'Facilitator-only. Pays merchant or refunds buyer based on dispute verdict.'],
                                        ['claimAfterExpiry()', 'Anyone can call this to refund the buyer after the escrow expiry window.'],
                                    ].map(([fn, desc]) => (
                                        <div key={fn} className="flex items-start gap-3">
                                            <code className="text-[#375BD2] text-sm font-mono whitespace-nowrap">{fn}</code>
                                            <span className="text-gray-400 text-sm">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* DisputeConsumer */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                <h3 className="text-xl font-semibold text-white mb-2">DisputeConsumer.sol</h3>
                                <p className="text-gray-400 text-sm mb-4">Receives signed reports from CRE workflows and calls the appropriate function on EscrowMarketplace to finalize the outcome.</p>
                                <h4 className="text-white font-medium mb-3 text-sm">How It Works</h4>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`CRE Workflow
  │
  ├── Signs report: { escrowKey, payMerchant }
  │
  └── Submits to DisputeConsumer.onReport()
        │
        ├── payMerchant = true  → calls finalizeSettlement()
        └── payMerchant = false → calls resolveDispute() (refund)`}</pre>
                                </div>
                            </div>
                        </section>

                        {/* 6. Architecture */}
                        <section id="architecture" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">6</span>
                                Architecture
                            </h2>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <pre className="text-sm text-gray-400 overflow-x-auto">{`┌─────────────────────────────────────────────────────────────┐
│              AI Agent / Frontend (Next.js)                  │
│         Wallet connect, SIWE auth, x402 payments            │
└──────────────────────────┬──────────────────────────────────┘
                           │  x402 flow (402 → deposit → retry)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend API (Express + Prisma)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Auth     │ │ Gateway  │ │ Resources│ │ CRE Webhooks │   │
│  │ (SIWE)   │ │ (x402)   │ │ (CRUD)   │ │ (callbacks)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                        │  PostgreSQL  │                      │
└────────────┬───────────┴──────────────┬─────────────────────┘
             │                          │
    verify-delivery             settlement-complete
    analyze-dispute              dispute-resolved
    expired-escrows
             │                          │
             ▼                          │
┌─────────────────────────────────────────────────────────────┐
│              CRE Workflows (Chainlink)                      │
│  ┌────────────────┐ ┌───────────────┐ ┌────────────────┐   │
│  │  Settlement    │ │   Dispute     │ │    Expiry      │   │
│  │  Verifier      │ │   Resolver    │ │   Watchdog     │   │
│  └───────┬────────┘ └──────┬────────┘ └───────┬────────┘   │
│          │  Signed reports  │                   │            │
└──────────┼──────────────────┼───────────────────┼───────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Ethereum Sepolia                                │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │ EscrowMarketplace  │◄───│ DisputeConsumer (reports)   │   │
│  │ deposit / settle /  │    │ onReport → finalize/refund  │   │
│  │ dispute / expiry    │    │                              │   │
│  └────────────────────┘    └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘`}</pre>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    ['Frontend', 'Next.js 15, React 19, TailwindCSS, RainbowKit, wagmi'],
                                    ['Backend', 'Express 5, TypeScript, Prisma, JWT + SIWE auth'],
                                    ['Database', 'PostgreSQL — Users, Resources, Transactions'],
                                    ['Blockchain', 'Ethereum Sepolia, Foundry, Chainlink CRE'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-2">{title}</h4>
                                        <p className="text-gray-500 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 7. API Reference */}
                        <section id="api" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">7</span>
                                API Reference
                            </h2>
                            <div className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-4 mb-6">
                                <p className="text-[#4C8BF5] text-sm font-mono">
                                    Base URL: <span className="text-white">http://localhost:3001/api</span>
                                </p>
                            </div>

                            {/* Public / Explore */}
                            <h3 className="text-lg font-semibold text-white mb-4">Explore & Gateway</h3>
                            {[
                                {
                                    method: 'GET', color: 'green', path: '/explore',
                                    desc: 'List all public resources available for purchase.',
                                    code: `{ "resources": [{ "id": "abc123", "title": "ETH Price Feed", "price": 0.002 }] }`,
                                },
                                {
                                    method: 'GET', color: 'green', path: '/explore/:id',
                                    desc: 'Get resource details including payment requirements.',
                                    code: `{ "resource": { "id": "abc123", "title": "ETH Price Feed" }, "payment": { "amount": 0.002, "token": "ETH" } }`,
                                },
                                {
                                    method: 'GET', color: 'blue', path: '/explore/:id/access',
                                    desc: 'Primary x402 endpoint. Returns 402 with escrow deposit address if unpaid, or resource content if X-Payment header is valid.',
                                    code: `// 402 Response headers:\nX-Payment-Required: true\nX-Payment-Amount: 2000000000000000  // wei\nX-Payment-Address: 0x...  // escrow contract`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/gateway/settle',
                                    desc: 'Agent notifies backend that settlement was requested on-chain.',
                                    code: `{ "escrowKey": "0xabc...", "txHash": "0x123..." }`,
                                },
                            ].map((ep) => (
                                <div key={ep.path} className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-2 py-1 text-xs font-mono rounded ${ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : ep.method === 'POST' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{ep.method}</span>
                                        <code className="text-white font-mono text-sm">{ep.path}</code>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-3">{ep.desc}</p>
                                    <div className="bg-black rounded-lg p-4">
                                        <pre className="text-sm text-gray-400 overflow-x-auto">{ep.code}</pre>
                                    </div>
                                </div>
                            ))}

                            {/* Auth */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-8">Authentication</h3>
                            {[
                                {
                                    method: 'GET', color: 'green', path: '/auth/nonce',
                                    desc: 'Get a nonce for SIWE (Sign-In With Ethereum) authentication.',
                                    code: `{ "nonce": "abc123xyz" }`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/auth/verify',
                                    desc: 'Submit signed SIWE message to receive a JWT token.',
                                    code: `{ "message": "...", "signature": "0x..." }\n// Response: Sets httpOnly cookie + returns JWT`,
                                },
                            ].map((ep) => (
                                <div key={ep.path} className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-2 py-1 text-xs font-mono rounded ${ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{ep.method}</span>
                                        <code className="text-white font-mono text-sm">{ep.path}</code>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-3">{ep.desc}</p>
                                    <div className="bg-black rounded-lg p-4">
                                        <pre className="text-sm text-gray-400 overflow-x-auto">{ep.code}</pre>
                                    </div>
                                </div>
                            ))}

                            {/* Resources */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-8">Resources (JWT Required)</h3>
                            {[
                                {
                                    method: 'POST', color: 'purple', path: '/resources',
                                    desc: 'Create a new resource listing (merchant only).',
                                    code: `{ "title": "My Dataset", "type": "LINK", "price": 0.002, "network": "SEPOLIA", "token": "ETH" }`,
                                },
                            ].map((ep) => (
                                <div key={ep.path} className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-mono rounded">{ep.method}</span>
                                        <code className="text-white font-mono text-sm">{ep.path}</code>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-3">{ep.desc}</p>
                                    <div className="bg-black rounded-lg p-4">
                                        <pre className="text-sm text-gray-400 overflow-x-auto">{ep.code}</pre>
                                    </div>
                                </div>
                            ))}

                            {/* CRE Webhooks */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-8">CRE Webhook Endpoints</h3>
                            <p className="text-gray-400 text-sm mb-4">These endpoints are called by CRE workflows during the automated settlement/dispute lifecycle.</p>
                            {[
                                {
                                    method: 'GET', color: 'green', path: '/cre/verify-delivery/:key',
                                    desc: 'CRE Settlement Verifier checks whether the resource was delivered to the buyer.',
                                    code: `// Response:\n{ "delivered": true, "escrowKey": "0xabc...", "resourceId": "..." }`,
                                },
                                {
                                    method: 'GET', color: 'green', path: '/cre/analyze-dispute/:key',
                                    desc: 'CRE Dispute Resolver requests AI analysis of the disputed resource.',
                                    code: `// Response:\n{ "payMerchant": false, "confidence": 0.87, "reason": "Resource does not match description" }`,
                                },
                                {
                                    method: 'GET', color: 'green', path: '/cre/expired-escrows',
                                    desc: 'CRE Expiry Watchdog fetches all escrows past their expiry window.',
                                    code: `// Response:\n{ "escrows": [{ "key": "0xabc...", "buyer": "0x...", "expiry": 1700000000 }] }`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/cre/settlement-complete',
                                    desc: 'CRE notifies backend after successfully finalizing a settlement on-chain.',
                                    code: `{ "escrowKey": "0xabc...", "txHash": "0x123...", "status": "settled" }`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/cre/dispute-resolved',
                                    desc: 'CRE notifies backend after resolving a dispute on-chain.',
                                    code: `{ "escrowKey": "0xabc...", "txHash": "0x123...", "payMerchant": false, "status": "refunded" }`,
                                },
                            ].map((ep) => (
                                <div key={ep.path} className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-2 py-1 text-xs font-mono rounded ${ep.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{ep.method}</span>
                                        <code className="text-white font-mono text-sm">{ep.path}</code>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-3">{ep.desc}</p>
                                    <div className="bg-black rounded-lg p-4">
                                        <pre className="text-sm text-gray-400 overflow-x-auto">{ep.code}</pre>
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* 8. Future Integrations */}
                        <section id="future" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">8</span>
                                Future Integrations
                            </h2>
                            <div className="space-y-4">
                                {[
                                    ['Multi-Token Payments', 'Support for USDC, USDT, and other ERC-20 stablecoins alongside ETH.'],
                                    ['Chainlink Data Streams', 'Real-time, low-latency market data via Chainlink Data Streams for high-frequency agent trading.'],
                                    ['ML Price Prediction Models', 'Merchants deploy ML models for crypto price predictions. AI agents access forecasts through private payments.'],
                                    ['Cross-Chain Support', 'Expand to Polygon, Arbitrum, and other EVM chains with unified payment routing.'],
                                    ['Chainlink Private Token', 'Transaction privacy with shielded addresses for confidential payments between agents and merchants.'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-5">
                                        <h4 className="text-white font-semibold mb-2">{title}</h4>
                                        <p className="text-gray-400 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="hidden xl:block w-56 shrink-0 border-l border-white/10 h-screen sticky top-0">
                    <div className="p-6">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Quick Links</h4>
                        <div className="space-y-3">
                            <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                                <Home size={16} /> Home
                            </Link>
                            <a href="https://x.com/0xAmbesh" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm">
                                <Twitter size={16} /> Twitter
                            </a>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
