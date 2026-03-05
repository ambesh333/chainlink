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
import { sendTelegramMessage, interpolateTemplate } from '../services/telegramService';
import { executePrivateSettlement } from '../services/privateSettlementService';

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
 * POST /api/cre/dispute-resolved
 *
 * Called by the CRE dispute-resolver workflow after finalizing dispute on-chain.
 * Updates DB: REFUND_REQUESTED → SETTLED (merchant wins) or REFUNDED (agent wins).
 */
router.post('/dispute-resolved', async (req, res) => {
    try {
        const { escrowKey, txHash, payMerchant } = req.body;

        if (!escrowKey || typeof payMerchant !== 'boolean') {
            return res.status(400).json({ error: 'escrowKey and payMerchant (boolean) are required' });
        }

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.json({
                success: true,
                message: `Transaction already in state: ${transaction.status}`,
            });
        }

        const finalStatus = payMerchant ? 'SETTLED' : 'REFUNDED';
        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: finalStatus,
                ...(txHash ? { settlementTxHash: txHash } : {}),
            },
        });

        console.log(`[CRE] Dispute resolved for escrow=${escrowKey}, payMerchant=${payMerchant}, status=${finalStatus}`);

        // If merchant wins, trigger private token transfer (idempotent)
        let privateTransferTxId: string | null = null;
        if (payMerchant) {
            try {
                privateTransferTxId = await executePrivateSettlement(escrowKey);
            } catch (err: any) {
                console.warn(`[CRE] Private settlement after dispute failed (non-fatal): ${err.message}`);
            }
        }

        return res.json({
            success: true,
            transactionId: updated.id,
            status: updated.status,
            privateTransferTxId,
        });
    } catch (error) {
        console.error('[CRE] Dispute resolved error:', error);
        return res.status(500).json({ error: 'Failed to update dispute resolution' });
    }
});

/**
 * POST /api/cre/settlement-complete
 *
 * Called by the CRE settlement-verifier workflow after successfully finalizing
 * settlement on-chain. Updates the DB from SETTLEMENT_REQUESTED → SETTLED.
 */
router.post('/settlement-complete', async (req, res) => {
    try {
        const { escrowKey, txHash } = req.body;

        if (!escrowKey) {
            return res.status(400).json({ error: 'escrowKey is required' });
        }

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        if (transaction.status !== 'SETTLEMENT_REQUESTED' && transaction.status !== 'PENDING') {
            return res.json({
                success: true,
                message: `Transaction already in state: ${transaction.status}`,
            });
        }

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: 'SETTLED',
                ...(txHash ? { settlementTxHash: txHash } : {}),
            },
        });

        console.log(`[CRE] Settlement complete for escrow=${escrowKey}, txHash=${txHash || 'n/a'}`);

        // Auto-trigger private token transfer (idempotent — safe to call multiple times)
        let privateTransferTxId: string | null = null;
        try {
            privateTransferTxId = await executePrivateSettlement(escrowKey);
        } catch (err: any) {
            console.warn(`[CRE] Private settlement failed (non-fatal): ${err.message}`);
        }

        return res.json({
            success: true,
            transactionId: updated.id,
            status: updated.status,
            privateTransferTxId,
        });
    } catch (error) {
        console.error('[CRE] Settlement complete error:', error);
        return res.status(500).json({ error: 'Failed to update settlement status' });
    }
});

/**
 * POST /api/cre/private-settle
 *
 * Triggers a private token transfer for a settled escrow.
 * Called by the CRE settlement-verifier workflow after on-chain settlement.
 * Idempotent: returns existing txId if already completed.
 *
 * Body: { escrowKey }
 */
router.post('/private-settle', async (req, res) => {
    try {
        const { escrowKey } = req.body;

        if (!escrowKey) {
            return res.status(400).json({ error: 'escrowKey is required' });
        }

        const txId = await executePrivateSettlement(escrowKey);

        return res.json({
            success: true,
            escrowKey,
            privateTransferTxId: txId,
            message: txId
                ? `Private transfer complete: ${txId}`
                : 'Private transfer not applicable (missing shielded address or config)',
        });
    } catch (error: any) {
        console.error('[CRE] Private settle error:', error);
        return res.status(500).json({ error: 'Private settlement failed', message: error.message });
    }
});

/**
 * GET /api/cre/verify-private-transfer/:escrowKey
 *
 * Verifies that a private token transfer was executed for a given escrow.
 * Returns the privateTransferTxId if it exists.
 */
router.get('/verify-private-transfer/:escrowKey', async (req, res) => {
    try {
        const { escrowKey } = req.params;

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            select: { id: true, status: true, privateTransferTxId: true },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        return res.json({
            escrowKey,
            transactionId: transaction.id,
            status: transaction.status,
            privateTransferTxId: transaction.privateTransferTxId || null,
            verified: !!transaction.privateTransferTxId,
        });
    } catch (error) {
        console.error('[CRE] Verify private transfer error:', error);
        return res.status(500).json({ error: 'Failed to verify private transfer' });
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
        const isPending = transaction.status === 'PENDING' || transaction.status === 'SETTLEMENT_REQUESTED';

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
 * POST /api/cre/expiry-refunded
 *
 * Called by the CRE expiry-watchdog workflow after refunding an expired escrow.
 * Updates DB: PENDING → REFUNDED. No private transfer needed (agent gets on-chain refund).
 */
router.post('/expiry-refunded', async (req, res) => {
    try {
        const { escrowKey, txHash } = req.body;

        if (!escrowKey) {
            return res.status(400).json({ error: 'escrowKey is required' });
        }

        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: escrowKey },
            orderBy: { createdAt: 'desc' },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'No transaction found for this escrow key' });
        }

        if (transaction.status === 'REFUNDED' || transaction.status === 'SETTLED') {
            return res.json({
                success: true,
                message: `Transaction already in state: ${transaction.status}`,
            });
        }

        const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: 'REFUNDED',
                ...(txHash ? { settlementTxHash: txHash } : {}),
            },
        });

        console.log(`[CRE] Expiry refund for escrow=${escrowKey}, txHash=${txHash || 'n/a'}`);

        return res.json({
            success: true,
            transactionId: updated.id,
            status: updated.status,
        });
    } catch (error) {
        console.error('[CRE] Expiry refunded error:', error);
        return res.status(500).json({ error: 'Failed to update expiry refund status' });
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

// ============= Workflow Engine Endpoints =============

/**
 * GET /api/cre/active-workflows
 *
 * Returns all ACTIVE workflows for the CRE workflow engine to execute.
 */
router.get('/active-workflows', async (req, res) => {
    try {
        const workflows = await prisma.workflow.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                definition: true,
                schedule: true,
                userId: true,
                lastRunAt: true,
                runCount: true,
            },
        });

        return res.json({ workflows, count: workflows.length });
    } catch (error) {
        console.error('[CRE] Active workflows error:', error);
        return res.status(500).json({ error: 'Failed to fetch active workflows' });
    }
});

/**
 * GET /api/cre/resource-stats/:resourceId
 *
 * Returns access count, earnings, and current price for a resource.
 * Used by the CRE workflow engine for data fetching blocks.
 */
router.get('/resource-stats/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;

        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            select: {
                id: true,
                title: true,
                price: true,
                isActive: true,
                type: true,
            },
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const transactions = await prisma.transaction.findMany({
            where: { resourceId },
            select: { status: true, amount: true },
        });

        const accessCount = transactions.length;
        const settledCount = transactions.filter(t => t.status === 'SETTLED').length;
        const totalEarnings = transactions
            .filter(t => t.status === 'SETTLED')
            .reduce((sum, t) => sum + t.amount, 0);
        const pendingCount = transactions.filter(t =>
            t.status === 'PENDING' || t.status === 'SETTLEMENT_REQUESTED'
        ).length;

        return res.json({
            resourceId: resource.id,
            title: resource.title,
            currentPrice: resource.price,
            isActive: resource.isActive,
            type: resource.type,
            accessCount,
            settledCount,
            pendingCount,
            totalEarnings,
        });
    } catch (error) {
        console.error('[CRE] Resource stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch resource stats' });
    }
});

/**
 * POST /api/cre/workflow-action
 *
 * Executes an action on behalf of the workflow engine.
 * Actions: update_price, toggle_resource
 */
router.post('/workflow-action', async (req, res) => {
    try {
        const { action, resourceId, value } = req.body;

        if (!action || !resourceId) {
            return res.status(400).json({ error: 'action and resourceId are required' });
        }

        const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        let result: any;

        switch (action) {
            case 'update_price': {
                if (typeof value !== 'number' || value < 0) {
                    return res.status(400).json({ error: 'value must be a non-negative number' });
                }
                const oldPrice = resource.price;
                const updated = await prisma.resource.update({
                    where: { id: resourceId },
                    data: { price: value },
                });
                result = {
                    action: 'update_price',
                    resourceId,
                    oldPrice,
                    newPrice: updated.price,
                    title: updated.title,
                };
                console.log(`[CRE] Price updated: ${updated.title} ${oldPrice} → ${updated.price}`);
                break;
            }

            case 'toggle_resource': {
                const updated = await prisma.resource.update({
                    where: { id: resourceId },
                    data: { isActive: typeof value === 'boolean' ? value : !resource.isActive },
                });
                result = {
                    action: 'toggle_resource',
                    resourceId,
                    isActive: updated.isActive,
                    title: updated.title,
                };
                console.log(`[CRE] Resource toggled: ${updated.title} → ${updated.isActive ? 'active' : 'inactive'}`);
                break;
            }

            case 'telegram_notify': {
                const { chatId, message, botToken: blockBotToken, context: msgContext } = req.body;
                if (!chatId) {
                    return res.status(400).json({ error: 'chatId is required for telegram_notify' });
                }
                const token = blockBotToken || process.env.TELEGRAM_BOT_TOKEN;
                if (!token) {
                    return res.status(400).json({ error: 'No Telegram bot token provided (set TELEGRAM_BOT_TOKEN or pass botToken)' });
                }
                const interpolated = interpolateTemplate(message || '', msgContext || {});
                const telegramResult = await sendTelegramMessage(token, chatId, interpolated);
                result = {
                    action: 'telegram_notify',
                    chatId,
                    messageSent: telegramResult.ok,
                    description: telegramResult.description,
                };
                console.log(`[CRE] Telegram notify: chatId=${chatId}, ok=${telegramResult.ok}`);
                break;
            }

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        return res.json({ success: true, result });
    } catch (error) {
        console.error('[CRE] Workflow action error:', error);
        return res.status(500).json({ error: 'Failed to execute workflow action' });
    }
});

/**
 * POST /api/cre/workflow-execution
 *
 * Logs workflow execution result from the CRE engine.
 */
router.post('/workflow-execution', async (req, res) => {
    try {
        const { workflowId, status, log, result, txHash } = req.body;

        if (!workflowId || !status) {
            return res.status(400).json({ error: 'workflowId and status are required' });
        }

        const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Create execution record
        const execution = await prisma.workflowExecution.create({
            data: {
                workflowId,
                status,
                log: log || null,
                result: result || null,
                txHash: txHash || null,
                completedAt: status !== 'running' ? new Date() : null,
            },
        });

        // Update workflow metadata
        await prisma.workflow.update({
            where: { id: workflowId },
            data: {
                lastRunAt: new Date(),
                lastRunLog: log || null,
                runCount: { increment: 1 },
            },
        });

        console.log(`[CRE] Workflow execution logged: ${workflowId} → ${status}`);

        return res.json({ success: true, executionId: execution.id });
    } catch (error) {
        console.error('[CRE] Workflow execution error:', error);
        return res.status(500).json({ error: 'Failed to log workflow execution' });
    }
});

/**
 * POST /api/cre/ai-price-analysis
 *
 * AI-powered price analysis for a resource based on demand metrics.
 * Used by the CRE workflow engine for AI analysis blocks.
 */
router.post('/ai-price-analysis', async (req, res) => {
    try {
        const { resourceId, currentPrice, accessCount, totalEarnings, settledCount } = req.body;

        if (!resourceId) {
            return res.status(400).json({ error: 'resourceId is required' });
        }

        // Lazy import to avoid circular dependency issues
        const { analyzePricing } = await import('../services/aiPricingService');

        const analysis = await analyzePricing({
            resourceId,
            currentPrice: currentPrice || 0,
            accessCount: accessCount || 0,
            totalEarnings: totalEarnings || 0,
            settledCount: settledCount || 0,
        });

        return res.json(analysis);
    } catch (error: any) {
        console.error('[CRE] AI price analysis error:', error);
        return res.status(500).json({ error: 'AI analysis failed', message: error.message });
    }
});

export default router;
