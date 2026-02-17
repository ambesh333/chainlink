'use client';
import { ConnectWalletButton } from './ConnectWalletButton';

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#375BD2] to-[#2A4AB0] flex items-center justify-center font-bold text-white text-sm">
                        ⬡
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">
                        Chainlink Agent
                    </span>
                </div>

                {/* Wallet */}
                <ConnectWalletButton />
            </div>
        </nav>
    );
}
