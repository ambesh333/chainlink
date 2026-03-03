'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

// Inline SVG avatars — no external dependency needed
const AVATAR_COLORS = ['#2D50A2', '#132A63', '#041A54', '#0D1B39'];
function AvatarCircle({ color, letter }: { color: string; letter: string }) {
    return (
        <div
            className="w-8 h-8 rounded-full border-2 border-[#020A20] flex items-center justify-center text-white text-xs font-bold"
            style={{ background: color }}
        >
            {letter}
        </div>
    );
}
const AVATARS = [
    { color: AVATAR_COLORS[0], letter: 'A' },
    { color: AVATAR_COLORS[1], letter: 'B' },
    { color: AVATAR_COLORS[2], letter: 'C' },
    { color: AVATAR_COLORS[3], letter: 'D' },
];

export default function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#020A20]">

            {/* ── Banner image sits in the bottom half ── */}
            <div className="absolute inset-0">
                <video
                    src="/landing/main_video.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover object-bottom"
                    style={{ opacity: 0.85 }}
                />
                {/* top dark fade so text stays readable */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#020A20] via-[#020A20]/60 to-transparent" />
                {/* subtle blue radial glow at centre-top */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 70% 40% at 50% 10%, rgba(45,80,162,0.22) 0%, transparent 70%)',
                    }}
                />
            </div>

            {/* ── Content (centred) ── */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-start text-center px-6 pt-48 pb-16">
                {/* Headline */}
                <motion.h1
                    className="text-5xl md:text-[4.25rem] font-bold text-white leading-[1.12] tracking-tight max-w-3xl drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    The End to End Marketplace for&nbsp;AI‑Native&nbsp;Data
                </motion.h1>

                {/* Sub-headline */}
                <motion.p
                    className="mt-6 text-base md:text-lg text-white/90 font-bold max-w-xl leading-relaxed drop-shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.25 }}
                >
                    Launch, sell, and automate data resources in one place — AI workflow builder, AI dispute resolution,
                    and x402 escrow payments built in for a full end‑to‑end marketplace.
                </motion.p>

                {/* CTA buttons  */}
                <motion.div
                    className="mt-10 flex items-center gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                >
                    {/* Ghost / outline button */}
                    <Link
                        href="/dashboard/explore"
                        className="px-7 py-3 rounded-full border border-white/25 text-white text-sm font-semibold
                                   bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                    >
                        Explore Resources
                    </Link>

                    {/* Solid white button */}
                    <Link
                        href="/dashboard"
                        className="px-7 py-3 rounded-full bg-white text-gray-900 text-sm font-bold
                                   hover:bg-gray-100 transition-all duration-200 shadow-lg shadow-white/10"
                    >
                        Get Started
                    </Link>
                </motion.div>
            </div>

            {/* bottom vignette so the arc blends into the next section */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020A20] to-transparent pointer-events-none" />
        </section>
    );
}
