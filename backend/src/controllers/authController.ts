import { Request, Response } from 'express';
import { prisma } from '../context';
import crypto from 'crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const NONCE_EXPIRY_MINUTES = 5;
const JWT_EXPIRY = '7d';
const PRIVATE_TOKEN_API_URL = process.env.PRIVATE_TOKEN_API_URL || 'https://convergence2026-token-api.cldev.cloud';
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || '';
const FACILITATOR_SHIELDED_ADDRESS = process.env.FACILITATOR_SHIELDED_ADDRESS || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

async function requestShieldedAddress(params: { account: string; timestamp: number; auth: string }): Promise<string> {
    const response = await fetch(`${PRIVATE_TOKEN_API_URL}/shielded-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error_details || data.error || `Private Token API error: ${response.statusText}`);
    }

    if (!data.address) {
        throw new Error('Shielded address missing in API response');
    }

    return data.address as string;
}

// GET /api/auth/me - Check session
export const getMe = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.session_token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { walletAddress: string; userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        return res.json({
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                displayName: user.displayName,
                shieldedAddress: user.shieldedAddress
            }
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// POST /api/auth/nonce - Generate challenge nonce
export const generateNonce = async (req: Request, res: Response) => {
    try {
        const { address } = req.body;

        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'address is required' });
        }

        // Normalize to checksummed address
        let checksumAddress: string;
        try {
            checksumAddress = ethers.getAddress(address);
        } catch {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        // Generate a random nonce
        const nonce = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

        // Store the challenge
        const challenge = await prisma.authChallenge.create({
            data: {
                walletAddress: checksumAddress,
                nonce,
                expiresAt
            }
        });

        return res.json({
            nonce: challenge.nonce,
            challengeId: challenge.id,
            expiresAt: challenge.expiresAt.toISOString()
        });
    } catch (error: any) {
        console.error('Nonce generation error:', error?.message || error);
        console.error('Full error:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: 'Failed to generate nonce', details: error?.message });
    }
};

// POST /api/auth/verify - Verify signature and issue JWT
export const verifySignature = async (req: Request, res: Response) => {
    try {
        const { address, signature, message, challengeId } = req.body;

        if (!address || !signature || !message) {
            return res.status(400).json({ error: 'address, signature, and message are required' });
        }

        // Normalize address
        let checksumAddress: string;
        try {
            checksumAddress = ethers.getAddress(address);
        } catch {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        // Find the challenge
        const challenge = await prisma.authChallenge.findFirst({
            where: challengeId
                ? { id: challengeId, walletAddress: checksumAddress }
                : { walletAddress: checksumAddress, used: false }
        });

        if (!challenge) {
            return res.status(401).json({ error: 'Challenge not found' });
        }

        if (challenge.used) {
            return res.status(401).json({ error: 'Challenge already used (replay attack prevention)' });
        }

        if (new Date() > challenge.expiresAt) {
            return res.status(401).json({ error: 'Challenge expired' });
        }

        // Verify the nonce is in the message
        if (!message.includes(challenge.nonce)) {
            return res.status(401).json({ error: 'Nonce mismatch' });
        }

        // Verify the signature using ethers.js (EIP-191 personal_sign / ecrecover)
        let recoveredAddress: string;
        try {
            recoveredAddress = ethers.verifyMessage(message, signature);
        } catch (e) {
            console.error('Signature verification error:', e);
            return res.status(401).json({ error: 'Invalid signature format' });
        }

        if (recoveredAddress.toLowerCase() !== checksumAddress.toLowerCase()) {
            return res.status(401).json({ error: 'Signature verification failed: signer mismatch' });
        }

        // Mark challenge as used
        await prisma.authChallenge.update({
            where: { id: challenge.id },
            data: { used: true }
        });

        // Find or create the user
        let user = await prisma.user.findUnique({
            where: { walletAddress: checksumAddress }
        });

        if (!user) {
            // New signup
            user = await prisma.user.create({
                data: {
                    walletAddress: checksumAddress,
                    lastLogin: new Date()
                }
            });
        } else {
            // Existing user - update last login
            user = await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
        }

        // Issue JWT
        const token = jwt.sign(
            { walletAddress: checksumAddress, userId: user.id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        console.log(`[Auth] Login successful for wallet: ${checksumAddress}`);

        // Set httpOnly cookie
        res.cookie('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json({
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                displayName: user.displayName,
                shieldedAddress: user.shieldedAddress,
                isNewUser: !user.displayName
            },
            token // Return token for client-side storage (fallback for cross-site cookies)
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
};

// POST /api/auth/shielded-address - Store user's shielded address
export const setShieldedAddress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId as string | undefined;
        const walletAddress = (req as any).walletAddress as string | undefined;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { shieldedAddress, auth, timestamp } = req.body as {
            shieldedAddress?: string;
            auth?: string;
            timestamp?: number | string;
        };

        let finalShieldedAddress = shieldedAddress;
        if (!finalShieldedAddress) {
            if (!walletAddress) {
                return res.status(400).json({ error: 'Wallet address missing from session' });
            }
            if (!auth || typeof auth !== 'string') {
                return res.status(400).json({ error: 'auth is required' });
            }
            const tsNumber = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
            if (!tsNumber || Number.isNaN(tsNumber)) {
                return res.status(400).json({ error: 'timestamp is required' });
            }

            finalShieldedAddress = await requestShieldedAddress({
                account: walletAddress,
                timestamp: tsNumber,
                auth,
            });
        }

        let checksumAddress: string;
        try {
            checksumAddress = ethers.getAddress(finalShieldedAddress);
        } catch {
            return res.status(400).json({ error: 'Invalid Ethereum address' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { shieldedAddress: checksumAddress }
        });

        return res.json({
            success: true,
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                displayName: user.displayName,
                shieldedAddress: user.shieldedAddress
            }
        });
    } catch (error) {
        console.error('Set shielded address error:', error);
        return res.status(500).json({ error: 'Failed to save shielded address' });
    }
};

// POST /api/auth/private-balance - Fetch user's private token balance via signed auth
export const getPrivateBalance = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId as string | undefined;
        const walletAddress = (req as any).walletAddress as string | undefined;
        if (!userId || !walletAddress) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { auth, timestamp } = req.body as {
            auth?: string;
            timestamp?: number | string;
        };

        if (!auth || typeof auth !== 'string') {
            return res.status(400).json({ error: 'auth is required' });
        }

        const tsNumber = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
        if (!tsNumber || Number.isNaN(tsNumber)) {
            return res.status(400).json({ error: 'timestamp is required' });
        }

        const response = await fetch(`${PRIVATE_TOKEN_API_URL}/balances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account: walletAddress,
                timestamp: tsNumber,
                auth,
            }),
        });

        const data: any = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error_details || data.error || `Private Token API error: ${response.statusText}`);
        }

        const balances: Array<{ token: string; amount: string }> = Array.isArray(data.balances) ? data.balances : [];
        const tokenAddress = (process.env.TOKEN_ADDRESS || '').toLowerCase();
        const match = tokenAddress
            ? balances.find(b => b.token?.toLowerCase() === tokenAddress)
            : balances[0];

        const balanceWei = match?.amount || '0';
        const balance = ethers.formatUnits(balanceWei, 18);

        return res.json({
            account: walletAddress,
            token: match?.token || (tokenAddress ? `0x${tokenAddress.slice(2)}` : null),
            balanceWei,
            balance,
        });
    } catch (error: any) {
        console.error('Private balance error:', error?.message || error);
        return res.status(500).json({ error: 'Failed to fetch private balance', message: error?.message });
    }
};

// POST /api/auth/withdraw-eth - Convert private CLAG balance to ETH payout
export const withdrawToEth = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId as string | undefined;
        const walletAddress = (req as any).walletAddress as string | undefined;
        if (!userId || !walletAddress) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!FACILITATOR_PRIVATE_KEY || !FACILITATOR_SHIELDED_ADDRESS || !TOKEN_ADDRESS) {
            return res.status(500).json({ error: 'Facilitator payout config missing' });
        }

        const { auth, timestamp, amount } = req.body as {
            auth?: string;
            timestamp?: number | string;
            amount?: string;
        };

        if (!auth || typeof auth !== 'string') {
            return res.status(400).json({ error: 'auth is required' });
        }

        const tsNumber = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
        if (!tsNumber || Number.isNaN(tsNumber)) {
            return res.status(400).json({ error: 'timestamp is required' });
        }

        if (!amount || typeof amount !== 'string') {
            return res.status(400).json({ error: 'amount is required' });
        }

        // 1) Private transfer from merchant -> treasury shielded address
        const transferRes = await fetch(`${PRIVATE_TOKEN_API_URL}/private-transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account: walletAddress,
                recipient: FACILITATOR_SHIELDED_ADDRESS,
                token: TOKEN_ADDRESS,
                amount,
                flags: [],
                timestamp: tsNumber,
                auth,
            }),
        });

        const transferData: any = await transferRes.json().catch(() => ({}));
        if (!transferRes.ok) {
            throw new Error(transferData.error_details || transferData.error || `Private transfer failed`);
        }

        const privateTransferTxId = transferData.transaction_id as string | undefined;

        // 2) Send ETH payout (1:1 with CLAG for now)
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const facilitatorWallet = new ethers.Wallet(FACILITATOR_PRIVATE_KEY, provider);
        const value = BigInt(amount);

        const tx = await facilitatorWallet.sendTransaction({
            to: walletAddress,
            value,
        });

        return res.json({
            success: true,
            privateTransferTxId,
            ethTxHash: tx.hash,
            amountWei: amount,
        });
    } catch (error: any) {
        console.error('Withdraw to ETH error:', error?.message || error);
        return res.status(500).json({ error: 'Withdraw to ETH failed', message: error?.message });
    }
};

// POST /api/auth/logout - Clear session
export const logout = async (req: Request, res: Response) => {
    res.clearCookie('session_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return res.json({ success: true });
};
