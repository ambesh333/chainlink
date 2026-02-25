import { Request, Response } from 'express';
import { prisma } from '../context';
import { calculateMerchantScore, getScoreLabel } from '../utils/scoring';

interface CreateResourceBody {
    title: string;
    description?: string;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price?: number;
    imageData?: string;
    url?: string;
    network?: 'SEPOLIA';
    token?: 'ETH';
    autoApprovalMinutes?: number;
}

interface UpdateResourceBody extends Partial<CreateResourceBody> {
    isActive?: boolean;
}

/**
 * GET /api/resources
 * List all resources for the authenticated user
 */
export const listResources = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const resources = await prisma.resource.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                price: true,
                url: true,
                network: true,
                token: true,
                isActive: true,
                autoApprovalMinutes: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        return res.json({ resources });
    } catch (error) {
        console.error('List resources error:', error);
        return res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

/**
 * GET /api/resources/:id
 * Get a single resource by ID (includes imageData)
 */
export const getResource = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const resource = await prisma.resource.findFirst({
            where: { id, userId }
        });

        if (!resource) return res.status(404).json({ error: 'Resource not found' });

        return res.json({ resource });
    } catch (error) {
        console.error('Get resource error:', error);
        return res.status(500).json({ error: 'Failed to fetch resource' });
    }
};

/**
 * POST /api/resources
 * Create a new resource
 */
export const createResource = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const body: CreateResourceBody = req.body;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        if (!body.title || !body.type) {
            return res.status(400).json({ error: 'Title and type are required' });
        }

        if (!['IMAGE', 'VIDEO', 'LINK'].includes(body.type)) {
            return res.status(400).json({ error: 'Type must be IMAGE, VIDEO, or LINK' });
        }

        if (body.type === 'IMAGE' && !body.imageData) {
            return res.status(400).json({ error: 'imageData is required for IMAGE type' });
        }

        if ((body.type === 'VIDEO' || body.type === 'LINK') && !body.url) {
            return res.status(400).json({ error: 'url is required for VIDEO/LINK type' });
        }

        const resource = await prisma.resource.create({
            data: {
                userId,
                title: body.title,
                description: body.description,
                type: body.type,
                price: body.price || 0,
                network: body.network || 'SEPOLIA',
                token: body.token || 'ETH',
                imageData: body.type === 'IMAGE' ? body.imageData : null,
                url: body.type !== 'IMAGE' ? body.url : null,
                autoApprovalMinutes: body.autoApprovalMinutes || 60,
            }
        });

        return res.status(201).json({
            resource: {
                id: resource.id,
                title: resource.title,
                description: resource.description,
                type: resource.type,
                price: resource.price,
                network: resource.network,
                token: resource.token,
                url: resource.url,
                isActive: resource.isActive,
                autoApprovalMinutes: resource.autoApprovalMinutes,
                createdAt: resource.createdAt
            }
        });
    } catch (error) {
        console.error('Create resource error:', error);
        return res.status(500).json({ error: 'Failed to create resource' });
    }
};

/**
 * PATCH /api/resources/:id
 * Update a resource
 */
export const updateResource = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        const body: UpdateResourceBody = req.body;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.resource.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Resource not found' });

        const resource = await prisma.resource.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                price: body.price,
                isActive: body.isActive,
                ...(existing.type === 'IMAGE' && body.imageData && { imageData: body.imageData }),
                ...(existing.type !== 'IMAGE' && body.url && { url: body.url }),
            }
        });

        return res.json({ resource });
    } catch (error) {
        console.error('Update resource error:', error);
        return res.status(500).json({ error: 'Failed to update resource' });
    }
};

/**
 * DELETE /api/resources/:id
 * Delete a resource
 */
export const deleteResource = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.resource.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Resource not found' });

        await prisma.resource.delete({ where: { id } });

        return res.json({ success: true });
    } catch (error) {
        console.error('Delete resource error:', error);
        return res.status(500).json({ error: 'Failed to delete resource' });
    }
};

/**
 * GET /api/resources/stats
 * Dashboard overview stats for the authenticated merchant
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Resource counts
        const [totalResources, activeResources] = await Promise.all([
            prisma.resource.count({ where: { userId } }),
            prisma.resource.count({ where: { userId, isActive: true } }),
        ]);

        // Transaction aggregates
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            select: { status: true, amount: true },
        });

        const totalTransactions = transactions.length;
        const revenue = transactions
            .filter(t => t.status === 'SETTLED')
            .reduce((sum, t) => sum + t.amount, 0);
        const pendingDisputes = transactions
            .filter(t => t.status === 'REFUND_REQUESTED')
            .length;
        const lostDisputes = transactions
            .filter(t => t.status === 'REFUNDED')
            .length;

        // Trust score
        const trustScore = calculateMerchantScore({
            resourceCount: totalResources,
            totalEarnings: revenue,
            totalTransactions,
            lostDisputes,
            createdAt: user.createdAt,
        });
        const trustLabel = getScoreLabel(trustScore);

        // Recent transactions (last 10)
        const recentTransactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                resource: { select: { title: true, type: true } },
            },
        });

        const recent = recentTransactions.map(tx => ({
            id: tx.id,
            title: tx.resource?.title || 'Unknown Resource',
            type: tx.resource?.type || 'LINK',
            price: tx.amount,
            status: tx.status,
            date: tx.createdAt,
        }));

        return res.json({
            totalResources,
            activeResources,
            totalTransactions,
            revenue: revenue.toFixed(5),
            pendingDisputes,
            trustScore,
            trustLabel: trustLabel.label,
            recentTransactions: recent,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
