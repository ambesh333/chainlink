/**
 * CRE Webhook Routes
 *
 * Public endpoints consumed by CRE workflows for fetching dispute context
 * and verifying resource delivery. No auth required — CRE nodes need direct access.
 */

import { Router } from 'express';
import { prisma } from '../context';
import { getEscrowOnChain, EscrowState } from '../clients/escrowClient';
import { analyzeDispute, AnalysisInput } from '../services/aiDisputeService';

const router = Router();

/**
 * GET /api/cre/dispute-context/:escrowKey
 *
 * Returns dispute context for a given escrow key.
 * Used by the CRE dispute-resolver workflow to feed AI analysis.
 */
router.get('/dispute-context/:escrowKey', async (req, res) => {
    try {
        const { escrowKey } = req.params;

        // Find the transaction by escrow key
        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            include: {
                resource: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        type: true,
                        url: true,
                        price: true,
                        imageData: true,
                    }
                },
                user: {
                    select: { walletAddress: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        const disputeReason = transaction.encryptedDisputeReason || 'No reason provided';

        return res.json({
            escrowKey,
            transactionId: transaction.id,
            status: transaction.status,
            amount: transaction.amount,
            agentId: transaction.agentId,
            merchantAddress: transaction.user?.walletAddress || null,
            disputeReason,
            merchantExplanation: (transaction as any).merchantExplanation || null,
            title: transaction.resource?.title || 'Unknown Resource',
            description: transaction.resource?.description || null,
            type: transaction.resource?.type || 'UNKNOWN',
            resourceUrl: transaction.resource?.url || null,
            price: transaction.resource?.price || 0,
            // Actual resource content for AI vision analysis
            resourceContent: transaction.resource?.type === 'IMAGE'
                ? (transaction.resource?.imageData || null)
                : (transaction.resource?.url || null),
            // AI analysis (if any prior analysis exists)
            aiDecision: (transaction as any).aiDecision || null,
            aiReasoning: (transaction as any).aiReasoning || null,
        });
    } catch (error) {
        console.error('[CRE] Dispute context error:', error);
        return res.status(500).json({ error: 'Failed to fetch dispute context' });
    }
});

/**
 * GET /api/cre/analyze-dispute/:escrowKey
 *
 * Fetches dispute context AND runs AI analysis for the CRE workflow.
 * Returns { payMerchant, reasoning, confidence } that the CRE workflow expects.
 */
router.get('/analyze-dispute/:escrowKey', async (req, res) => {
    try {
        const { escrowKey } = req.params;

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            include: {
                resource: {
                    select: {
                        title: true,
                        description: true,
                        type: true,
                        url: true,
                        imageData: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        const disputeReason = transaction.encryptedDisputeReason || 'No reason provided';

        const resource = transaction.resource;
        const analysisInput: AnalysisInput = {
            disputeReason,
            resourceTitle: resource?.title || 'Unknown Resource',
            resourceDescription: resource?.description || undefined,
            resourceType: (resource?.type || 'LINK') as any,
            resourceContent: resource?.imageData || resource?.url || undefined,
            merchantExplanation: (transaction as any).merchantExplanation || undefined,
        };

        console.log(`[CRE] Running AI analysis for escrow: ${escrowKey}`);
        const verdict = await analyzeDispute(analysisInput);
        console.log(`[CRE] AI verdict for ${escrowKey}:`, verdict);

        // Store the verdict in the database
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                aiDecision: verdict.isValid ? 'AI_VALID' : 'AI_INVALID',
                aiReasoning: verdict.reasoning,
                aiConfidence: verdict.confidence,
                aiAnalyzedAt: new Date(),
            }
        });

        // isValid=true means dispute is valid → refund agent → payMerchant=false
        return res.json({
            payMerchant: !verdict.isValid,
            reasoning: verdict.reasoning,
            confidence: verdict.confidence,
        });

    } catch (error: any) {
        console.error('[CRE] Analyze dispute error:', error);
        return res.status(500).json({
            error: 'AI analysis failed',
            message: error.message,
        });
    }
});

/**
 * GET /api/cre/verify-delivery/:escrowKey
 *
 * Verifies whether a resource was delivered for a given escrow.
 * Used by the CRE settlement-verifier workflow.
 *
 * Checks: transaction exists, has payment header (agent accessed resource),
 * and on-chain state is SettlementRequested.
 */
router.get('/verify-delivery/:escrowKey', async (req, res) => {
    try {
        const { escrowKey } = req.params;

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            include: { resource: { select: { title: true } } },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.json({
                delivered: false,
                message: 'No transaction found for this escrow key',
            });
        }

        // A resource is considered delivered if the agent accessed it (has payment header)
        const hasPaymentHeader = !!transaction.paymentHeader;
        const isPending = transaction.status === 'PENDING';

        // Optional: verify on-chain state
        let onChainVerified = false;
        try {
            const escrow = await getEscrowOnChain(escrowKey);
            onChainVerified = escrow.state === EscrowState.SettlementRequested;
        } catch {
            // If on-chain check fails, rely on DB state
        }

        const delivered = hasPaymentHeader && (isPending || onChainVerified);

        return res.json({
            delivered,
            escrowKey,
            transactionId: transaction.id,
            resourceTitle: transaction.resource?.title || 'Unknown',
            message: delivered
                ? 'Resource delivery confirmed'
                : 'Delivery not confirmed — agent may not have accessed the resource',
        });
    } catch (error) {
        console.error('[CRE] Verify delivery error:', error);
        return res.status(500).json({ error: 'Failed to verify delivery' });
    }
});

/**
 * GET /api/cre/resolution/:escrowKey
 *
 * Check the CRE dispute resolution status by reading the on-chain DisputeConsumer.
 * Used by the frontend to display CRE workflow progress.
 */
router.get('/resolution/:escrowKey', async (req, res) => {
    try {
        const { escrowKey } = req.params;

        // Check on-chain escrow state
        let escrowState = null;
        try {
            const escrow = await getEscrowOnChain(escrowKey);
            escrowState = escrow.state;
        } catch {
            return res.status(404).json({ error: 'Escrow not found on-chain' });
        }

        // Map state to human-readable status
        const stateMap: Record<number, string> = {
            0: 'Created',
            1: 'Funded',
            2: 'SettlementRequested',
            3: 'Disputed',
            4: 'Settled',
            5: 'Released',
            6: 'Cancelled',
        };

        const isResolved = escrowState === EscrowState.Settled || escrowState === EscrowState.Released;

        return res.json({
            escrowKey,
            onChainState: stateMap[escrowState] || 'Unknown',
            stateCode: escrowState,
            isResolved,
            resolvedBy: isResolved ? 'CRE Workflow' : null,
        });
    } catch (error) {
        console.error('[CRE] Resolution status error:', error);
        return res.status(500).json({ error: 'Failed to fetch resolution status' });
    }
});

/**
 * GET /api/cre/expired-escrows
 *
 * Returns a list of escrow keys that have expired on-chain but are still
 * in an active state (Funded or SettlementRequested). Used by the CRE
 * expiry-watchdog workflow to auto-refund agents.
 */
router.get('/expired-escrows', async (req, res) => {
    try {
        // Find all PENDING transactions with escrow keys
        const pendingTxns = await prisma.transaction.findMany({
            where: {
                status: 'PENDING',
                paymentTransactionId: { not: null },
            },
            select: {
                id: true,
                paymentTransactionId: true,
                agentId: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 20, // Limit to avoid overloading
        });

        if (pendingTxns.length === 0) {
            return res.json({ expired: [], count: 0 });
        }

        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        const expired: { escrowKey: string; transactionId: string; agentId: string }[] = [];

        for (const tx of pendingTxns) {
            const escrowKey = tx.paymentTransactionId!;
            try {
                const escrow = await getEscrowOnChain(escrowKey);

                // Only consider active states that can expire
                const isActive =
                    escrow.state === EscrowState.Funded ||
                    escrow.state === EscrowState.SettlementRequested;

                if (isActive && escrow.expiry <= nowSeconds) {
                    expired.push({
                        escrowKey,
                        transactionId: tx.id,
                        agentId: tx.agentId,
                    });
                }
            } catch {
                // Skip escrows that can't be read on-chain
            }
        }

        console.log(`[CRE] Expired escrows check: ${expired.length}/${pendingTxns.length} expired`);

        return res.json({
            expired,
            count: expired.length,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[CRE] Expired escrows error:', error);
        return res.status(500).json({ error: 'Failed to check expired escrows' });
    }
});

export default router;
