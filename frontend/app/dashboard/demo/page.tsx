'use client';

import { useState, useRef, useEffect } from 'react';

type Step = 'welcome' | 'menu' | 'simulating' | 'result';

interface TerminalLine {
    text: string;
    type: 'normal' | 'success' | 'error' | 'info' | 'prompt';
}

const menuOptions = [
    { label: 'Simulate x402 Resource Access', desc: 'See how an AI agent fetches a paywalled resource' },
    { label: 'Check Escrow Balance', desc: 'View your simulated ETH escrow balance' },
    { label: 'Browse Marketplace', desc: 'List available resources via the API' },
];

const simulations: Record<number, TerminalLine[]> = {
    0: [
        { text: 'Fetching https://chainlink-agent-api.example/gateway/resource/eth-feed...', type: 'info' },
        { text: '', type: 'normal' },
        { text: '← HTTP 402 Payment Required', type: 'error' },
        { text: '  Amount:    0.002 ETH', type: 'info' },
        { text: '  Token:     ETH (Native)', type: 'info' },
        { text: '  Network:   Ethereum Sepolia', type: 'info' },
        { text: '  Resource:  Ethereum Price Feed Dataset', type: 'info' },
        { text: '', type: 'normal' },
        { text: 'Initiating escrow payment via Chainlink Agent...', type: 'info' },
        { text: 'Signing transaction with agent wallet...', type: 'info' },
        { text: '✓ TX submitted: 0x4a7f...b912', type: 'success' },
        { text: '✓ Escrow locked: 0.002 ETH', type: 'success' },
        { text: '', type: 'normal' },
        { text: 'Retrying with X-Payment header...', type: 'info' },
        { text: '← HTTP 200 OK', type: 'success' },
        { text: '✓ Resource unlocked!', type: 'success' },
        { text: '', type: 'normal' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '  PAYMENT RECEIPT', type: 'info' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '  Receipt:   rcpt_0xf3a1...7c29', type: 'normal' },
        { text: '  Amount:    0.002 ETH', type: 'normal' },
        { text: '  Merchant:  DataFeed Labs', type: 'normal' },
        { text: '  Status:    Escrow — awaiting confirmation', type: 'normal' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '', type: 'normal' },
        { text: 'Press Ctrl+C to return to menu...', type: 'prompt' },
    ],
    1: [
        { text: 'Connecting to Chainlink Agent escrow...', type: 'info' },
        { text: '✓ Wallet: 0x1a2b...ef12', type: 'success' },
        { text: '', type: 'normal' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '  ESCROW BALANCE', type: 'info' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '  Available:   0.04821 ETH', type: 'success' },
        { text: '  Locked:      0.002 ETH', type: 'normal' },
        { text: '  Released:    0.01500 ETH', type: 'normal' },
        { text: '  Network:     Ethereum Sepolia', type: 'normal' },
        { text: '═══════════════════════════════════', type: 'normal' },
        { text: '', type: 'normal' },
        { text: 'Press Ctrl+C to return to menu...', type: 'prompt' },
    ],
    2: [
        { text: 'Fetching https://chainlink-agent-api.example/explore...', type: 'info' },
        { text: '✓ Connected', type: 'success' },
        { text: '', type: 'normal' },
        { text: 'Available Resources (8 total):', type: 'info' },
        { text: '', type: 'normal' },
        { text: '  [1] Ethereum Price Feed Dataset       0.002 ETH  ★ 92', type: 'normal' },
        { text: '  [2] DeFi Analytics Report Q1 2026    0.005 ETH  ★ 88', type: 'normal' },
        { text: '  [3] Smart Contract Audit Pack         0.001 ETH  ★ 76', type: 'normal' },
        { text: '  [4] Chainlink Oracle Integration      0.003 ETH  ★ 95', type: 'normal' },
        { text: '  [5] MEV Bot Strategy Video            0.008 ETH  ★ 61', type: 'normal' },
        { text: '  [6] Gas Optimization Dataset          0.001 ETH  ★ 84', type: 'normal' },
        { text: '  [7] On-Chain Governance Dataset       0.004 ETH  ★ 79', type: 'normal' },
        { text: '  [8] NFT Market Trends Report          Free       ★ 55', type: 'normal' },
        { text: '', type: 'normal' },
        { text: 'Press Ctrl+C to return to menu...', type: 'prompt' },
    ],
};

export default function DemoPage() {
    const [step, setStep] = useState<Step>('welcome');
    const [selectedItem, setSelectedItem] = useState(0);
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [lineIndex, setLineIndex] = useState(0);
    const [activeSimulation, setActiveSimulation] = useState<number | null>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    // Animate lines one by one
    useEffect(() => {
        if (step !== 'simulating' || activeSimulation === null) return;
        const sim = simulations[activeSimulation];
        if (lineIndex >= sim.length) {
            setStep('result');
            return;
        }
        const delay = sim[lineIndex].type === 'normal' && sim[lineIndex].text === '' ? 80 : 180;
        const timer = setTimeout(() => {
            setLines(prev => [...prev, sim[lineIndex]]);
            setLineIndex(i => i + 1);
        }, delay);
        return () => clearTimeout(timer);
    }, [step, lineIndex, activeSimulation]);

    const runSimulation = (index: number) => {
        setActiveSimulation(index);
        setLines([]);
        setLineIndex(0);
        setStep('simulating');
    };

    const reset = () => {
        setStep('menu');
        setLines([]);
        setLineIndex(0);
        setActiveSimulation(null);
    };

    const lineColor = (type: TerminalLine['type']) => {
        if (type === 'success') return 'text-[#27c93f]';
        if (type === 'error') return 'text-[#ef4444]';
        if (type === 'info') return 'text-[#4C8BF5]';
        if (type === 'prompt') return 'text-[#375BD2]';
        return 'text-gray-300';
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {/* Title bar */}
                <div className="bg-[#2a2a2a] px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    <span className="ml-4 text-gray-500 text-xs font-mono">chainlink-agent — demo terminal</span>
                </div>

                {/* Terminal body */}
                <div
                    ref={terminalRef}
                    className="h-[520px] overflow-y-auto p-6 font-mono text-sm focus:outline-none"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); reset(); }
                        if (step === 'welcome' && e.key === 'Enter') setStep('menu');
                        if (step === 'menu') {
                            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedItem(p => Math.max(0, p - 1)); }
                            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedItem(p => Math.min(menuOptions.length - 1, p + 1)); }
                            if (e.key === 'Enter') runSimulation(selectedItem);
                        }
                        if ((step === 'result') && e.key === 'Enter') reset();
                    }}
                >
                    {step === 'welcome' && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <pre className="text-[#375BD2] text-xs mb-8 leading-tight select-none">{`   _____ _           _       _  _       _
  / ____| |         (_)     | |(_)     | |
 | |    | |__   __ _ _ _ __ | | _ _ __ | | __
 | |    | '_ \\ / _\` | | '_ \\| || | '_ \\| |/ /
 | |____| | | | (_| | | | | | || | | | |   <
  \\_____|_| |_|\\__,_|_|_| |_|_||_|_| |_|_|\\_\\
                                    Agent Demo`}</pre>
                            <p className="text-white text-lg mb-2">Welcome to Chainlink Agent Demo</p>
                            <p className="text-gray-400 mb-8">x402 payment protocol on Ethereum</p>
                            <p className="text-[#375BD2]">Press <span className="bg-white/10 px-2 py-1 rounded">Enter</span> to start...</p>
                        </div>
                    )}

                    {step === 'menu' && (
                        <div>
                            <p className="text-white mb-4">Select an option:</p>
                            {menuOptions.map((opt, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setSelectedItem(i); runSimulation(i); }}
                                    className={`py-2 px-4 mb-2 rounded cursor-pointer ${i === selectedItem ? 'bg-[#375BD2] text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {i === selectedItem ? '> ' : '  '}{opt.label}
                                    <span className="ml-2 text-xs opacity-60">{opt.desc}</span>
                                </div>
                            ))}
                            <p className="text-gray-500 mt-6 text-xs">
                                Use ↑↓ to navigate, Enter to select · Ctrl+C to reset
                            </p>
                        </div>
                    )}

                    {(step === 'simulating' || step === 'result') && (
                        <div>
                            {lines.map((line, i) => (
                                <div key={i} className={`mb-0.5 ${lineColor(line.type)}`}>{line.text || '\u00A0'}</div>
                            ))}
                            {step === 'simulating' && (
                                <span className="text-[#375BD2] animate-pulse">▊</span>
                            )}
                            {step === 'result' && (
                                <p className="text-[#375BD2] mt-4 cursor-pointer" onClick={reset}>
                                    Press Enter or click here to return to menu...
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-gray-600 text-xs mt-4">
                Click the terminal and use keyboard, or click menu items directly · This is a simulation — no real transactions
            </p>
        </div>
    );
}
