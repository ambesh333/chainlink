'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getApiUrl } from '@/lib/config';

// Minimal ABIs — split by stateMutability so viem can narrow types correctly
const DEPOSIT_ABI = [
    {
        type: 'function',
        name: 'deposit',
        inputs: [{ name: 'key', type: 'bytes32' }],
        outputs: [],
        stateMutability: 'payable',
    },
] as const;

const ESCROW_ABI = [
    {
        type: 'function',
        name: 'requestSettlement',
        inputs: [{ name: 'key', type: 'bytes32' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'raiseDispute',
        inputs: [{ name: 'key', type: 'bytes32' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;

type Step =
    | 'welcome'
    | 'menu'
    | 'url-input'
    | 'fetching'
    | 'payment'
    | 'signing'
    | 'unlocked'
    | 'dispute-reason'
    | 'browse'
    | 'error';

interface TerminalLine {
    text: string;
    type: 'normal' | 'success' | 'error' | 'info' | 'prompt';
}

interface PaymentState {
    escrowKey: string;
    amountWei: string;
    amount: number;
    contractAddress: string;
    description: string;
}

interface UnlockedContent {
    type: string;
    data?: string;
    url?: string;
    filename?: string;
    size?: number;
    title?: string;
    transactionId?: string;
}

export default function DemoPage() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { data: walletClient } = useWalletClient({ chainId: sepolia.id });
    const publicClient = usePublicClient({ chainId: sepolia.id });

    const [step, setStep] = useState<Step>('welcome');
    const [selectedItem, setSelectedItem] = useState(0);
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [unlockedContent, setUnlockedContent] = useState<UnlockedContent | null>(null);

    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isPayingRef = useRef(false);

    // Auto-scroll to bottom on new lines
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    // Focus input when step needs it
    useEffect(() => {
        if ((step === 'url-input' || step === 'dispute-reason') && inputRef.current) {
            inputRef.current.focus();
        }
    }, [step]);

    const addLine = (text: string, type: TerminalLine['type'] = 'normal') => {
        setLines(prev => [...prev, { text, type }]);
    };

    const clearTerminal = () => setLines([]);

    const reset = () => {
        clearTerminal();
        setStep('menu');
        setCurrentInput('');
        setPaymentState(null);
        setCurrentUrl('');
        setUnlockedContent(null);
        setIsLoading(false);
        isPayingRef.current = false;
    };

    // ─── Menu options ──────────────────────────────────────────────────────────

    const menuOptions = [
        {
            label: 'Access x402 Resource',
            desc: 'Pay for a paywalled resource via on-chain ETH escrow',
            action: () => {
                clearTerminal();
                addLine('Enter gateway resource URL:', 'prompt');
                addLine('  e.g. http://localhost:3001/api/gateway/resource/<id>', 'info');
                addLine('', 'normal');
                setCurrentInput('');
                setStep('url-input');
            },
        },
        {
            label: 'Browse Marketplace',
            desc: 'List all available resources from the backend',
            action: async () => {
                clearTerminal();
                setStep('browse');
                setIsLoading(true);
                addLine('agent@chainlink-demo:~$ curl ' + getApiUrl() + '/explore', 'prompt');
                addLine('', 'normal');
                addLine('Fetching marketplace...', 'info');
                try {
                    const res = await fetch(`${getApiUrl()}/explore`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    const resources: any[] = data.resources ?? [];
                    addLine('', 'normal');
                    addLine(`← ${resources.length} resource(s) available`, 'success');
                    addLine('', 'normal');
                    addLine('  #   Title                               Price        Trust', 'info');
                    addLine('  ' + '─'.repeat(62), 'normal');
                    resources.forEach((r: any, i: number) => {
                        const price = r.price > 0 ? `${r.price.toFixed(4)} ETH` : 'Free      ';
                        const trust = `★ ${r.trustScore}`;
                        const title = r.title.length > 34 ? r.title.slice(0, 31) + '...' : r.title.padEnd(34);
                        addLine(`  [${String(i + 1).padStart(2)}] ${title}  ${price.padEnd(12)} ${trust}`, 'normal');
                        addLine(`       ${r.type} · ID: ${r.id}`, 'info');
                    });
                    addLine('', 'normal');
                    addLine('  Gateway URL pattern:', 'prompt');
                    addLine(`  http://localhost:3001/api/gateway/resource/<id>`, 'info');
                } catch (e: any) {
                    addLine(`✗ Error: ${e.message}`, 'error');
                } finally {
                    setIsLoading(false);
                    addLine('', 'normal');
                    addLine('Press Ctrl+C to return to menu', 'prompt');
                }
            },
        },
    ];

    // ─── Fetch resource (step 1 of payment flow) ──────────────────────────────

    const handleFetchResource = async (url: string) => {
        setCurrentUrl(url);
        setStep('fetching');
        setIsLoading(true);
        clearTerminal();

        addLine(`agent@chainlink-demo:~$ curl -i \\`, 'prompt');
        addLine(`  -H "X-Agent-Address: ${address || '0x<not-connected>'}" \\`, 'prompt');
        addLine(`  ${url}`, 'prompt');
        addLine('', 'normal');

        try {
            const res = await fetch(url, {
                headers: address ? { 'X-Agent-Address': address } : {},
            });

            if (res.status === 402) {
                const body = await res.json();
                const req = body.paymentRequirements;
                const escrow = body.escrow;

                addLine('← HTTP/1.1 402 Payment Required', 'error');
                addLine('', 'normal');
                addLine(`  Amount:      ${req.amount} ETH  (${req.amountWei} wei)`, 'info');
                addLine(`  Network:     Ethereum Sepolia (chainId 11155111)`, 'info');
                addLine(`  Contract:    ${req.escrowContract}`, 'info');
                addLine(`  Resource:    ${req.description}`, 'info');

                if (escrow?.key) {
                    addLine('', 'normal');
                    addLine('  Escrow created on-chain ✓', 'success');
                    addLine(`  Key:         ${escrow.key.slice(0, 20)}...${escrow.key.slice(-10)}`, 'info');
                    if (escrow.createEscrowTx) {
                        addLine(`  Create TX:   ${escrow.createEscrowTx.slice(0, 20)}...`, 'info');
                    }
                    addLine('', 'normal');

                    setPaymentState({
                        escrowKey: escrow.key,
                        amountWei: req.amountWei,
                        amount: req.amount,
                        contractAddress: req.escrowContract,
                        description: req.description,
                    });

                    if (!isConnected) {
                        addLine('✗ Wallet not connected. Connect your wallet first.', 'error');
                        addLine('Press Ctrl+C to return.', 'prompt');
                        setStep('error');
                    } else if (chainId !== sepolia.id) {
                        addLine(`✗ Wrong network. Switch to Sepolia (current: chainId ${chainId}).`, 'error');
                        addLine('Press Ctrl+C to return.', 'prompt');
                        setStep('error');
                    } else {
                        addLine(`  deposit(key) will be called on the escrow contract`, 'normal');
                        addLine(`  with ${req.amount} ETH`, 'normal');
                        addLine('', 'normal');
                        addLine('Press Enter to sign & send deposit transaction...', 'prompt');
                        setStep('payment');
                    }
                } else {
                    addLine('', 'normal');
                    addLine('✗ No escrow key returned.', 'error');
                    addLine('  Set FACILITATOR_PRIVATE_KEY in backend/.env', 'info');
                    addLine('  The facilitator must create the escrow before deposit.', 'info');
                    addLine('Press Ctrl+C to return.', 'prompt');
                    setStep('error');
                }
            } else if (res.ok) {
                await deliverContent(res, null);
            } else {
                const text = await res.text().catch(() => '');
                addLine(`← HTTP ${res.status}`, 'error');
                if (text) addLine(text.slice(0, 300), 'error');
                addLine('Press Ctrl+C to return.', 'prompt');
                setStep('error');
            }
        } catch (e: any) {
            addLine(`✗ Network error: ${e.message}`, 'error');
            addLine('Is the backend running on port 3001?', 'info');
            addLine('Press Ctrl+C to return.', 'prompt');
            setStep('error');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Sign & send deposit transaction (step 2) ────────────────────────────

    const handlePayment = async () => {
        if (!walletClient || !address || !paymentState) return;
        // Guard against double-calling (e.g. button onClick + container onKeyDown both firing)
        if (isPayingRef.current) return;
        isPayingRef.current = true;

        setIsLoading(true);
        setStep('signing');
        addLine('', 'normal');

        const key = paymentState.escrowKey as `0x${string}`;
        const contract = paymentState.contractAddress as `0x${string}`;
        const value = BigInt(paymentState.amountWei);

        addLine('  Deposit details:', 'info');
        addLine(`  Agent:    ${address}`, 'info');
        addLine(`  Key:      ${key.slice(0, 18)}...${key.slice(-10)}`, 'info');
        addLine(`  Amount:   ${paymentState.amount} ETH (${paymentState.amountWei} wei)`, 'info');
        addLine(`  Contract: ${contract}`, 'info');
        addLine('', 'normal');
        addLine('Waiting for wallet signature...', 'info');

        try {
            // Sign & broadcast: deposit(bytes32 key) payable
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (walletClient as any).writeContract({
                address: contract,
                abi: DEPOSIT_ABI,
                functionName: 'deposit',
                args: [key],
                value,
            });

            addLine(`✓ TX signed & submitted`, 'success');
            addLine(`  Hash:  ${txHash.slice(0, 18)}...${txHash.slice(-10)}`, 'info');
            addLine(`  https://sepolia.etherscan.io/tx/${txHash}`, 'info');
            addLine('', 'normal');
            addLine('Waiting for on-chain confirmation...', 'info');

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: txHash });
            }

            addLine('✓ Deposit confirmed — ETH locked in escrow', 'success');
            addLine('', 'normal');
            addLine('Retrying resource request with X-Payment header...', 'info');
            addLine('', 'normal');

            // Build X-Payment header (base64 JSON)
            const paymentHeader = btoa(JSON.stringify({
                version: 1,
                scheme: 'chainlink-escrow',
                payload: { key, txHash, sender: address },
            }));

            // Retry the resource endpoint with payment proof
            const res = await fetch(currentUrl, {
                headers: {
                    'X-Payment': paymentHeader,
                    'X-Agent-Address': address,
                },
            });

            if (res.ok) {
                await deliverContent(res, txHash);
            } else {
                const errBody = await res.json().catch(() => ({}));
                addLine(`← HTTP ${res.status}: ${errBody.error || 'Unknown error'}`, 'error');
                if (errBody.details) addLine(`  ${errBody.details}`, 'error');
                addLine('Press Ctrl+C to return.', 'prompt');
                setStep('error');
            }
        } catch (e: any) {
            // Extract the most useful error message from viem's error chain
            const msg: string =
                e?.cause?.reason ||          // viem ContractFunctionRevertedError
                e?.cause?.message ||
                e?.shortMessage ||           // viem short form
                e?.message ||
                'Unknown error';

            if (msg.includes('User rejected') || msg.includes('user rejected') || e?.code === 4001) {
                addLine('✗ Transaction rejected by user.', 'error');
            } else {
                addLine(`✗ Contract revert: ${msg}`, 'error');
            }
            addLine('', 'normal');
            addLine('  Possible causes:', 'info');
            addLine('  • Wrong network — must be Sepolia', 'info');
            addLine('  • Agent address mismatch (X-Agent-Address vs connected wallet)', 'info');
            addLine('  • Wrong ETH amount sent', 'info');
            addLine('  • Escrow already funded or key invalid', 'info');
            addLine('Press Ctrl+C to return.', 'prompt');
            setStep('error');
        } finally {
            isPayingRef.current = false;
            setIsLoading(false);
        }
    };

    // ─── Deliver content after successful payment ────────────────────────────

    const deliverContent = async (res: Response, txHash: string | null) => {
        const contentType = res.headers.get('content-type') || '';
        addLine('← HTTP/1.1 200 OK', 'success');
        addLine('✓ Resource unlocked!', 'success');
        addLine('', 'normal');

        let content: UnlockedContent;

        if (contentType.includes('image/')) {
            const blob = await res.blob();
            const ext = contentType.split('/')[1] || 'png';
            const filename = `unlocked_${Date.now()}.${ext}`;

            // Auto-download
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(dlUrl);

            addLine(`📷 Image downloaded to your Downloads folder`, 'success');
            addLine(`   Filename: ${filename}`, 'info');
            addLine(`   Size:     ${(blob.size / 1024).toFixed(1)} KB`, 'info');
            addLine('', 'normal');

            const receiptCode = res.headers.get('X-Receipt-Code');
            const txId = res.headers.get('X-Transaction-ID');
            showReceipt(receiptCode, txId, txHash);

            content = { type: 'image', filename, size: blob.size, transactionId: txId ?? undefined };
        } else {
            const data = await res.json();
            const receiptCode: string | null = data.receiptCode ?? null;
            const txId: string | null = data.transactionId ?? null;

            if (data.type === 'IMAGE' && data.data) {
                // Inline image (base64)
                addLine('📷 Image data received — rendering below', 'info');
            } else if (data.type === 'LINK' || data.type === 'VIDEO') {
                addLine(`🔗 ${data.type}  →  ${data.data}`, 'info');
            } else if (data.title) {
                addLine(`📄 ${data.title}`, 'info');
            }
            addLine('', 'normal');
            showReceipt(receiptCode, txId, txHash);
            content = { ...data, transactionId: txId ?? undefined };
        }

        setUnlockedContent(content);
        setStep('unlocked');
    };

    const showReceipt = (receiptCode: string | null, txId: string | null, txHash: string | null) => {
        const bar = '═'.repeat(50);
        const divider = '─'.repeat(50);
        addLine(bar, 'normal');
        addLine('                 PAYMENT RECEIPT', 'info');
        addLine(bar, 'normal');
        if (receiptCode) addLine(`  Receipt ID:   ${receiptCode}`, 'normal');
        if (txId) addLine(`  Transaction:  ${txId}`, 'normal');
        if (txHash) {
            addLine(`  Deposit TX:   ${txHash.slice(0, 16)}...${txHash.slice(-8)}`, 'normal');
            addLine(`  Etherscan:    sepolia.etherscan.io/tx/${txHash.slice(0, 14)}...`, 'info');
        }
        addLine(`  Network:      Ethereum Sepolia`, 'normal');
        addLine(`  Status:       Escrow · Awaiting settlement`, 'normal');
        addLine(divider, 'normal');
        addLine('  [Enter] Confirm receipt  ·  [D] Raise dispute', 'prompt');
        addLine(bar, 'normal');
    };

    // ─── Settlement ──────────────────────────────────────────────────────────

    const handleSettle = async (status: 'SETTLED' | 'DISPUTED', reason?: string) => {
        const txId = unlockedContent?.transactionId;
        if (!txId) {
            addLine('', 'normal');
            addLine('✗ No transaction ID available to settle.', 'error');
            addLine('Press Ctrl+C to return.', 'prompt');
            return;
        }

        setIsLoading(true);
        addLine('', 'normal');
        addLine(status === 'SETTLED' ? 'Confirming receipt...' : 'Submitting dispute...', 'info');

        try {
            // Call raiseDispute() on-chain before notifying backend
            if (status === 'DISPUTED' && walletClient && paymentState) {
                const key = paymentState.escrowKey as `0x${string}`;
                const contract = paymentState.contractAddress as `0x${string}`;

                addLine('Calling raiseDispute() on-chain...', 'info');

                const disputeTxHash = await (walletClient as any).writeContract({
                    address: contract,
                    abi: ESCROW_ABI,
                    functionName: 'raiseDispute',
                    args: [key],
                });

                addLine(`✓ raiseDispute TX submitted`, 'success');
                addLine(`  Hash: ${disputeTxHash.slice(0, 18)}...${disputeTxHash.slice(-10)}`, 'info');
                addLine(`  https://sepolia.etherscan.io/tx/${disputeTxHash}`, 'info');
                addLine('', 'normal');
                addLine('Waiting for on-chain confirmation...', 'info');

                if (publicClient) {
                    await publicClient.waitForTransactionReceipt({ hash: disputeTxHash });
                }

                addLine('✓ Dispute raised on-chain', 'success');
                addLine('', 'normal');
                addLine('Notifying backend...', 'info');
            }

            // Call requestSettlement() on-chain before notifying backend
            if (status === 'SETTLED' && walletClient && paymentState) {
                const key = paymentState.escrowKey as `0x${string}`;
                const contract = paymentState.contractAddress as `0x${string}`;

                addLine('Calling requestSettlement() on-chain...', 'info');

                const settleTxHash = await (walletClient as any).writeContract({
                    address: contract,
                    abi: ESCROW_ABI,
                    functionName: 'requestSettlement',
                    args: [key],
                });

                addLine(`✓ requestSettlement TX submitted`, 'success');
                addLine(`  Hash: ${settleTxHash.slice(0, 18)}...${settleTxHash.slice(-10)}`, 'info');
                addLine(`  https://sepolia.etherscan.io/tx/${settleTxHash}`, 'info');
                addLine('', 'normal');
                addLine('Waiting for on-chain confirmation...', 'info');

                if (publicClient) {
                    await publicClient.waitForTransactionReceipt({ hash: settleTxHash });
                }

                addLine('✓ Settlement requested on-chain', 'success');
                addLine('', 'normal');
                addLine('Notifying backend...', 'info');
            }

            // POST to backend (fallback notification — event listener is primary trigger)
            const res = await fetch(`${getApiUrl()}/gateway/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: txId, status, reason }),
            });
            const data = await res.json();
            if (res.ok) {
                addLine(`✓ ${data.message}`, 'success');
                if (data.settlementTx) {
                    addLine(`  Settlement TX: ${data.settlementTx.slice(0, 16)}...`, 'info');
                }
                if (data.refundTx) {
                    addLine(`  Refund TX:     ${data.refundTx.slice(0, 16)}...`, 'info');
                }
            } else {
                addLine(`✗ ${data.error}`, 'error');
            }
        } catch (e: any) {
            const msg: string =
                e?.cause?.reason ||
                e?.cause?.message ||
                e?.shortMessage ||
                e?.message ||
                'Unknown error';

            if (msg.includes('User rejected') || msg.includes('user rejected') || e?.code === 4001) {
                addLine('✗ Transaction rejected by user.', 'error');
            } else {
                addLine(`✗ ${msg}`, 'error');
            }
        } finally {
            setIsLoading(false);
            addLine('', 'normal');
            addLine('Press Ctrl+C to return to menu.', 'prompt');
        }
    };

    // ─── Keyboard handler ────────────────────────────────────────────────────

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            reset();
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            if (step !== 'welcome') reset();
            return;
        }

        switch (step) {
            case 'welcome':
                if (e.key === 'Enter') setStep('menu');
                break;
            case 'menu':
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedItem(p => Math.max(0, p - 1));
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedItem(p => Math.min(menuOptions.length - 1, p + 1));
                }
                if (e.key === 'Enter') menuOptions[selectedItem].action();
                break;
            case 'url-input':
                if (e.key === 'Enter' && currentInput.trim() && !isLoading) {
                    const url = currentInput.trim();
                    setCurrentInput('');
                    handleFetchResource(url);
                }
                break;
            case 'payment':
                if (e.key === 'Enter' && !isLoading) handlePayment();
                break;
            case 'unlocked':
                if (e.key === 'Enter' && !isLoading) handleSettle('SETTLED');
                if ((e.key === 'd' || e.key === 'D') && !isLoading) {
                    addLine('', 'normal');
                    addLine('Reason for dispute:', 'prompt');
                    setCurrentInput('');
                    setStep('dispute-reason');
                }
                break;
            case 'dispute-reason':
                if (e.key === 'Enter' && currentInput.trim()) {
                    const reason = currentInput.trim();
                    setCurrentInput('');
                    setStep('unlocked');
                    handleSettle('DISPUTED', reason);
                }
                break;
        }
    };

    // ─── Line colors ─────────────────────────────────────────────────────────

    const lineColor = (type: TerminalLine['type']) => {
        switch (type) {
            case 'success': return 'text-[#27c93f]';
            case 'error':   return 'text-[#ef4444]';
            case 'info':    return 'text-[#4C8BF5]';
            case 'prompt':  return 'text-[#375BD2]';
            default:        return 'text-gray-300';
        }
    };

    const isOnSepolia = chainId === sepolia.id;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/60">

                {/* Title bar */}
                <div className="bg-[#181818] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    <span className="ml-4 text-gray-500 text-xs font-mono">chainlink-agent — x402 agent terminal</span>
                    <div className="ml-auto flex items-center gap-3">
                        {isConnected ? (
                            <>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${isOnSepolia ? 'bg-[#375BD2]/10 text-[#375BD2]' : 'bg-red-500/10 text-red-400'}`}>
                                    {isOnSepolia ? 'SEPOLIA' : `CHAIN ${chainId}`}
                                </span>
                                <span className="text-[#375BD2] text-xs font-mono">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                            </>
                        ) : (
                            <span className="text-gray-600 text-xs font-mono">wallet not connected</span>
                        )}
                    </div>
                </div>

                {/* Terminal body */}
                <div
                    id="terminal-container"
                    ref={terminalRef}
                    className="h-[560px] overflow-y-auto p-6 font-mono text-sm outline-none cursor-text"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#375BD2 #0d0d0d' }}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onClick={() => document.getElementById('terminal-container')?.focus()}
                >

                    {/* ── WELCOME ── */}
                    {step === 'welcome' && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <pre className="text-[#375BD2] text-xs leading-tight select-none">{`   _____ _           _       _  _       _
  / ____| |         (_)     | |(_)     | |
 | |    | |__   __ _ _ _ __ | | _ _ __ | | __
 | |    | '_ \\ / _\` | | '_ \\| || | '_ \\| |/ /
 | |____| | | | (_| | | | | | || | | | |   <
  \\_____|_| |_|\\__,_|_|_| |_|_||_|_| |_|_|\\_\\
                               x402 Agent Demo`}</pre>
                            <div className="text-center space-y-2">
                                <p className="text-white text-lg font-bold">Chainlink Agent — x402 Payment Protocol</p>
                                <p className="text-gray-500 text-sm">Real on-chain escrow · Ethereum Sepolia · EscrowMarketplace.sol</p>
                            </div>
                            <p className="text-[#375BD2] mt-4">
                                Press <span className="bg-white/10 px-2 py-0.5 rounded text-sm">Enter</span> to start
                            </p>
                        </div>
                    )}

                    {/* ── MENU ── */}
                    {step === 'menu' && (
                        <div>
                            <p className="text-gray-500 mb-1 text-xs">agent@chainlink-demo:~$</p>
                            <p className="text-white mb-5">Select an action:</p>
                            {menuOptions.map((opt, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setSelectedItem(i); opt.action(); }}
                                    className={`py-2.5 px-4 mb-2 rounded-lg cursor-pointer transition-all ${
                                        i === selectedItem
                                            ? 'bg-[#375BD2]/15 border border-[#375BD2]/30 text-white'
                                            : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                    }`}
                                >
                                    <span className={`mr-3 ${i === selectedItem ? 'text-[#375BD2]' : 'text-gray-600'}`}>
                                        {i === selectedItem ? '▶' : '○'}
                                    </span>
                                    <span className="font-medium">{opt.label}</span>
                                    <span className="ml-3 text-xs text-gray-600">{opt.desc}</span>
                                </div>
                            ))}
                            <p className="text-gray-600 mt-6 text-xs">
                                ↑ ↓ navigate · Enter select · Ctrl+C reset · Esc back
                            </p>
                        </div>
                    )}

                    {/* ── ALL ACTIVE STEPS: terminal history ── */}
                    {!['welcome', 'menu'].includes(step) && (
                        <div>
                            {lines.map((line, i) => (
                                <div key={i} className={`leading-5 mb-0.5 ${lineColor(line.type)}`}>
                                    {line.text || '\u00A0'}
                                </div>
                            ))}

                            {/* URL input */}
                            {step === 'url-input' && (
                                <div className="flex items-center mt-1">
                                    <span className="text-[#375BD2] mr-2">❯</span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={currentInput}
                                        onChange={e => setCurrentInput(e.target.value)}
                                        className="flex-1 bg-transparent text-white outline-none font-mono placeholder-gray-700"
                                        placeholder="http://localhost:3001/api/gateway/resource/..."
                                        autoFocus
                                        onKeyDown={e => {
                                            // Stop bubbling so the parent container's handleKeyDown doesn't also fire
                                            e.stopPropagation();
                                            if (e.key === 'Enter' && currentInput.trim() && !isLoading) {
                                                const url = currentInput.trim();
                                                setCurrentInput('');
                                                handleFetchResource(url);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Dispute reason input */}
                            {step === 'dispute-reason' && (
                                <div className="flex items-center mt-1">
                                    <span className="text-[#ef4444] mr-2">❯</span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={currentInput}
                                        onChange={e => setCurrentInput(e.target.value)}
                                        className="flex-1 bg-transparent text-white outline-none font-mono placeholder-gray-700"
                                        placeholder="Describe the issue..."
                                        autoFocus
                                        onKeyDown={e => {
                                            // Stop bubbling so the parent container's handleKeyDown doesn't also fire
                                            e.stopPropagation();
                                            if (e.key === 'Enter' && currentInput.trim()) {
                                                const reason = currentInput.trim();
                                                setCurrentInput('');
                                                setStep('unlocked');
                                                handleSettle('DISPUTED', reason);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Loading cursor */}
                            {isLoading && (
                                <span className="text-[#375BD2] animate-pulse">▊</span>
                            )}

                            {/* Pay button */}
                            {step === 'payment' && !isLoading && (
                                <button
                                    onClick={handlePayment}
                                    tabIndex={-1}
                                    className="mt-3 text-[#375BD2] hover:text-white transition-colors cursor-pointer"
                                >
                                    ❯ Press Enter or click to sign deposit transaction
                                </button>
                            )}

                            {/* Unlocked content display */}
                            {step === 'unlocked' && unlockedContent && !isLoading && (
                                <div className="mt-3 space-y-2">
                                    {/* Image: already downloaded, show confirmation */}
                                    {unlockedContent.type === 'image' && (
                                        <div className="bg-[#27c93f]/5 border border-[#27c93f]/20 rounded-lg p-3">
                                            <p className="text-[#27c93f] text-xs">✓ {unlockedContent.filename}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {((unlockedContent.size ?? 0) / 1024).toFixed(1)} KB · saved to Downloads
                                            </p>
                                        </div>
                                    )}

                                    {/* LINK or VIDEO: show clickable URL */}
                                    {(unlockedContent.type === 'LINK' || unlockedContent.type === 'VIDEO') && (
                                        <div className="bg-[#375BD2]/5 border border-[#375BD2]/20 rounded-lg p-3">
                                            <span className="text-[10px] font-bold bg-[#375BD2]/20 text-[#375BD2] px-2 py-0.5 rounded mr-2 uppercase">
                                                {unlockedContent.type}
                                            </span>
                                            <a
                                                href={unlockedContent.data}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#4C8BF5] hover:underline break-all text-xs"
                                            >
                                                {unlockedContent.data}
                                            </a>
                                        </div>
                                    )}

                                    {/* IMAGE type in JSON response (base64) */}
                                    {unlockedContent.type === 'IMAGE' && unlockedContent.data && (
                                        <div className="rounded-lg overflow-hidden border border-white/10 max-w-sm">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={unlockedContent.data}
                                                alt={unlockedContent.title ?? 'Unlocked image'}
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer hint */}
            <p className="text-center text-gray-700 text-xs mt-3 font-mono">
                Click terminal to focus · Ctrl+C reset · Real Sepolia transactions
            </p>
        </div>
    );
}
