'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Home, Twitter, ChevronRight, Zap, Shield, Bot, ArrowRight, Sparkles, Lock, Workflow, Eye, EyeOff } from 'lucide-react';

const sections = [
    { id: 'intro', title: 'The Problem' },
    { id: 'concepts', title: 'Core Concepts' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'lifecycle', title: 'Transaction Lifecycle' },
    { id: 'privacy', title: 'Privacy & Shielded Payments' },
    { id: 'cre', title: 'CRE Integration' },
    { id: 'contracts', title: 'Smart Contracts' },
    { id: 'api', title: 'AI Agent API' },
];

/* ── tiny reusable pieces ────────────────────────────────── */

function SectionNumber({ n }: { n: number }) {
    return (
        <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">
            {n}
        </span>
    );
}

function FlowArrow() {
    return <div className="flex justify-center py-1 text-[#375BD2]/40 text-xl select-none">|</div>;
}

function FlowStep({ label, detail, accent = '#375BD2' }: { label: string; detail: string; accent?: string }) {
    return (
        <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: accent }} />
            <div>
                <span className="text-white font-medium text-sm">{label}</span>
                <p className="text-gray-500 text-xs mt-0.5">{detail}</p>
            </div>
        </div>
    );
}

function CodeBlock({ children }: { children: string }) {
    return (
        <div className="bg-black rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-400">{children}</pre>
        </div>
    );
}

function ApiEndpoint({ method, path, desc, response }: { method: string; path: string; desc: string; response: string }) {
    const colors: Record<string, string> = {
        GET: 'bg-green-500/20 text-green-400',
        POST: 'bg-purple-500/20 text-purple-400',
        PATCH: 'bg-yellow-500/20 text-yellow-400',
        DELETE: 'bg-red-500/20 text-red-400',
    };
    return (
        <div className="bg-[#111] rounded-2xl border border-white/10 p-5 mb-4">
            <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 text-xs font-mono rounded ${colors[method] || 'bg-blue-500/20 text-blue-400'}`}>{method}</span>
                <code className="text-white font-mono text-sm">{path}</code>
            </div>
            <p className="text-gray-400 text-sm mb-3">{desc}</p>
            <CodeBlock>{response}</CodeBlock>
        </div>
    );
}

/* ── page ─────────────────────────────────────────────────── */

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState('intro');
    const [heroVisible, setHeroVisible] = useState(false);
    const heroRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setHeroVisible(true); },
            { threshold: 0.1 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 150;
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i].id);
                if (el && el.offsetTop <= scrollPos) { setActiveSection(sections[i].id); break; }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="flex">
                {/* ── Left sidebar ────────────────────────────── */}
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
                                <span className="text-[#375BD2]">&#9670;</span> Marketplace
                            </Link>
                        </div>
                        <div className="border-t border-white/10 pt-4 mb-2">
                            <span className="text-xs text-gray-600 uppercase tracking-wider px-3">Documentation</span>
                        </div>
                        <nav className="space-y-1">
                            {sections.map((s) => (
                                <button key={s.id} onClick={() => scrollTo(s.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeSection === s.id ? 'bg-[#375BD2]/20 text-[#375BD2] font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                    {activeSection === s.id && <ChevronRight size={14} />}
                                    {s.title}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* ── Main content ────────────────────────────── */}
                <main className="flex-1 min-w-0">
                    <div className="max-w-3xl mx-auto px-6 py-16">

                        {/* Banner */}
                        <div className="mb-16 rounded-2xl overflow-hidden border border-white/10">
                            <img src="/docs/banner3.png" alt="Chainlink Agent" className="w-full h-auto" />
                        </div>

                        {/* ═══════════════════════════════════════════
                            1. THE PROBLEM
                        ═══════════════════════════════════════════ */}
                        <section id="intro" className="mb-24 relative" ref={heroRef}>
                            <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#375BD2]/10 rounded-full blur-[120px] animate-pulse-glow pointer-events-none" />

                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#375BD2]/20 bg-[#375BD2]/5 mb-6 ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
                                <Sparkles size={12} className="text-[#4C8BF5]" />
                                <span className="text-xs font-medium text-[#4C8BF5] tracking-wide">Chainlink CRE Hackathon</span>
                            </div>

                            <h1 className={`text-5xl font-bold mb-4 leading-tight ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
                                Chainlink{' '}
                                <span className="bg-gradient-to-r from-[#375BD2] via-[#4C8BF5] to-[#375BD2] bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">Agent</span>
                            </h1>

                            <p className={`text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
                                AI agents need to buy data programmatically. Today that means trusting centralized APIs, exposing payment details on-chain, and having no recourse when data is bad. <span className="text-white font-medium">Chainlink Agent fixes this.</span>
                            </p>

                            {/* Problem cards */}
                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
                                {[
                                    { icon: <Lock size={20} />, title: 'No Trustless Payments', desc: 'Agents must pre-pay centralized APIs with no escrow or refund if data is garbage.', color: '#EF4444' },
                                    { icon: <Eye size={20} />, title: 'Zero Privacy', desc: 'Every payment is fully visible on-chain — competitors can track spending and suppliers.', color: '#F59E0B' },
                                    { icon: <Bot size={20} />, title: 'No Dispute Resolution', desc: 'When delivered data is wrong, there is no automated way to get a refund.', color: '#8B5CF6' },
                                ].map((p) => (
                                    <div key={p.title} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${p.color}15`, color: p.color }}>
                                            {p.icon}
                                        </div>
                                        <h4 className="text-white font-semibold text-sm mb-1.5">{p.title}</h4>
                                        <p className="text-gray-500 text-[13px] leading-relaxed">{p.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Solution banner */}
                            <div className={`bg-gradient-to-r from-[#375BD2]/15 to-[#375BD2]/5 rounded-2xl border border-[#375BD2]/20 p-6 mb-10 ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
                                <h3 className="text-white font-bold text-lg mb-3">The Solution</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Chainlink Agent is an end-to-end marketplace where merchants list data resources and AI agents purchase them via <span className="text-[#375BD2] font-semibold">x402 + on-chain escrow</span>. Settlement, disputes, and expiry are automated by <span className="text-[#375BD2] font-semibold">Chainlink CRE</span>. Merchant payouts happen through <span className="text-[#375BD2] font-semibold">Chainlink Private Token</span> shielded addresses — so payment amounts and recipients stay confidential.
                                </p>
                            </div>

                            {/* Chainlink integration highlights */}
                            <div className={`${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
                                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <div className="w-5 h-0.5 bg-[#375BD2] rounded" />
                                    Chainlink Stack
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { label: 'CRE Workflows', desc: 'Settlement verifier, dispute resolver, expiry watchdog' },
                                        { label: 'Private Tokens', desc: 'Shielded merchant payouts with hidden sender' },
                                        { label: 'Automation', desc: 'Merchant workflow engine for pricing & availability' },
                                        { label: 'Sepolia Testnet', desc: 'EscrowMarketplace + DisputeConsumer contracts' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center gap-3 bg-[#0a0a0a] rounded-xl border border-white/10 p-3">
                                            <div className="w-2 h-2 rounded-full bg-[#375BD2] shrink-0" />
                                            <div>
                                                <span className="text-white text-sm font-medium">{item.label}</span>
                                                <span className="text-gray-500 text-xs ml-2">{item.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className={`flex items-center gap-4 mt-10 ${heroVisible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.7s' }}>
                                <Link href="/dashboard" className="group relative inline-flex items-center gap-2 px-7 py-3.5 bg-[#375BD2] hover:bg-[#2A4AB0] text-white font-medium rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(55,91,210,0.4)]">
                                    Get Started <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                                <Link href="/dashboard/demo" className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-medium rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300">
                                    Try Demo <Sparkles size={14} className="text-gray-500 group-hover:text-[#4C8BF5] transition-colors duration-300" />
                                </Link>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            2. CORE CONCEPTS
                        ═══════════════════════════════════════════ */}
                        <section id="concepts" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={2} /> Core Concepts
                            </h2>

                            <div className="grid gap-4">
                                {[
                                    {
                                        title: 'x402 Protocol',
                                        desc: 'An HTTP-native payment flow. Agents hit a gateway URL, receive HTTP 402 with escrow details, deposit on-chain, then retry with an X-Payment header to unlock the resource.',
                                        icon: <Zap size={20} />,
                                        color: '#375BD2',
                                    },
                                    {
                                        title: 'On-Chain Escrow',
                                        desc: 'Funds are locked in EscrowMarketplace.sol until settlement or dispute resolution. Neither party can run with the money — the contract enforces fair outcomes.',
                                        icon: <Lock size={20} />,
                                        color: '#10B981',
                                    },
                                    {
                                        title: 'CRE (Compute Runtime Environment)',
                                        desc: 'Chainlink CRE runs off-chain workflows that listen for on-chain events, call backend APIs for verification, and submit signed reports to finalize outcomes. Three workflows: settlement verifier, dispute resolver, expiry watchdog.',
                                        icon: <Workflow size={20} />,
                                        color: '#4C8BF5',
                                    },
                                    {
                                        title: 'Chainlink Private Tokens',
                                        desc: 'After on-chain settlement, merchant payouts go through Chainlink Private Token shielded addresses. Sender identity is hidden, balances are confidential, and the two-phase flow (ETH to treasury, then CLAG to shielded address) keeps payment graphs private.',
                                        icon: <EyeOff size={20} />,
                                        color: '#8B5CF6',
                                    },
                                    {
                                        title: 'SIWE Authentication',
                                        desc: 'Sign-In With Ethereum. Users connect their wallet, sign a nonce-based challenge, and receive a JWT. No passwords, no email — just a wallet signature.',
                                        icon: <Shield size={20} />,
                                        color: '#F59E0B',
                                    },
                                ].map((c) => (
                                    <div key={c.title} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-white/[0.12] transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: `${c.color}15`, color: c.color }}>
                                                {c.icon}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold text-sm mb-1.5 group-hover:text-[#4C8BF5] transition-colors">{c.title}</h4>
                                                <p className="text-gray-500 text-[13px] leading-relaxed">{c.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            3. ARCHITECTURE
                        ═══════════════════════════════════════════ */}
                        <section id="architecture" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={3} /> Architecture
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Four layers — frontend, backend, Chainlink CRE, and Ethereum — connected by the x402 protocol and private settlement flow.
                            </p>

                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <CodeBlock>{`┌──────────────────────────────────────────────────────────────────┐
│                AI Agent  /  Next.js Dashboard                    │
│   Explore resources, purchase via x402, build workflows          │
└─────────────────────────────┬────────────────────────────────────┘
                              │  HTTP (402 challenge → deposit → retry)
                              v
┌──────────────────────────────────────────────────────────────────┐
│                  Backend API  (Express + Prisma)                  │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Auth  │ │ Gateway  │ │Resources │ │ Workflows │ │Private │ │
│  │ (SIWE) │ │  (x402)  │ │  (CRUD)  │ │ + CRE     │ │ Token  │ │
│  └────────┘ └──────────┘ └──────────┘ └───────────┘ └────────┘ │
│                         PostgreSQL                               │
└────────┬──────────────────────┬──────────────────────┬───────────┘
         │                      │                      │
   verify-delivery        workflow actions       private-settle
   analyze-dispute        resource-stats         verify-transfer
   expired-escrows
         │                      │                      │
         v                      v                      v
┌──────────────────────────────────────────────────────────────────┐
│                    Chainlink CRE Workflows                        │
│  ┌─────────────────┐ ┌────────────────┐ ┌─────────────────────┐ │
│  │   Settlement    │ │    Dispute     │ │   Expiry Watchdog   │ │
│  │   Verifier      │ │    Resolver    │ │   (cron: 60s)       │ │
│  └────────┬────────┘ └───────┬────────┘ └──────────┬──────────┘ │
│           │   Signed reports │                      │            │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │        Workflow Engine  (merchant automations)            │   │
│  └───────────────────────────────────────────────────────────┘   │
└───────────┼──────────────────┼──────────────────────┼────────────┘
            │                  │                      │
            v                  v                      v
┌──────────────────────────────────────────────────────────────────┐
│                      Ethereum Sepolia                             │
│  ┌─────────────────────┐    ┌──────────────────────────────┐     │
│  │  EscrowMarketplace  │<───│  DisputeConsumer (CRE reports)│     │
│  │  deposit / settle / │    │  onReport -> finalize/refund  │     │
│  │  dispute / expiry   │    └──────────────────────────────┘     │
│  └─────────────────────┘                                         │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Chainlink Private Token  (shielded addresses + vault)    │   │
│  │  treasury -> merchant shielded payout (hide-sender)       │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘`}</CodeBlock>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    ['Frontend', 'Next.js 15, React 19, TailwindCSS, RainbowKit, wagmi'],
                                    ['Backend', 'Express 5, TypeScript, Prisma ORM, JWT + SIWE auth'],
                                    ['Database', 'PostgreSQL — Users, Resources, Transactions, Workflows'],
                                    ['Blockchain', 'Ethereum Sepolia, Foundry, Chainlink CRE + Private Tokens'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-1">{title}</h4>
                                        <p className="text-gray-500 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            4. TRANSACTION LIFECYCLE
                        ═══════════════════════════════════════════ */}
                        <section id="lifecycle" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={4} /> Transaction Lifecycle
                            </h2>
                            <p className="text-gray-400 mb-6">
                                A complete purchase flows through 4 phases: discovery, payment, settlement, and private payout.
                            </p>

                            {/* Visual flow */}
                            <div className="space-y-0">
                                <div className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-4 mb-1">
                                    <span className="text-[#4C8BF5] text-xs font-mono uppercase tracking-wider">Phase 1 — Discovery</span>
                                </div>
                                <FlowStep label="Agent discovers resources" detail="GET /api/explore — browse active resources with pricing, trust scores, and gateway URLs" />
                                <FlowArrow />

                                <div className="bg-gradient-to-r from-[#10B981]/10 to-transparent rounded-xl border border-[#10B981]/20 p-4 mb-1">
                                    <span className="text-[#10B981] text-xs font-mono uppercase tracking-wider">Phase 2 — x402 Payment</span>
                                </div>
                                <FlowStep label="Agent requests gateway access" detail="GET /api/gateway/resource/:id with X-Agent-Address header" accent="#10B981" />
                                <FlowArrow />
                                <FlowStep label="Backend returns HTTP 402" detail="Response includes escrow key, contract address, and required ETH amount" accent="#10B981" />
                                <FlowArrow />
                                <FlowStep label="Agent deposits on-chain" detail="Calls deposit(key) on EscrowMarketplace.sol — funds locked in escrow" accent="#10B981" />
                                <FlowArrow />
                                <FlowStep label="Agent retries with X-Payment" detail="Base64 payload: { version, scheme: 'chainlink-escrow', payload: { key, txHash, sender } }" accent="#10B981" />
                                <FlowArrow />
                                <FlowStep label="Backend delivers resource" detail="Verifies on-chain deposit, returns content + transaction receipt" accent="#10B981" />
                                <FlowArrow />

                                <div className="bg-gradient-to-r from-[#F59E0B]/10 to-transparent rounded-xl border border-[#F59E0B]/20 p-4 mb-1">
                                    <span className="text-[#F59E0B] text-xs font-mono uppercase tracking-wider">Phase 3 — Settlement / Dispute</span>
                                </div>
                                <FlowStep label="Agent calls requestSettlement() or raiseDispute()" detail="On-chain call, then POST /api/gateway/settle to notify backend" accent="#F59E0B" />
                                <FlowArrow />
                                <FlowStep label="CRE workflow triggers" detail="Settlement Verifier checks delivery; Dispute Resolver runs AI analysis; Expiry Watchdog auto-refunds" accent="#F59E0B" />
                                <FlowArrow />
                                <FlowStep label="CRE submits signed report to DisputeConsumer" detail="Report contains { escrowKey, payMerchant: true/false } — finalized on-chain" accent="#F59E0B" />
                                <FlowArrow />

                                <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-transparent rounded-xl border border-[#8B5CF6]/20 p-4 mb-1">
                                    <span className="text-[#8B5CF6] text-xs font-mono uppercase tracking-wider">Phase 4 — Private Payout</span>
                                </div>
                                <FlowStep label="ETH settles into platform treasury" detail="On-chain settlement sends funds to facilitator wallet" accent="#8B5CF6" />
                                <FlowArrow />
                                <FlowStep label="Private Token transfer to merchant" detail="Backend calls Chainlink Private Token API — CLAG tokens sent to merchant's shielded address with hide-sender enabled" accent="#8B5CF6" />
                                <FlowArrow />
                                <FlowStep label="Merchant withdraws to ETH" detail="Merchant calls withdraw-eth endpoint — private CLAG converted back to ETH payout" accent="#8B5CF6" />
                            </div>

                            {/* Escrow state machine */}
                            <div className="mt-10 bg-[#111] rounded-2xl border border-white/10 p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Escrow State Machine</h3>
                                <CodeBlock>{`Created ──[deposit()]──> Funded
                             |
               ┌─────────────┼──────────────┐
               |             |              |
               v             v              v
  [requestSettlement()]  [raiseDispute()]  [expiry exceeded]
               |             |              |
               v             v              v
   SettlementRequested   Disputed        Released
               |             |           (auto-refund)
       [CRE verifies]   [CRE AI verdict]
               |             |
               v             v
           Settled      Settled OR Refunded
               |             |
               v             v
       [Private Token payout to merchant shielded address]`}</CodeBlock>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            5. PRIVACY & SHIELDED PAYMENTS
                        ═══════════════════════════════════════════ */}
                        <section id="privacy" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={5} /> Privacy & Shielded Payments
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Chainlink Private Token integration ensures merchant payouts are confidential. The two-phase settlement pattern separates the public escrow layer from the private payout layer.
                            </p>

                            {/* How it works */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Two-Phase Settlement Flow</h3>
                                <CodeBlock>{`Phase 1 (Public):   Agent ──[ETH deposit]──> EscrowMarketplace
                                              |
                                     [CRE settles on-chain]
                                              |
                                    ETH -> Platform Treasury

Phase 2 (Private):  Treasury ──[CLAG transfer]──> Merchant Shielded Address
                        |                                    |
                   hide-sender: true               shielded address (unlinkable)
                        |                                    |
                   sender identity hidden          balance confidential`}</CodeBlock>
                            </div>

                            {/* Privacy features grid */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                {[
                                    {
                                        title: 'Shielded Addresses',
                                        desc: 'Each merchant generates a privacy-preserving address via Chainlink Private Token API. Addresses cannot be linked back to the merchant\'s public wallet.',
                                    },
                                    {
                                        title: 'Hide-Sender Flag',
                                        desc: 'Every private transfer is executed with hide-sender enabled by default — the platform treasury address is never exposed in the transfer.',
                                    },
                                    {
                                        title: 'EIP-712 Authentication',
                                        desc: 'All Private Token API calls are authenticated with EIP-712 typed-data signatures. No API keys or passwords — just wallet-signed structured data.',
                                    },
                                    {
                                        title: 'Idempotent Payouts',
                                        desc: 'Private settlement can be safely retried without duplicates. The backend tracks privateTransferTxId to prevent double-spending.',
                                    },
                                ].map((f) => (
                                    <div key={f.title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-1">{f.title}</h4>
                                        <p className="text-gray-500 text-sm">{f.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Merchant payout APIs */}
                            <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-transparent rounded-xl border border-[#8B5CF6]/20 p-5">
                                <h4 className="text-white font-semibold mb-2">Merchant Privacy Endpoints</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-500/20 text-purple-400">POST</span>
                                        <code className="text-gray-300">/api/auth/shielded-address</code>
                                        <span className="text-gray-500">— Generate or save shielded address</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-500/20 text-purple-400">POST</span>
                                        <code className="text-gray-300">/api/auth/private-balance</code>
                                        <span className="text-gray-500">— Check private CLAG balance</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-purple-500/20 text-purple-400">POST</span>
                                        <code className="text-gray-300">/api/auth/withdraw-eth</code>
                                        <span className="text-gray-500">— Convert CLAG to ETH payout</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            6. CRE INTEGRATION
                        ═══════════════════════════════════════════ */}
                        <section id="cre" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={6} /> CRE Integration
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Chainlink CRE powers three core workflows plus the merchant automation engine. Each workflow runs off-chain logic, calls backend APIs for data, signs a report, and submits it to <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">DisputeConsumer</code> on-chain.
                            </p>

                            {/* Visual: CRE trigger flow */}
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-lg font-semibold text-white mb-4">CRE Workflow Pattern</h3>
                                <CodeBlock>{`On-Chain Event / Cron
        |
        v
  CRE Workflow Trigger
        |
        v
  Call Backend API (verify-delivery / analyze-dispute / expired-escrows)
        |
        v
  Build Report: { escrowKey, payMerchant: bool }
        |
        v
  Sign & Submit to DisputeConsumer
        |
        ├── payMerchant = true  -> finalizeSettlement() -> private payout
        └── payMerchant = false -> resolveDispute()     -> refund agent`}</CodeBlock>
                            </div>

                            {/* Three workflows */}
                            <div className="grid gap-6">
                                {/* Settlement Verifier */}
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 text-sm font-bold">1</span>
                                        <h3 className="text-xl font-semibold text-white">Settlement Verifier</h3>
                                    </div>
                                    <div className="space-y-3 text-gray-400 text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5 w-16 shrink-0">TRIGGER</span>
                                            <span><code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">SettlementRequested</code> event on-chain</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5 w-16 shrink-0">VERIFY</span>
                                            <span>Calls <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/verify-delivery/:escrowKey</code> — confirms resource was delivered</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5 w-16 shrink-0">REPORT</span>
                                            <span>Signs <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">{'{ escrowKey, payMerchant: true }'}</code> and submits to DisputeConsumer</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-400 font-mono text-xs mt-0.5 w-16 shrink-0">PAYOUT</span>
                                            <span>On-chain settlement triggers private token transfer to merchant&apos;s shielded address</span>
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
                                            <span className="text-orange-400 font-mono text-xs mt-0.5 w-16 shrink-0">TRIGGER</span>
                                            <span><code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">DisputeRaised</code> event on-chain</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5 w-16 shrink-0">ANALYZE</span>
                                            <span>Calls <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/analyze-dispute/:escrowKey</code> — AI evaluates resource vs. dispute</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5 w-16 shrink-0">REPORT</span>
                                            <span>Signs report with <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = verdict</code></span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-orange-400 font-mono text-xs mt-0.5 w-16 shrink-0">OUTCOME</span>
                                            <span>Merchant paid (+ private payout) or agent refunded based on AI verdict</span>
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
                                            <span className="text-red-400 font-mono text-xs mt-0.5 w-16 shrink-0">TRIGGER</span>
                                            <span>Cron schedule — every 60 seconds</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5 w-16 shrink-0">CHECK</span>
                                            <span>Calls <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">GET /api/cre/expired-escrows</code> — finds escrows past expiry</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5 w-16 shrink-0">REPORT</span>
                                            <span>Signs <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs">payMerchant = false</code> for each expired escrow</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-400 font-mono text-xs mt-0.5 w-16 shrink-0">OUTCOME</span>
                                            <span>Agent auto-refunded — funds never locked indefinitely</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Engine */}
                            <div className="mt-6 bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-5">
                                <h4 className="text-white font-semibold mb-2">Merchant Workflow Engine</h4>
                                <p className="text-gray-400 text-sm">
                                    Beyond the three core workflows, CRE also runs the merchant automation engine. Merchants build visual workflows (or generate them with AI) to automate pricing, toggle availability, and send notifications. CRE polls active workflows, fetches resource stats, and executes actions on schedule.
                                </p>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            7. SMART CONTRACTS (compact)
                        ═══════════════════════════════════════════ */}
                        <section id="contracts" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={7} /> Smart Contracts
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Two contracts on Sepolia — one for escrow, one for CRE report consumption.
                            </p>

                            <div className="grid gap-4">
                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-2">EscrowMarketplace.sol</h3>
                                    <p className="text-gray-400 text-sm mb-4">Holds funds in escrow and manages the full payment lifecycle. Supports ETH and ERC-20.</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {[
                                            ['createEscrow()', 'Create escrow record'],
                                            ['deposit()', 'Lock ETH/ERC-20'],
                                            ['requestSettlement()', 'Signal delivery received'],
                                            ['raiseDispute()', 'Flag bad data'],
                                            ['finalizeSettlement()', 'Release to merchant (facilitator)'],
                                            ['resolveDispute()', 'Pay or refund (facilitator)'],
                                            ['claimAfterExpiry()', 'Auto-refund after timeout'],
                                        ].map(([fn, desc]) => (
                                            <div key={fn} className="flex items-start gap-2 py-1">
                                                <code className="text-[#375BD2] text-xs font-mono whitespace-nowrap">{fn}</code>
                                                <span className="text-gray-500 text-xs">{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-2">DisputeConsumer.sol</h3>
                                    <p className="text-gray-400 text-sm mb-3">Receives signed CRE reports via ReceiverTemplate and calls EscrowMarketplace to finalize outcomes.</p>
                                    <CodeBlock>{`CRE signs report: { escrowKey, payMerchant }
  |
  └─> DisputeConsumer.onReport()
        ├── payMerchant = true  -> finalizeSettlement()
        └── payMerchant = false -> resolveDispute() (refund)`}</CodeBlock>
                                </div>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════
                            8. AI AGENT API
                        ═══════════════════════════════════════════ */}
                        <section id="api" className="mb-24">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <SectionNumber n={8} /> AI Agent API
                            </h2>
                            <p className="text-gray-400 mb-4">
                                Everything an AI agent needs to discover, purchase, settle, and dispute resources. No authentication required for the core purchase flow.
                            </p>

                            <div className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-4 mb-8">
                                <p className="text-[#4C8BF5] text-sm font-mono">
                                    Base URL: <span className="text-white">http://localhost:3001/api</span>
                                </p>
                            </div>

                            {/* Step 1: Discover */}
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#375BD2] text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                                Discover Resources
                            </h3>
                            <ApiEndpoint
                                method="GET" path="/explore"
                                desc="List all active resources with trust scores, pricing, and gateway URLs."
                                response={`{
  "resources": [{
    "id": "abc123",
    "title": "ETH Price Feed",
    "price": 0.002,
    "trustScore": 82,
    "merchant": { "walletAddress": "0x..." }
  }]
}`}
                            />
                            <ApiEndpoint
                                method="GET" path="/explore/:id"
                                desc="Get a single resource with full payment requirements and access endpoint."
                                response={`{
  "resource": { "id": "abc123", "title": "ETH Price Feed", "price": 0.002 },
  "payment": {
    "required": true,
    "amount": 0.002,
    "accessEndpoint": "/api/gateway/resource/abc123"
  }
}`}
                            />

                            {/* Step 2: Purchase */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-8 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#375BD2] text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
                                Purchase via x402 Gateway
                            </h3>
                            <ApiEndpoint
                                method="GET" path="/gateway/resource/:resourceId"
                                desc="Primary x402 endpoint. First call without payment returns 402 with escrow details. Second call with X-Payment header returns the resource."
                                response={`// First call -> 402 response:
{
  "paymentRequirements": {
    "amount": 0.002,
    "escrowContract": "0x...",
    "network": "sepolia"
  },
  "escrow": { "key": "0x..." }
}

// Second call with X-Payment header -> 200 response:
{
  "resource": { "title": "ETH Price Feed", "content": "..." },
  "transaction": { "id": "tx_123", "receiptCode": "RX-..." }
}`}
                            />

                            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-5 mb-4">
                                <h4 className="text-white font-medium mb-3 text-sm">X-Payment Header Format</h4>
                                <CodeBlock>{`// Build the header after depositing on-chain:
const xPayment = btoa(JSON.stringify({
  version: 1,
  scheme: "chainlink-escrow",
  payload: {
    key: "0x...",       // escrow key from 402 response
    txHash: "0x...",    // deposit transaction hash
    sender: "0x..."     // agent wallet address
  }
}));

// Then retry:
GET /api/gateway/resource/:id
Headers: { "X-Payment": xPayment }`}</CodeBlock>
                            </div>

                            <ApiEndpoint
                                method="GET" path="/gateway/escrow/:escrowId"
                                desc="Check on-chain escrow status — useful for verifying deposit before retrying."
                                response={`{ "key": "0x...", "lockedETH": 0.002, "isFunded": true }`}
                            />

                            {/* Step 3: Settle or Dispute */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-8 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#375BD2] text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
                                Settle or Dispute
                            </h3>
                            <ApiEndpoint
                                method="POST" path="/gateway/settle"
                                desc="After calling requestSettlement(key) or raiseDispute(key) on-chain, notify the backend. CRE will pick it up from the on-chain event."
                                response={`// Request body:
{
  "escrowKey": "0x...",
  "transactionId": "tx_123",
  "action": "settle" | "dispute",
  "reason": "Data was incorrect"  // only for disputes
}

// Response:
{ "status": "SETTLEMENT_REQUESTED" | "DISPUTED" }`}
                            />

                            {/* Agent flow summary */}
                            <div className="mt-8 bg-[#111] rounded-2xl border border-white/10 p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Complete Agent Flow (5 API calls)</h3>
                                <CodeBlock>{`# 1. Discover
GET /api/explore              -> pick a resource

# 2. Request access (get 402)
GET /api/gateway/resource/:id
    X-Agent-Address: 0xAgent  -> receive escrow key + amount

# 3. Deposit on-chain
deposit(key) on EscrowMarketplace.sol  (not an API call)

# 4. Retry with payment proof
GET /api/gateway/resource/:id
    X-Payment: <base64 payload>  -> receive resource content

# 5. Settle
requestSettlement(key) on-chain  (not an API call)
POST /api/gateway/settle         -> notify backend

# Done! CRE handles the rest:
#   - Verifies delivery
#   - Finalizes on-chain
#   - Sends private payout to merchant`}</CodeBlock>
                            </div>

                            {/* CRE Webhook Endpoints */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-10 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4C8BF5] text-white text-xs font-bold rounded-full flex items-center justify-center">+</span>
                                CRE Webhook Endpoints
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">Used by CRE workflows — not called by agents directly, but useful for understanding the system.</p>

                            <div className="space-y-2 mb-6">
                                {[
                                    ['GET', '/cre/verify-delivery/:escrowKey', 'Check if resource was delivered'],
                                    ['GET', '/cre/analyze-dispute/:escrowKey', 'Run AI dispute analysis'],
                                    ['GET', '/cre/expired-escrows', 'List expired escrows for auto-refund'],
                                    ['POST', '/cre/settlement-complete', 'CRE notifies settlement done + triggers private payout'],
                                    ['POST', '/cre/dispute-resolved', 'CRE notifies dispute verdict'],
                                    ['POST', '/cre/expiry-refunded', 'CRE notifies expiry refund'],
                                    ['POST', '/cre/private-settle', 'Trigger private token transfer (idempotent)'],
                                    ['GET', '/cre/verify-private-transfer/:escrowKey', 'Verify private transfer completed'],
                                    ['GET', '/cre/resolution/:escrowKey', 'Check on-chain resolution status'],
                                ].map(([method, path, desc]) => (
                                    <div key={path} className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg border border-white/10 p-3">
                                        <span className={`px-2 py-0.5 text-xs font-mono rounded ${method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{method}</span>
                                        <code className="text-gray-300 text-sm">{path}</code>
                                        <span className="text-gray-600 text-xs ml-auto hidden md:block">{desc}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Workflow Engine Endpoints */}
                            <h3 className="text-lg font-semibold text-white mb-4 mt-10 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4C8BF5] text-white text-xs font-bold rounded-full flex items-center justify-center">+</span>
                                Workflow Engine Endpoints
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">Used by the CRE workflow engine to run merchant automations.</p>

                            <div className="space-y-2">
                                {[
                                    ['GET', '/cre/active-workflows', 'List active workflows for CRE to execute'],
                                    ['GET', '/cre/resource-stats/:resourceId', 'Access count, earnings, price for a resource'],
                                    ['POST', '/cre/workflow-action', 'Execute action: update_price, toggle_resource, telegram_notify'],
                                    ['POST', '/cre/workflow-execution', 'Log workflow run result'],
                                    ['POST', '/cre/ai-price-analysis', 'AI price recommendation based on demand'],
                                ].map(([method, path, desc]) => (
                                    <div key={path} className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg border border-white/10 p-3">
                                        <span className={`px-2 py-0.5 text-xs font-mono rounded ${method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>{method}</span>
                                        <code className="text-gray-300 text-sm">{path}</code>
                                        <span className="text-gray-600 text-xs ml-auto hidden md:block">{desc}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                {/* ── Right sidebar ───────────────────────────── */}
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

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Chainlink Stack</h4>
                            <div className="space-y-2">
                                {['CRE Workflows', 'Private Tokens', 'Automation', 'Sepolia'].map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-sm text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#375BD2]" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
