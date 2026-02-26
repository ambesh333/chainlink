/**
 * AI Dispute Resolution Controller
 *
 * Handles AI-powered dispute analysis and resolution endpoints.
 */

import { Request, Response } from 'express';
import { prisma } from '../context';
import { analyzeDispute, AnalysisInput } from '../services/aiDisputeService';
import { finalizeSettlementOnChain } from '../clients/escrowClient';

/**
 * POST /api/disputes/:transactionId/ai-analyze
 * Trigger AI analysis for a disputed transaction
 */
export const aiAnalyzeDispute = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const userId = (req as any).userId;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: true,
                resource: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute status' });
        }

        // Decrypt dispute reason (try base64 decode, fallback to raw)
        let disputeReason = transaction.encryptedDisputeReason || '';
        if (disputeReason) {
            try {
                disputeReason = Buffer.from(disputeReason, 'base64').toString('utf-8');
            } catch {
                // Keep as-is
            }
        }

        const resource = transaction.resource;
        const analysisInput: AnalysisInput = {
            disputeReason,
            resourceTitle: resource?.title || 'Unknown Resource',
            resourceDescription: resource?.description || undefined,
            resourceType: (resource?.type || 'LINK') as any,
            resourceContent: resource?.imageData || resource?.url || undefined,
            merchantExplanation: (transaction as any).merchantExplanation || undefined
        };

        console.log(`Starting AI analysis for dispute: ${transactionId}`);
        const verdict = await analyzeDispute(analysisInput);
        console.log(`AI verdict for ${transactionId}:`, verdict);

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                aiDecision: verdict.isValid ? 'AI_VALID' : 'AI_INVALID',
                aiReasoning: verdict.reasoning,
                aiConfidence: verdict.confidence,
                aiAnalyzedAt: new Date()
            }
        });

        return res.json({
            success: true,
            verdict: {
                isValid: verdict.isValid,
                reasoning: verdict.reasoning,
                confidence: verdict.confidence
            },
            transactionId
        });

    } catch (error: any) {
        console.error('AI analyze error:', error);
        return res.status(500).json({ error: error.message || 'AI analysis failed' });
    }
};

/**
 * POST /api/disputes/:transactionId/merchant-explain
 * Submit merchant explanation and trigger re-analysis
 */
export const submitMerchantExplanation = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const { explanation } = req.body;
        const userId = (req as any).userId;

        if (!explanation || typeof explanation !== 'string') {
            return res.status(400).json({ error: 'Explanation is required' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: true,
                resource: true
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute' });
        }

        // Store merchant explanation
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { merchantExplanation: explanation }
        });

        // Re-run AI analysis with merchant explanation
        let disputeReason = transaction.encryptedDisputeReason || '';
        if (disputeReason) {
            try {
                disputeReason = Buffer.from(disputeReason, 'base64').toString('utf-8');
            } catch { }
        }

        const resource = transaction.resource;
        const analysisInput: AnalysisInput = {
            disputeReason,
            resourceTitle: resource?.title || 'Unknown Resource',
            resourceDescription: resource?.description || undefined,
            resourceType: (resource?.type || 'LINK') as any,
            resourceContent: resource?.imageData || resource?.url || undefined,
            merchantExplanation: explanation
        };

        console.log(`Re-analyzing dispute ${transactionId} with merchant explanation`);
        const verdict = await analyzeDispute(analysisInput);
        console.log(`Updated AI verdict for ${transactionId}:`, verdict);

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                aiDecision: verdict.isValid ? 'AI_VALID' : 'AI_INVALID',
                aiReasoning: verdict.reasoning,
                aiConfidence: verdict.confidence,
                aiAnalyzedAt: new Date()
            }
        });

        return res.json({
            success: true,
            verdict: {
                isValid: verdict.isValid,
                reasoning: verdict.reasoning,
                confidence: verdict.confidence
            },
            message: 'Dispute re-analyzed with your explanation'
        });

    } catch (error: any) {
        console.error('Merchant explain error:', error);
        return res.status(500).json({ error: error.message || 'Re-analysis failed' });
    }
};

/**
 * POST /api/disputes/:transactionId/resolve
 * Final resolution - approve refund or reject claim
 */
export const resolveAIDispute = async (req: Request, res: Response) => {
    try {
        const transactionId = req.params.transactionId as string;
        const { decision } = req.body; // 'APPROVE' (refund to agent) or 'REJECT' (pay merchant)
        const userId = (req as any).userId;

        if (!['APPROVE', 'REJECT'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be APPROVE or REJECT' });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: 'Transaction is not in dispute' });
        }

        // Perform on-chain settlement via EscrowMarketplace
        const escrowKey = transaction.paymentTransactionId;
        let onChainTxHash: string | null = null;

        if (escrowKey) {
            try {
                // APPROVE = refund agent (payMerchant=false), REJECT = pay merchant (payMerchant=true)
                const payMerchant = decision === 'REJECT';
                const result = await finalizeSettlementOnChain(escrowKey, payMerchant);
                onChainTxHash = result.txHash;
                console.log(`[Dispute] finalizeSettlement (${decision}) tx: ${onChainTxHash}`);
            } catch (err: any) {
                console.error(`[Dispute] finalizeSettlement failed: ${err.message}`);
            }
        }

        const finalStatus = decision === 'APPROVE' ? 'REFUNDED' : 'SETTLED';
        const updatedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: finalStatus }
        });

        return res.json({
            success: true,
            status: updatedTx.status,
            onChainTx: onChainTxHash,
            message: decision === 'APPROVE'
                ? 'Dispute approved. Refund sent to agent.'
                : 'Dispute rejected. Funds released to merchant.'
        });

    } catch (error: any) {
        console.error('Resolve dispute error:', error);
        return res.status(500).json({ error: error.message || 'Resolution failed' });
    }
};

/**
 * GET /api/disputes
 * Fetch all active disputes for the authenticated merchant
 */
export const getDisputes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const disputes = await prisma.transaction.findMany({
            where: {
                userId,
                status: 'REFUND_REQUESTED'
            },
            include: {
                resource: { select: { title: true, type: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedDisputes = disputes.map(tx => ({
            id: tx.id,
            transactionId: tx.id,
            receiptCode: tx.receiptCode,
            agentId: tx.agentId,
            amount: tx.amount,
            encryptedReason: tx.encryptedDisputeReason || '',
            resourceName: tx.resource?.title || 'Unknown Resource',
            createdAt: tx.createdAt.toISOString(),
            aiDecision: (tx as any).aiDecision || null,
            aiReasoning: (tx as any).aiReasoning || null,
            aiConfidence: (tx as any).aiConfidence || null,
            aiAnalyzedAt: (tx as any).aiAnalyzedAt?.toISOString() || null,
            merchantExplanation: (tx as any).merchantExplanation || null,
        }));

        return res.json({ disputes: formattedDisputes });

    } catch (error) {
        console.error('Disputes fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch disputes' });
    }
};
