'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/config';
import {
    Globe, Image, Video, ExternalLink, Shield, Star, AlertTriangle,
    TrendingUp, Loader2,
} from 'lucide-react';

interface PublicResource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    network: 'SEPOLIA';
    token: 'ETH';
    isActive: boolean;
    createdAt: string;
    trustScore: number;
    trustLabel: string;
}


function TrustBadge({ score, label }: { score: number; label: string }) {
    const getColor = () => {
        if (score >= 85) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
        if (score >= 70) return { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' };
        if (score >= 55) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
        if (score >= 40) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
    };

    const getIcon = () => {
        if (score >= 70) return <Shield size={12} />;
        if (score >= 40) return <Star size={12} />;
        return <AlertTriangle size={12} />;
    };

    const colors = getColor();

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
            {getIcon()}
            {label} · {score}
        </div>
    );
}

function ExploreCard({ resource }: { resource: PublicResource }) {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={18} className="text-[#375BD2]" />;
            case 'VIDEO': return <Video size={18} className="text-[#5B7FE8]" />;
            default: return <ExternalLink size={18} className="text-[#8BA4F0]" />;
        }
    };

    return (
        <div className="bg-[#0a0a0f] rounded-2xl border border-white/10 p-6 hover:border-[#375BD2]/50 transition-all duration-300 group shadow-xl shadow-black/50">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        {getTypeIcon(resource.type)}
                    </div>
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        {resource.type}
                    </span>
                </div>
                <TrustBadge score={resource.trustScore} label={resource.trustLabel} />
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-[#F4F4F5] mb-2 truncate group-hover:text-[#375BD2] transition-colors">
                    {resource.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 h-10">
                    {resource.description || 'No description provided'}
                </p>
            </div>

            {/* Network & Status */}
            <div className="flex items-center gap-2 mb-4">
                <div className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#375BD2]/10 text-[#375BD2] border border-[#375BD2]/20">
                    {resource.network}
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${resource.isActive ? 'bg-[#4CAF50]/10 text-[#4CAF50]' : 'bg-gray-800 text-gray-500'}`}>
                    {resource.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
                        {resource.price > 0 ? resource.price.toFixed(5) : 'Free'}
                        {resource.price > 0 && <span className="ml-1 text-sm font-medium text-gray-500">ETH</span>}
                    </span>
                </div>
                <Link
                    href={`/dashboard/resources/${resource.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-[#375BD2]/20 border border-white/10 hover:border-[#375BD2]/30 rounded-xl text-sm font-medium text-gray-400 hover:text-[#375BD2] transition-all"
                >
                    <TrendingUp size={14} />
                    Details
                </Link>
            </div>
        </div>
    );
}

function ExploreSkeleton() {
    return (
        <div className="bg-[#0a0a0f] rounded-2xl border border-white/5 p-6 animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg" />
                    <div className="w-16 h-4 bg-white/5 rounded mt-3" />
                </div>
                <div className="w-20 h-6 bg-white/5 rounded-full" />
            </div>
            <div className="space-y-3 mb-6">
                <div className="w-3/4 h-6 bg-white/5 rounded" />
                <div className="w-full h-4 bg-white/5 rounded" />
            </div>
            <div className="flex gap-2 mb-4">
                <div className="w-14 h-5 bg-white/5 rounded-full" />
                <div className="w-14 h-5 bg-white/5 rounded-full" />
            </div>
            <div className="border-t border-white/5 pt-4 flex justify-between">
                <div className="w-24 h-8 bg-white/5 rounded" />
                <div className="w-20 h-8 bg-white/5 rounded-xl" />
            </div>
        </div>
    );
}

export default function ExplorePage() {
    const [resources, setResources] = useState<PublicResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const API_URL = getApiUrl();
        setIsLoading(true);
        setError(null);
        fetch(`${API_URL}/explore`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load resources');
                return res.json();
            })
            .then(data => setResources(data.resources ?? []))
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <Globe className="text-[#375BD2]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-[#F4F4F5]">Explore</h2>
                        <p className="text-gray-400 text-sm">Discover resources on the Chainlink Agent marketplace</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {isLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                            {resources.length} resources available
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-[#dc2626]/10 border border-[#dc2626]/30 text-[#ef4444] p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ExploreSkeleton key={i} />
                    ))}
                </div>
            ) : resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#0a0a0f] rounded-2xl border border-white/5">
                    <div className="p-4 bg-white/5 rounded-full mb-4">
                        <Globe size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 font-medium">No resources available yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((resource) => (
                        <ExploreCard key={resource.id} resource={resource} />
                    ))}
                </div>
            )}
        </div>
    );
}
