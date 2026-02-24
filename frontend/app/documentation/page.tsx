'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Home, Twitter, ChevronRight } from 'lucide-react';

const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'problem', title: 'The Problem' },
    { id: 'solution', title: 'Our Solution' },
    { id: 'protocol', title: 'x402 Protocol' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'api', title: 'API Reference' },
    { id: 'future', title: 'Future Integrations' },
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState('overview');

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

                        {/* Overview */}
                        <section id="overview" className="mb-20">
                            <h1 className="text-4xl font-bold mb-6">
                                Chainlink <span className="text-[#375BD2]">Agent</span> Documentation
                            </h1>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Chainlink Agent is a privacy-first marketplace where AI agents can purchase digital resources using the x402 payment protocol on Ethereum. It features <span className="text-[#375BD2] font-semibold">AI-powered dispute resolution</span> with escrow protection—ensuring fair outcomes when resources don't match descriptions. Built on Ethereum Sepolia with Chainlink oracle integration.
                            </p>
                            <div className="flex gap-4">
                                <Link href="/dashboard" className="px-6 py-3 bg-[#375BD2] hover:bg-[#2A4AB0] text-white font-medium rounded-xl transition-colors">
                                    Get Started
                                </Link>
                                <Link href="/dashboard/demo" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors">
                                    Try Demo
                                </Link>
                            </div>
                        </section>

                        {/* Problem */}
                        <section id="problem" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">1</span>
                                The Problem
                            </h2>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-4">Challenges in AI Agent Economy</h3>
                                <ul className="space-y-4 text-gray-400">
                                    {[
                                        ['No Privacy', 'Traditional blockchain transactions expose all payment details publicly, including amounts and wallet addresses.'],
                                        ['No Dispute Resolution', "When AI agents receive incorrect or misrepresented resources, there's no mechanism to resolve disputes fairly."],
                                        ['No Trust Layer', 'Merchants and AI agents have no way to establish trust in autonomous transactions.'],
                                        ['Complex Integration', "Existing payment solutions require significant setup and don't support the x402 payment protocol."],
                                    ].map(([title, desc]) => (
                                        <li key={title} className="flex items-start gap-3">
                                            <span className="text-[#375BD2] mt-1">•</span>
                                            <span><strong className="text-white">{title}:</strong> {desc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        {/* Solution */}
                        <section id="solution" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">2</span>
                                Our Solution
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/docs/banner1.jpg" alt="Chainlink Agent Solution" className="w-full h-auto" />
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Chainlink Agent provides a complete infrastructure for AI-to-merchant transactions on Ethereum:
                            </p>
                            <div className="grid gap-4">
                                {[
                                    ['🔒 Private Payments', 'Escrow-backed payments protect both merchants and AI agents.'],
                                    ['🛡️ Escrow Protection', 'Funds are held in escrow until resources are delivered and verified.'],
                                    ['🤖 AI Dispute Resolution', 'Automated AI analysis determines dispute validity with confidence scoring.'],
                                    ['📡 x402 Compatible', 'Full support for the HTTP 402 Payment Required protocol for seamless agent integration.'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#111] rounded-xl border border-white/10 p-5">
                                        <h4 className="text-white font-semibold mb-2">{title}</h4>
                                        <p className="text-gray-400 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Protocol */}
                        <section id="protocol" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">3</span>
                                x402 Protocol
                            </h2>
                            <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
                                <img src="/landing/mcp.jpeg" alt="Protocol Integration" className="w-full h-auto" />
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Chainlink Agent implements the x402 HTTP Payment Required protocol natively on Ethereum:
                            </p>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <h3 className="text-xl font-semibold text-white mb-4">How It Works</h3>
                                <ol className="space-y-4 text-gray-400">
                                    {[
                                        ['Agent Request', 'AI agent requests a protected resource endpoint.'],
                                        ['402 Response', 'Server responds with payment requirements including ETH amount and escrow address.'],
                                        ['Payment', 'Agent sends ETH to the escrow contract via a signed transaction.'],
                                        ['Access Granted', 'Payment verified, resource content delivered, escrow settles after confirmation window.'],
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
                                    <strong>Note:</strong> All payments are secured by the Ethereum escrow smart contract. Funds are only released after the confirmation window or upon successful dispute resolution.
                                </p>
                            </div>
                        </section>

                        {/* Architecture */}
                        <section id="architecture" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">4</span>
                                Architecture
                            </h2>
                            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                <pre className="text-sm text-gray-400 overflow-x-auto">{`┌─────────────────────────────────────────────────────────────┐
│                      AI Agent                                │
│  (Requests resource with x402 payment header)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Chainlink Agent API                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │ Resources │  │   Auth    │  │   Dispute Resolution  │   │
│  │  (x402)   │  │  (Wallet) │  │      (AI-powered)     │   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ethereum / Chainlink                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │
│  │  Escrow   │  │  Oracles  │  │   Privacy Escrow ABI  │   │
│  │ Contract  │  │ (Chainlk) │  │     (Settlement)      │   │
│  └───────────┘  └───────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘`}</pre>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    ['Frontend', 'Next.js 15, React 19, TailwindCSS, RainbowKit'],
                                    ['Backend', 'Node.js, Express, Prisma 7'],
                                    ['Database', 'PostgreSQL (Neon)'],
                                    ['Blockchain', 'Ethereum Sepolia + Chainlink Oracles'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
                                        <h4 className="text-white font-medium mb-2">{title}</h4>
                                        <p className="text-gray-500 text-sm">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* API Reference */}
                        <section id="api" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">5</span>
                                API Reference
                            </h2>
                            <div className="bg-gradient-to-r from-[#375BD2]/10 to-transparent rounded-xl border border-[#375BD2]/20 p-4 mb-6">
                                <p className="text-[#4C8BF5] text-sm font-mono">
                                    Base URL: <span className="text-white">http://localhost:3001/api</span>
                                </p>
                            </div>
                            {[
                                {
                                    method: 'GET', color: 'green', path: '/explore',
                                    desc: 'List all public resources with trust scores.',
                                    code: `{ "resources": [{ "id": "abc123", "title": "ETH Price Feed", "trustScore": 92, "price": 0.002 }], "count": 1 }`,
                                },
                                {
                                    method: 'GET', color: 'green', path: '/explore/:id',
                                    desc: 'Get resource details including payment info.',
                                    code: `{ "resource": { "id": "abc123", "title": "ETH Price Feed" }, "payment": { "required": true, "amount": 0.002, "token": "ETH" } }`,
                                },
                                {
                                    method: 'GET', color: 'blue', path: '/gateway/resource/:id',
                                    desc: 'Primary endpoint for AI agents. Returns 402 if payment required.',
                                    code: `// 402 Response\nX-Payment-Required: true\nX-Payment-Amount: 2000000000000000  // wei\nX-Payment-Token: ETH`,
                                },
                                {
                                    method: 'POST', color: 'purple', path: '/resources',
                                    desc: 'Create a new resource (auth required).',
                                    code: `{ "title": "My Dataset", "type": "LINK", "price": 0.002, "network": "SEPOLIA", "token": "ETH" }`,
                                },
                            ].map((ep) => (
                                <div key={ep.path} className="bg-[#111] rounded-2xl border border-white/10 p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-2 py-1 bg-${ep.color}-500/20 text-${ep.color}-400 text-xs font-mono rounded`}>{ep.method}</span>
                                        <code className="text-white font-mono">{ep.path}</code>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4">{ep.desc}</p>
                                    <div className="bg-black rounded-lg p-4">
                                        <pre className="text-sm text-gray-400 overflow-x-auto">{ep.code}</pre>
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* Future */}
                        <section id="future" className="mb-20">
                            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#375BD2]/20 rounded-lg flex items-center justify-center text-[#375BD2] text-sm font-bold">6</span>
                                Future Integrations
                            </h2>
                            <div className="space-y-4">
                                {[
                                    ['🪙 Multi-Token Payments', 'Support for USDC, USDT, and other ERC-20 stablecoins alongside ETH.'],
                                    ['📊 Chainlink Data Streams', 'Real-time, low-latency market data via Chainlink Data Streams for high-frequency agent trading.'],
                                    ['🧠 ML Price Prediction Models', 'Merchants deploy ML models for crypto price predictions. AI agents access forecasts through private payments.'],
                                    ['🔗 Cross-Chain Support', 'Expand to Polygon, Arbitrum, and other EVM chains with unified payment routing.'],
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
