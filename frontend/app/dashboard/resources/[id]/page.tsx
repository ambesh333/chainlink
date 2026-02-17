'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import { ArrowLeft, Copy, Check, ExternalLink, Image, Video, Link as LinkIcon, Shield, Zap } from 'lucide-react';

interface Resource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    url: string | null;
    network: 'SEPOLIA';
    token: 'ETH';
    isActive: boolean;
    autoApprovalMinutes: number;
    createdAt: string;
}

export default function ResourceDetailPage() {
    const params = useParams();
    const { isAuthenticated } = useAuth();
    const [resource, setResource] = useState<Resource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    const API_URL = getApiUrl();
    const gatewayUrl = `${API_URL}/gateway/resource/${params.id}`;

    useEffect(() => {
        if (!isAuthenticated || !params.id) return;

        const fetchResource = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`${API_URL}/resources/${params.id}`, {
                    credentials: 'include',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                });
                if (res.ok) {
                    const data = await res.json();
                    setResource(data.resource);
                }
            } catch (e) {
                console.error('Error fetching resource:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResource();
    }, [isAuthenticated, params.id]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={20} className="text-[#375BD2]" />;
            case 'VIDEO': return <Video size={20} className="text-[#5B7FE8]" />;
            default: return <LinkIcon size={20} className="text-[#8BA4F0]" />;
        }
    };

    if (!isAuthenticated) return null;

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-64 bg-white/5 rounded-2xl" />
                    <div className="h-48 bg-white/5 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!resource) {
        return (
            <div className="max-w-3xl mx-auto text-center py-24">
                <p className="text-gray-400">Resource not found</p>
                <Link href="/dashboard/resources" className="text-[#375BD2] hover:underline mt-4 inline-block">
                    ← Back to Resources
                </Link>
            </div>
        );
    }

    const curlExample = `curl -X GET "${gatewayUrl}"

# Response: 402 Payment Required
# {
#   "paymentRequirements": {
#     "scheme": "exact",
#     "network": "ethereum-sepolia",
#     "token": "ETH",
#     "maxAmountRequired": "${resource.price}",
#     "payTo": "<facilitator_address>"
#   }
# }

# After sending ETH payment on Sepolia:
curl -X GET "${gatewayUrl}" \\
  -H 'X-Payment: {"version":1,"scheme":"exact","network":"sepolia","payload":{"txHash":"0xYOUR_TX_HASH","sender":"0xYOUR_ADDRESS","amount":"${resource.price}","timestamp":1234567890}}'`;

    return (
        <div className="max-w-3xl mx-auto">
            <Link
                href="/dashboard/resources"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-[#375BD2] mb-8 transition-colors text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Resources
            </Link>

            {/* Resource Header */}
            <div className="bg-[#0a0a0f]/60 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden mb-6">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#375BD2]/40 to-transparent" />

                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            {getTypeIcon(resource.type)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#F4F4F5]">{resource.title}</h2>
                            <p className="text-gray-500 text-sm mt-1">{resource.description || 'No description'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#375BD2]/10 text-[#375BD2] border border-[#375BD2]/20">
                            {resource.network}
                        </span>
                        <span className={`text-xs px-3 py-1 rounded-full ${resource.isActive ? 'bg-[#4CAF50]/10 text-[#4CAF50]' : 'bg-gray-800 text-gray-500'}`}>
                            {resource.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Type</span>
                        <p className="text-[#F4F4F5] font-bold mt-1">{resource.type}</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Price</span>
                        <p className="text-[#F4F4F5] font-bold mt-1">{resource.price} ETH</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Token</span>
                        <p className="text-[#F4F4F5] font-bold mt-1">{resource.token}</p>
                    </div>
                </div>
            </div>

            {/* x402 Gateway Section */}
            <div className="bg-[#0a0a0f]/60 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden mb-6">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4CAF50]/40 to-transparent" />

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#4CAF50]/10 rounded-lg">
                        <Shield size={20} className="text-[#4CAF50]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#F4F4F5]">x402 Payment Gateway</h3>
                        <p className="text-xs text-gray-500">HTTP 402 — Pay-per-access with ETH on Sepolia</p>
                    </div>
                </div>

                {/* Gateway URL */}
                <div className="mb-6">
                    <label className="text-[10px] uppercase font-bold text-gray-600 block mb-2 tracking-wider">Gateway Endpoint</label>
                    <div className="flex items-center gap-2 bg-black/40 p-4 rounded-xl border border-white/10 hover:border-[#375BD2]/30 transition-colors">
                        <Zap size={14} className="text-[#375BD2] flex-shrink-0" />
                        <code className="text-sm text-[#375BD2] truncate flex-1 font-mono">
                            {gatewayUrl}
                        </code>
                        <button
                            onClick={() => handleCopy(gatewayUrl, 'url')}
                            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${copied === 'url' ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                        >
                            {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* How it works */}
                <div className="mb-6">
                    <label className="text-[10px] uppercase font-bold text-gray-600 block mb-3 tracking-wider">How x402 Works</label>
                    <div className="space-y-3">
                        {[
                            { step: '1', text: 'Client sends GET request to the gateway endpoint' },
                            { step: '2', text: 'Server responds with 402 + payment requirements (amount, payTo, network)' },
                            { step: '3', text: `Client sends ${resource.price} ETH to the payTo address on Sepolia` },
                            { step: '4', text: 'Client retries GET request with X-Payment header containing tx hash' },
                            { step: '5', text: 'Server verifies the transaction on-chain and delivers the resource' },
                        ].map(({ step, text }) => (
                            <div key={step} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                <span className="w-6 h-6 bg-[#375BD2] text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {step}
                                </span>
                                <span className="text-sm text-gray-300">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* cURL Example */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">Example (cURL)</label>
                        <button
                            onClick={() => handleCopy(curlExample, 'curl')}
                            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-lg transition-colors ${copied === 'curl' ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                        >
                            {copied === 'curl' ? <Check size={12} /> : <Copy size={12} />}
                            {copied === 'curl' ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <pre className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto text-[11px] font-mono text-gray-400 leading-relaxed">
                        {curlExample}
                    </pre>
                </div>
            </div>
        </div>
    );
}
