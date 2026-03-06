'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Home, Twitter, ChevronRight, Zap, Shield, Bot, ArrowRight, Sparkles, Lock, Workflow } from 'lucide-react';

const sections = [
    { id: 'overview', title: 'Hackathon Overview' },
    { id: 'escrow', title: 'Escrow Lifecycle' },
    { id: 'x402', title: 'x402 Gateway Flow' },
    { id: 'workflows', title: 'Merchant Workflows' },
    { id: 'cre', title: 'CRE Integration' },
    { id: 'contracts', title: 'Smart Contracts' },
    { id: 'architecture', title: 'Architecture & Stack' },
    { id: 'api', title: 'AI Agent API' },
    { id: 'future', title: 'Roadmap & Next Steps' },
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
                            <img src="/docs/banner3.png" alt="Chainlink Agent" className="w-full h-auto" />
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
                                <span className="text-xs font-medium text-[#4C8BF5] tracking-wide">Chainlink CRE Hackathon Project</span>
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
                                <span className="text-gray-400 text-4xl font-medium">Hackathon Documentation</span>
                            </h1>

                            {/* Description */}
                            <p
                                className={`text-gray-400 text-lg leading-relaxed mb-10 max-w-2xl ${overviewVisible ? 'animate-fade-up' : 'opacity-0'}`}
                                style={{ animationDelay: '0.35s' }}
                            >
                                Chainlink Agent is our CRE Hackathon build: an end-to-end marketplace where merchants list
                                resources, build automations, and AI agents purchase via x402 + on-chain escrow on Ethereum
                                Sepolia. Settlement, disputes, expiry, and workflow actions are automated by{' '}
                                <span className="text-[#375BD2] font-semibold">Chainlink CRE</span>.
                            </p>

                            {/* Feature Cards — Pinterest-style staggered grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                {[
                                    {
                                        icon: <Zap size={20} />,
                                        title: 'Merchant Marketplace',
                                        desc: 'List resources, copy gateway URLs, and track transactions, earnings, trust scores, and disputes from one dashboard.',
                                        color: '#375BD2',
                                        delay: '0.4s',
                                    },
                                    {
                                        icon: <Workflow size={20} />,
                                        title: 'Workflow Builder',
                                        desc: 'Create visual workflows or generate them with AI to automate pricing and resource actions.',
                                        color: '#4C8BF5',
                                        delay: '0.5s',
                                    },
                                    {
                                        icon: <Lock size={20} />,
                                        title: 'x402 + Escrow',
                                        desc: 'AI agents complete a 402 payment flow and access resources after on-chain escrow deposit.',
                                        color: '#10B981',
                                        delay: '0.6s',
                                    },
                                    {
                                        icon: <Bot size={20} />,
                                        title: 'CRE Dispute & Settlement',
                                        desc: 'CRE workflows verify delivery, run AI dispute analysis, and finalize outcomes on-chain.',
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
                                    { value: 'CRE', label: 'Automation' },
                                    { value: 'Workflows', label: 'Builder' },
                                    { value: 'x402', label: 'Payments' },
                                    { value: 'Sepolia', label: 'Network' },
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

                        {/* 2. Escrow Lifecycle */}
                        <section id="escrow" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">2</span>
                                Escrow Lifecycle
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Every purchase flows through the on-chain escrow contract, protecting both agents and merchants.
                                These are the states the escrow moves through during the x402 payment flow:
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
                                    ['Created', 'The backend or agent creates an escrow on-chain for a specific resource purchase. No funds locked yet.'],
                                    ['Funded', 'The agent calls deposit(key), locking ETH into EscrowMarketplace.'],
                                    ['SettlementRequested', 'After delivery, the agent calls requestSettlement(). CRE verifies delivery and finalizes.'],
                                    ['Disputed', 'If the agent is unsatisfied, raiseDispute() is called and CRE runs AI analysis.'],
                                    ['Settled', 'Funds are released to the merchant after CRE verification or merchant-favored dispute.'],
                                    ['Refunded', 'Funds are returned to the agent when CRE rules in the agent\'s favor.'],
                                    ['Released', 'If the escrow expires, the CRE Expiry Watchdog auto-refunds the agent.'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-1">{title}</h4>
                                        <p className="text-gray-500 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. x402 Gateway Flow */}
                        <section id="x402" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">3</span>
                                x402 Gateway Flow
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                The gateway exposes a native HTTP 402 flow so AI agents can pay and access resources programmatically.
                                Below is the exact flow used in the hackathon demo:
                            </p>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <ol className="space-y-4 text-gray-400">
                                    {[
                                        ['Discover resource', 'GET /api/explore or /api/explore/:id to list resources and price requirements.'],
                                        ['Request gateway access', 'GET /api/gateway/resource/:resourceId with X-Agent-Address to pre-create an escrow.'],
                                        ['Receive 402 payment requirements', 'Backend returns HTTP 402 with escrow key, contract address, and required amount.'],
                                        ['Deposit on-chain', 'Agent calls deposit(key) on EscrowMarketplace with the required ETH amount.'],
                                        ['Retry with X-Payment', 'Agent retries the GET request with X-Payment header containing the escrow key + tx hash.'],
                                        ['Content delivery', 'Backend verifies on-chain deposit and returns the resource + transaction headers.'],
                                        ['Settle or dispute', 'Agent calls requestSettlement(key) or raiseDispute(key) and then POST /api/gateway/settle.'],
                                        ['CRE finalizes', 'CRE workflows verify delivery or run AI dispute analysis and finalize on-chain.'],
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
                                    <strong>Note:</strong> X-Payment is a base64 JSON payload:
                                    <code className="ml-2 text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">{"{ version:1, scheme:\"chainlink-escrow\", payload:{ key, txHash, sender } }"}</code>.
                                    Funds are only released after CRE verifies delivery or resolves a dispute; expired escrows are refunded automatically.
                                </p>
                            </div>
                        </section>

                        {/* 4. Merchant Workflows */}
                        <section id="workflows" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">4</span>
                                Merchant Workflows
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/landing/100M.png" alt="Workflow Builder" className="w-full h-auto" />
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Merchants can build visual workflows to automate pricing, availability, and resource actions.
                                Workflows are created in the dashboard or generated with AI, then executed by the CRE workflow engine.
                            </p>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <ol className="space-y-4 text-gray-400">
                                    {[
                                        ['Create a workflow', 'Use the workflow builder or AI generator to define nodes, edges, and schedule.'],
                                        ['Save & activate', 'Workflow definitions are stored with status and schedule.'],
                                        ['CRE engine picks up', 'CRE polls active workflows and triggers runs on schedule.'],
                                        ['Fetch live stats', 'Engine pulls resource stats and transaction data for conditions.'],
                                        ['Execute actions', 'CRE calls workflow actions to update prices or toggle resources.'],
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
                                    <strong>Example:</strong> Auto-reduce price if disputes exceed a threshold, or pause a resource if settlement rate drops.
                                </p>
                            </div>
                        </section>

                        {/* 5. CRE Integration */}
                        <section id="cre" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">5</span>
                                CRE Integration
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Chainlink CRE (Compute Runtime Environment) powers three workflows that automate settlement,
                                disputes, and expiry. Each workflow runs off-chain logic, signs a report, submits it to
                                <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs ml-1">DisputeConsumer</code>,
                                and syncs the backend via webhook endpoints.
                            </p>
                            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-5 mb-6">
                                <h3 className="text-lg font-semibold text-white mb-3">Integration Points</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        ['On-chain events', 'CRE listens for SettlementRequested and DisputeRaised from EscrowMarketplace.'],
                                        ['Webhook calls', 'CRE calls backend endpoints to verify delivery and run AI dispute analysis.'],
                                        ['Signed reports', 'CRE submits reports to DisputeConsumer to finalize on-chain outcomes.'],
                                        ['Workflow engine', 'CRE also runs merchant workflow schedules and executes actions.'],
                                    ].map(([title, desc]) => (
                                        <div key={title} className="bg-[#111] rounded-xl border border-white/10 p-4">
                                            <h4 className="text-white font-medium mb-1">{title}</h4>
                                            <p className="text-gray-500 text-sm">{desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/verify-delivery/:escrowKey</code> to confirm delivery (payment header + on-chain state).</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs report <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">{'{ escrowKey, payMerchant: true }'}</code> and submits to DisputeConsumer.</span>
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
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/analyze-dispute/:escrowKey</code> to run AI analysis on the resource + dispute context.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs report with <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = verdict</code> and submits to DisputeConsumer.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5">OUTCOME</span>
                                            <span>Merchant is paid or agent is refunded. Backend notified via <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">POST /api/cre/dispute-resolved</code>.</span>
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
                                            <span>Calls backend <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/expired-escrows</code> to find escrows past expiry.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">REPORT</span>
                                            <span>Signs report <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = false</code> for each expired escrow and submits to DisputeConsumer.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">OUTCOME</span>
                                            <span>Agent is automatically refunded so funds never remain locked indefinitely.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 6. Smart Contracts */}
                        <section id="contracts" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">6</span>
                                Smart Contracts
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/docs/banner1.png" alt="Smart Contracts" className="w-full h-auto" />
                            </div>

                            {/* EscrowMarketplace */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-2">EscrowMarketplace.sol</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    The core contract that holds funds in escrow and manages the payment lifecycle for each resource.
                                    Used by the x402 gateway and CRE workflows.
                                </p>
                                <h4 className="text-white font-medium mb-3 text-sm">Key Functions</h4>
                                <div className="space-y-2">
                                    {[
                                        ['createEscrow()', 'Creates a new escrow record for a resource purchase (can be pre-created by the backend).'],
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
                                <p className="text-gray-400 text-sm mb-4">
                                    Receives signed CRE reports (via ReceiverTemplate) and calls EscrowMarketplace to finalize settlement or refunds.
                                </p>
                                <h4 className="text-white font-medium mb-3 text-sm">How It Works</h4>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`CRE Workflow
  │
  ├── Signs report: { escrowKey, payMerchant }
  │
  └── Submits to DisputeConsumer (ReceiverTemplate)
        │
        ├── payMerchant = true  → calls finalizeSettlement()
        └── payMerchant = false → calls resolveDispute() (refund)`}</pre>
                                </div>
                            </div>

                            {/* ReceiverTemplate */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mt-6">
                                <h3 className="text-xl font-semibold text-white mb-2">ReceiverTemplate.sol</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Base receiver contract used to validate CRE reports. DisputeConsumer extends it to decode
                                    <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs ml-1">{"{ escrowKey, payMerchant }"}</code>
                                    and finalize outcomes on-chain.
                                </p>
                            </div>
                        </section>

                        {/* 7. Architecture & Stack */}
                        <section id="architecture" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">7</span>
                                Architecture & Stack
                            </h2>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <pre className="text-sm text-gray-400 overflow-x-auto">{`┌─────────────────────────────────────────────────────────────┐
│          AI Agent + Frontend (Next.js Dashboard)            │
│   Marketplace, workflow builder, demo terminal              │
└──────────────────────────┬──────────────────────────────────┘
                           │  x402 flow (402 → deposit → retry)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend API (Express + Prisma)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Auth     │ │ Gateway  │ │ Resources│ │ Workflows    │   │
│  │ (SIWE)   │ │ (x402)   │ │ (CRUD)   │ │ + Disputes   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                        │  PostgreSQL  │                      │
└────────────┬───────────┴──────────────┬─────────────────────┘
             │                          │
    verify-delivery             workflow actions
    analyze-dispute              resource-stats
    expired-escrows
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│              CRE Workflows (Chainlink)                      │
│  ┌────────────────┐ ┌───────────────┐ ┌────────────────┐   │
│  │  Settlement    │ │   Dispute     │ │    Expiry      │   │
│  │  Verifier      │ │   Resolver    │ │   Watchdog     │   │
│  └───────┬────────┘ └──────┬────────┘ └───────┬────────┘   │
│          │  Signed reports  │                   │            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Workflow Engine (merchant automations + schedules)   │   │
│  └──────────────────────────────────────────────────────┘   │
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
                                    ['Frontend', 'Next.js 16, React 19, TailwindCSS, RainbowKit, wagmi'],
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

                        {/* 8. AI Agent API */}
                        <section id="api" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">8</span>
                                AI Agent API
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
                                    desc: 'List all active resources with trust scores.',
                                    code: `{ "resources": [{ "id": "abc123", "title": "ETH Price Feed", "price": 0.002, "trustScore": 82 }] }`,
                                },
                                {
                                    method: 'GET', color: 'green', path: '/explore/:id',
                                    desc: 'Fetch a single resource with payment requirements and gateway endpoint.',
                                    code: `{ "resource": { "id": "abc123", "title": "ETH Price Feed" }, "payment": { "required": true, "amount": 0.002, "accessEndpoint": "/api/gateway/resource/abc123" } }`,
                                },
                                {
                                    method: 'GET', color: 'blue', path: '/gateway/resource/:resourceId',
                                    desc: 'Primary x402 gateway endpoint. Include X-Agent-Address to pre-create escrow. Returns 402 with escrow key if unpaid, or resource content if paid.',
                                    code: `// 402 JSON\n{ "paymentRequirements": { "amount": 0.002, "escrowContract": "0x..." }, "escrow": { "key": "0x..." } }`,
                                },
                                {
                                    method: 'GET', color: 'blue', path: '/gateway/escrow/:escrowId',
                                    desc: 'Check on-chain escrow status and locked amount.',
                                    code: `{ "key": "0x...", "lockedETH": 0.002, "isFunded": true }`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/gateway/settle',
                                    desc: 'Agent notifies backend after requestSettlement() or raiseDispute().',
                                    code: `{ "transactionId": "tx_123", "status": "SETTLED" | "DISPUTED" }`,
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
                            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-5">
                                <h3 className="text-lg font-semibold text-white mb-3">X-Payment Header</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Agents send an <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">X-Payment</code> header
                                    after depositing on-chain. The payload is base64 JSON:
                                </p>
                                <div className="bg-black rounded-lg p-4">
                                    <pre className="text-sm text-gray-400 overflow-x-auto">{`btoa(JSON.stringify({
  version: 1,
  scheme: "chainlink-escrow",
  payload: { key, txHash, sender }
}))`}</pre>
                                </div>
                            </div>
                        </section>

                        {/* 9. Roadmap & Next Steps */}
                        <section id="future" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">9</span>
                                Roadmap & Next Steps
                            </h2>
                            <div className="space-y-4">
                                {[
                                    ['Multi-Token Payments', 'Add USDC/USDT support and dynamic pricing based on token choice.'],
                                    ['CRE Workflow Marketplace', 'Publish reusable workflow templates for common merchant automations.'],
                                    ['Agent SDK', 'Ship a lightweight SDK for agents to integrate x402 + escrow in a few lines.'],
                                    ['Cross-Chain Expansion', 'Extend escrow + CRE workflows beyond Sepolia to other EVM chains.'],
                                    ['Advanced Trust Scoring', 'Incorporate delivery SLAs, latency, and merchant reputation signals.'],
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
