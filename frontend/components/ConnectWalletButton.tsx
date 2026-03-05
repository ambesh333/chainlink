'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from './AuthContext';
import { Loader2, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

export function ConnectWalletButton() {
    const { isConnected } = useAccount();
    const { user, isLoading, isAuthenticated, signIn, signOut, generateShieldedAddress, error } = useAuth();
    const [shieldedLoading, setShieldedLoading] = useState(false);
    const [shieldedError, setShieldedError] = useState<string | null>(null);

    // Not connected to wallet yet — show RainbowKit connect button
    if (!isConnected) {
        return <ConnectButton />;
    }

    // Connected but not authenticated with our backend
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-end gap-2">
                <button
                    onClick={signIn}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-[#375BD2] hover:bg-[#2A4AB0] rounded-full font-semibold text-sm text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Signing...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={16} /> Sign In with Wallet
                        </>
                    )}
                </button>
                {error && (
                    <div className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertCircle size={12} /> {error}
                    </div>
                )}
            </div>
        );
    }

    // Authenticated
    return (
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm font-bold text-white truncate max-w-[200px]">
                    {user?.displayName || user?.walletAddress.slice(0, 6) + '...' + user?.walletAddress.slice(-4)}
                </p>
                <p className="text-xs text-gray-400">Connected</p>
            </div>

            {!user?.shieldedAddress ? (
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={async () => {
                            try {
                                setShieldedLoading(true);
                                setShieldedError(null);
                                await generateShieldedAddress();
                            } catch (err: any) {
                                setShieldedError(err?.message || 'Failed to generate shielded address');
                            } finally {
                                setShieldedLoading(false);
                            }
                        }}
                        disabled={shieldedLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-sm text-white transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {shieldedLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} /> Generate Shielded Address
                            </>
                        )}
                    </button>
                    {shieldedError && (
                        <div className="flex items-center gap-1 text-red-400 text-xs">
                            <AlertCircle size={12} /> {shieldedError}
                        </div>
                    )}
                </div>
            ) : null}

            <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm text-white transition-colors cursor-pointer"
            >
                <LogOut size={16} /> Sign Out
            </button>
        </div>
    );
}
