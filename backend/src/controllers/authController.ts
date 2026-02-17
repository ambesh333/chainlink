import { Request, Response } from 'express';
import { prisma } from '../context';
import crypto from 'crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const NONCE_EXPIRY_MINUTES = 5;
const JWT_EXPIRY = '7d';

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
                displayName: user.displayName
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
                isNewUser: !user.displayName
            },
            token // Return token for client-side storage (fallback for cross-site cookies)
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Verification failed' });
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
