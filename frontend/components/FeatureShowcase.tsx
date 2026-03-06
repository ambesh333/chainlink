'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface FeatureItem {
    title: string;
    subtitle: string;
    description: string;
    imageSrc?: string;
    imageAlt: string;
    tags: string[];
    videoSrc?: string;
    videoPoster?: string;
}

function FeatureMedia({ feature, initialSoundOn }: { feature: FeatureItem; initialSoundOn: boolean }) {
    const [soundOn, setSoundOn] = useState(initialSoundOn);

    return (
        <div className="aspect-video bg-gradient-to-br from-[#060E1F] to-[#020716] relative">
            {feature.videoSrc ? (
                <>
                    <video
                        src={feature.videoSrc}
                        poster={feature.videoPoster || feature.imageSrc}
                        autoPlay
                        loop
                        muted={!soundOn}
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        aria-label={feature.imageAlt}
                    />
                    <button
                        type="button"
                        aria-label={soundOn ? 'Mute video' : 'Unmute video'}
                        onClick={() => setSoundOn((prev) => !prev)}
                        className="absolute bottom-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm border border-white/10"
                    >
                        {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                </>
            ) : feature.imageSrc ? (
                <Image
                    src={feature.imageSrc}
                    alt={feature.imageAlt}
                    fill
                    className="object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#2D50A2]/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#2D50A2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">{feature.imageAlt}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

const features: FeatureItem[] = [
    {
        title: 'Merchant Overview & Resource Hub',
        subtitle: 'Everything in One Place',
        description: 'Manage your catalog, gateway URLs, pricing, and trust scores while tracking transactions, earnings, settlements, and AI-assisted disputes from a single merchant dashboard.',
        videoSrc: '/landing/merchant_console2.mp4',
        imageAlt: 'Merchant Overview Dashboard',
        tags: ['Resources', 'Transactions', 'Trust Score'],
    },
    {
        title: 'AI Agent Integration Demo',
        subtitle: 'x402 in Action',
        description: 'Walk through the end-to-end agent flow: fetch a paywalled resource, open on-chain escrow, sign payment, and verify settlement or disputes in a realistic terminal demo.',
        videoSrc: '/landing/demo_cli.mp4',
        imageAlt: 'AI Agent Integration Demo',
        tags: ['x402', 'On-Chain Escrow', 'Settlement'],
    },
    {
        title: 'Workflow Builder for Resources',
        subtitle: 'Automate Operations',
        description: 'Create visual workflows to automate pricing, availability, and resource actions. Generate flows with AI, schedule runs, and monitor status and history as your marketplace scales.',
        videoSrc: '/landing/workflow.mp4',
        imageAlt: 'Workflow Builder',
        tags: ['Visual Builder', 'AI Generated', 'Scheduled Runs'],
    },
    // {
    //     title: 'Privacy‑Preserving Payments',
    //     subtitle: 'Shielded Settlements',
    //     description: 'Merchants receive payouts through Chainlink Private Token shielded addresses — sender identity is hidden, balances stay confidential, and on‑chain escrow settles into private off‑chain transfers automatically.',
    //     imageAlt: 'Privacy Shielded Payments',
    //     tags: ['Shielded Addresses', 'Hide Sender', 'Private Transfers'],
    // }
];

export default function FeatureShowcase() {
    return (
        <section className="py-24 bg-[#020A20]">
            <div className="max-w-6xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Built for the <span className="bg-gradient-to-r from-[#2D50A2] to-[#041A54] bg-clip-text text-transparent">AI Economy</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        From merchant analytics to workflow automation, shielded payments, and x402 integration — the full stack for private, on-chain AI commerce.
                    </p>
                </div>

                {/* Feature Rows */}
                <div className="space-y-32">
                    {features.map((feature, index) => {
                        const isReversed = index % 2 === 1;
                        const initialSoundOn = Boolean(feature.videoSrc) && index === 0;

                        return (
                            <div
                                key={feature.title}
                                className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-16`}
                            >
                                {/* Image */}
                                <div className="flex-1 w-full">
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#2D50A2]/10">
                                        <FeatureMedia feature={feature} initialSoundOn={initialSoundOn} />

                                        {/* Glow effect */}
                                        <div className={`absolute -inset-1 bg-gradient-to-r from-[#2D50A2]/20 to-transparent blur-xl -z-10 ${isReversed ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 w-full">
                                    <div className={`${isReversed ? 'md:text-right' : ''}`}>
                                        <span className="text-[#2D50A2] text-sm font-medium uppercase tracking-wider">
                                            {feature.subtitle}
                                        </span>
                                        <h3 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
                                            {feature.title}
                                        </h3>
                                        <p className="text-gray-400 text-lg leading-relaxed">
                                            {feature.description}
                                        </p>

                                        {/* Feature highlights */}
                                        <div className={`flex flex-wrap gap-3 mt-6 ${isReversed ? 'md:justify-end' : ''}`}>
                                            {feature.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 text-xs font-medium text-[#2D50A2] bg-[#2D50A2]/10 rounded-full border border-[#2D50A2]/20"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
