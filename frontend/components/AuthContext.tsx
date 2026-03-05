'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useSignMessage, useSignTypedData, useDisconnect } from 'wagmi';
import { getApiUrl, getVaultAddress } from '@/lib/config';

interface User {
    id: string;
    walletAddress: string;
    displayName: string | null;
    shieldedAddress?: string | null;
    isNewUser?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    generateShieldedAddress: () => Promise<void>;
    getToken: () => string | null;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { signTypedDataAsync } = useSignTypedData();
    const { disconnect } = useDisconnect();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                }
            } else {
                localStorage.removeItem('auth_token');
            }
        } catch (e) {
            localStorage.removeItem('auth_token');
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = useCallback(async () => {
        if (!address || !isConnected) {
            setError('Please connect your wallet first');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const API_URL = getApiUrl();

            // Step 1: Get nonce
            const nonceRes = await fetch(`${API_URL}/auth/nonce`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
                credentials: 'include'
            });

            if (!nonceRes.ok) {
                throw new Error('Failed to get nonce');
            }

            const { nonce, challengeId } = await nonceRes.json();

            // Step 2: Construct SIWE-style message and sign with wallet
            const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
            const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
            const issuedAt = new Date().toISOString();

            const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Chainlink Agent

URI: ${origin}
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${issuedAt}`;

            // Sign the message using EIP-191 personal_sign
            const signature = await signMessageAsync({ message });

            // Step 3: Verify with backend
            const verifyRes = await fetch(`${API_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    signature,
                    message,
                    challengeId
                }),
                credentials: 'include'
            });

            if (!verifyRes.ok) {
                const data = await verifyRes.json();
                throw new Error(data.error || 'Verification failed');
            }

            const { user: userData, token } = await verifyRes.json();

            if (token) {
                localStorage.setItem('auth_token', token);
            }

            setUser(userData);

        } catch (e: any) {
            setError(e.message || 'Sign in failed');
            console.error('Sign in error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [address, isConnected, signMessageAsync, signTypedDataAsync]);

    const ensureShieldedAddress = async (currentUser: User) => {
        if (!address || !isConnected) return;
        if (currentUser.shieldedAddress) return;

        try {
            const API_URL = getApiUrl();
            const VAULT_ADDRESS = getVaultAddress();

            const timestamp = Math.floor(Date.now() / 1000);
            const domain = {
                name: 'CompliantPrivateTokenDemo',
                version: '0.0.1',
                chainId: 11155111,
                verifyingContract: VAULT_ADDRESS,
            } as const;

            const types = {
                'Generate Shielded Address': [
                    { name: 'account', type: 'address' },
                    { name: 'timestamp', type: 'uint256' },
                ],
            } as const;

            const auth = await signTypedDataAsync({
                domain,
                types,
                primaryType: 'Generate Shielded Address',
                message: {
                    account: address as `0x${string}`,
                    timestamp: BigInt(timestamp),
                },
            });

            const saveRes = await fetch(`${API_URL}/auth/shielded-address`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ timestamp, auth }),
            });

            const saveData = await saveRes.json().catch(() => ({}));
            if (!saveRes.ok) {
                throw new Error(saveData.error || 'Failed to save shielded address');
            }

            if (saveData.user) {
                setUser(saveData.user);
            }
        } catch (err) {
            console.warn('[Auth] Shielded address generation failed:', err);
        }
    };

    const generateShieldedAddress = useCallback(async () => {
        if (!user) return;
        await ensureShieldedAddress(user);
    }, [user, address, isConnected, signTypedDataAsync]);

    const signOut = useCallback(async () => {
        try {
            const API_URL = getApiUrl();
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            localStorage.removeItem('auth_token');
            setUser(null);
            disconnect();
        }
    }, [disconnect]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            signIn,
            signOut,
            generateShieldedAddress,
            getToken: () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
            error
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
