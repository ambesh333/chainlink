import { Request, Response } from 'express';
import { prisma } from '../context';
import {
    calculateResourceScore,
    calculateMerchantScore,
    getScoreLabel,
} from '../utils/scoring';

const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';

/**
 * GET /api/explore
 * List all active resources (public, for AI agents).
 * Privacy-first: no user PII exposed, includes trust scores.
 */
export const listAllPublicResources = async (_req: Request, res: Response) => {
    try {
        const resources = await prisma.resource.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                transactions: {
                    select: { status: true },
                },
                user: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: { select: { id: true } },
                        transactions: {
                            select: { amount: true, status: true },
                        },
                    },
                },
            },
        });

        const resourcesWithScores = resources.map((resource) => {
            const merchantTotalTx = resource.user.transactions.length;
            const merchantLostDisputes = resource.user.transactions.filter(
                (tx) => tx.status === 'REFUNDED',
            ).length;
            const merchantTotalEarnings = resource.user.transactions
                .filter((tx) => tx.status === 'SETTLED')
                .reduce((sum, tx) => sum + tx.amount, 0);

            const merchantScore = calculateMerchantScore({
                resourceCount: resource.user.resources.length,
                totalEarnings: merchantTotalEarnings,
                totalTransactions: merchantTotalTx,
                lostDisputes: merchantLostDisputes,
                createdAt: resource.user.createdAt,
            });

            const totalTransactions = resource.transactions.length;
            const settledDisputes = resource.transactions.filter(
                (tx) => tx.status === 'REFUNDED',
            ).length;
            const activeDisputes = resource.transactions.filter(
                (tx) => tx.status === 'REFUND_REQUESTED',
            ).length;

            const resourceScore = calculateResourceScore({
                accessCount: totalTransactions,
                settledDisputes,
                activeDisputes,
                merchantScore,
                createdAt: resource.createdAt,
                totalTransactions,
            });

            const scoreLabel = getScoreLabel(resourceScore);

            return {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                isActive: resource.isActive,
                createdAt: resource.createdAt,
                trustScore: resourceScore,
                trustLabel: scoreLabel.label,
            };
        });

        // Secondary sort by trust score (highest first)
        resourcesWithScores.sort((a, b) => b.trustScore - a.trustScore);

        return res.json({
            resources: resourcesWithScores,
            count: resourcesWithScores.length,
            endpoint: {
                access: '/api/explore/{id}/access',
                details: '/api/explore/{id}',
            },
        });
    } catch (error) {
        console.error('List public resources error:', error);
        return res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

/**
 * GET /api/explore/popular
 * Returns top 5 resources sorted by transaction count (most accessed).
 */
export const getPopularResources = async (_req: Request, res: Response) => {
    try {
        const resources = await prisma.resource.findMany({
            where: { isActive: true },
            include: {
                transactions: { select: { id: true } },
            },
        });

        const sorted = resources
            .map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                type: r.type,
                price: r.price,
                network: r.network,
                token: r.token,
                createdAt: r.createdAt,
                transactionCount: r.transactions.length,
            }))
            .sort((a, b) => b.transactionCount - a.transactionCount)
            .slice(0, 5);

        return res.json({ resources: sorted });
    } catch (error) {
        console.error('Get popular resources error:', error);
        return res.status(500).json({ error: 'Failed to fetch popular resources' });
    }
};

/**
 * GET /api/explore/:id
 * Get a single resource (public) with trust score and payment info.
 */
export const getPublicResource = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const resource = await prisma.resource.findFirst({
            where: { id, isActive: true },
            include: {
                transactions: { select: { status: true } },
                user: {
                    select: {
                        id: true,
                        createdAt: true,
                        resources: { select: { id: true } },
                        transactions: {
                            select: { amount: true, status: true },
                        },
                    },
                },
            },
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const merchantTotalTx = resource.user.transactions.length;
        const merchantLostDisputes = resource.user.transactions.filter(
            (tx) => tx.status === 'REFUNDED',
        ).length;
        const merchantTotalEarnings = resource.user.transactions
            .filter((tx) => tx.status === 'SETTLED')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const merchantScore = calculateMerchantScore({
            resourceCount: resource.user.resources.length,
            totalEarnings: merchantTotalEarnings,
            totalTransactions: merchantTotalTx,
            lostDisputes: merchantLostDisputes,
            createdAt: resource.user.createdAt,
        });

        const totalTransactions = resource.transactions.length;
        const settledDisputes = resource.transactions.filter(
            (tx) => tx.status === 'REFUNDED',
        ).length;
        const activeDisputes = resource.transactions.filter(
            (tx) => tx.status === 'REFUND_REQUESTED',
        ).length;

        const resourceScore = calculateResourceScore({
            accessCount: totalTransactions,
            settledDisputes,
            activeDisputes,
            merchantScore,
            createdAt: resource.createdAt,
            totalTransactions,
        });

        const scoreLabel = getScoreLabel(resourceScore);

        return res.json({
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                autoApprovalMinutes: resource.autoApprovalMinutes,
                createdAt: resource.createdAt,
                trustScore: resourceScore,
                trustLabel: scoreLabel.label,
            },
            payment: {
                required: resource.price > 0,
                amount: resource.price,
                token: resource.token,
                accessEndpoint: `/api/gateway/resource/${id}`,
            },
        });
    } catch (error) {
        console.error('Get public resource error:', error);
        return res.status(500).json({ error: 'Failed to fetch resource' });
    }
};

/**
 * GET /api/explore/:id/access
 * Access resource — returns 402 with escrow info if payment required.
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const paymentHeader = req.headers['x-payment'];

        const resource = await prisma.resource.findFirst({
            where: { id, isActive: true },
            include: {
                user: { select: { walletAddress: true } },
            },
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Payment required but no header — return 402
        if (resource.price > 0 && !paymentHeader) {
            const priceWei = BigInt(Math.floor(resource.price * 1e18));

            res.setHeader('X-Payment-Required', 'true');
            res.setHeader('X-Payment-Amount', priceWei.toString());
            res.setHeader('X-Payment-Token', resource.token);
            res.setHeader('X-Payment-Network', resource.network);
            res.setHeader('X-Resource-ID', resource.id);

            return res.status(402).json({
                error: 'Payment required',
                payment: {
                    amount: resource.price,
                    amountWei: priceWei.toString(),
                    token: resource.token,
                    network: resource.network,
                    escrowContract: ESCROW_CONTRACT_ADDRESS,
                },
                instructions: `Use GET /api/gateway/resource/${id} for the full x402 escrow flow`,
            });
        }

        // Payment header present — redirect to gateway
        if (paymentHeader) {
            return res.json({
                message: 'Use /api/gateway/resource/:id for payment verification and resource access',
                resourceId: resource.id,
            });
        }

        // Free resource — return content directly
        const content: Record<string, unknown> = {
            id: resource.id,
            title: resource.title,
            description: resource.description,
            type: resource.type,
        };

        if (resource.type === 'IMAGE') {
            content.imageData = resource.imageData;
        } else {
            content.url = resource.url;
        }

        return res.json({ content });
    } catch (error) {
        console.error('Access resource error:', error);
        return res.status(500).json({ error: 'Failed to access resource' });
    }
};
