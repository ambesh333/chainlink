import { Request, Response } from 'express';
import { prisma } from '../context';
import {
    verifyDeposit,
    createEscrowOnChain,
    finalizeSettlementOnChain,
    getEscrowContractAddress,
    getEscrowOnChain,
    EscrowState,
    generateEscrowKey,
    getLockedAmount,
} from '../clients/escrowClient';

const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';

/**
 * Payment header sent by the agent after they have called deposit(key) on-chain.
 *
 * Encode as: btoa(JSON.stringify({ version: 1, scheme: "chainlink-escrow", payload: { key, txHash, sender } }))
 */
interface EscrowPaymentHeader {
    version: number;
    scheme: 'chainlink-escrow';
    payload: {
        key: string;       // bytes32 escrow key (0x-prefixed hex)
        txHash: string;    // deposit() transaction hash
        sender: string;    // agent wallet address
    };
}

const parsePaymentHeader = (raw: string): EscrowPaymentHeader | null => {
    try {
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
};

/**
 * GET /api/gateway/resource/:resourceId
 *
 * x402 Gateway with on-chain escrow (EscrowMarketplace.sol).
 *
 * ── Without X-Payment header ──────────────────────────────────────────────────
 *   If X-Agent-Address header is present:
 *     1. Backend (facilitator) calls createEscrow(key, merchant, agent, 0x0, amount, holdDuration)
 *     2. Returns 402 with the escrow key so the agent can call deposit(key)
 *   Otherwise:
 *     Returns 402 with instructions only.
 *
 * ── With X-Payment header ────────────────────────────────────────────────────
 *   1. Parse key from header
 *   2. Read lockedForResource[key] on-chain to verify deposit >= price
 *   3. Deliver resource content
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const resourceId = req.params.resourceId as string;
        const paymentHeaderRaw = (req.header('X-Payment') || req.header('Authorization')) as string | undefined;
        const agentAddress = req.header('X-Agent-Address') || null;

        // 1. Fetch resource
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { user: true },
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        const priceWei = BigInt(Math.floor(resource.price * 1e18));

        const paymentRequirements = {
            x402Version: 1,
            scheme: 'chainlink-escrow',
            network: 'ethereum-sepolia',
            chainId: 11155111,
            escrowContract: ESCROW_CONTRACT_ADDRESS,
            merchantAddress: resource.user.walletAddress,
            amount: resource.price,
            amountWei: priceWei.toString(),
            resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            description: `Payment for: ${resource.title}`,
        };

        // 2. No X-Payment → return 402 (optionally create on-chain escrow)
        if (!paymentHeaderRaw) {
            let escrowCreated: { key: string; txHash: string } | null = null;

            // If agent provided their address and resource is paid, create the escrow on-chain
            if (agentAddress && resource.price > 0) {
                try {
                    const key = generateEscrowKey(resource.id, agentAddress);
                    const holdDurationSeconds = (resource.autoApprovalMinutes || 60) * 60;

                    const { txHash } = await createEscrowOnChain(
                        key,
                        resource.user.walletAddress,
                        agentAddress,
                        priceWei,
                        holdDurationSeconds
                    );

                    // Pre-create a pending transaction record to track this escrow
                    const receiptCode = `ESC-${Date.now().toString(36).toUpperCase()}`;
                    await prisma.transaction.create({
                        data: {
                            userId: resource.userId,
                            resourceId: resource.id,
                            agentId: agentAddress,
                            amount: resource.price,
                            network: resource.network,
                            token: resource.token,
                            status: 'PENDING',
                            receiptCode,
                            autoSettleAt: new Date(Date.now() + holdDurationSeconds * 1000),
                            expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                            paymentTransactionId: key,   // escrow key stored here
                        },
                    });

                    escrowCreated = { key, txHash };
                    console.log(`[Gateway] Created on-chain escrow key=${key} for resource=${resource.id}`);
                } catch (err: any) {
                    // Facilitator key not configured or RPC error — degrade gracefully
                    console.warn(`[Gateway] Could not create on-chain escrow: ${err.message}`);
                }
            }

            // Free resources — deliver directly
            if (resource.price === 0) {
                return res.json({
                    success: true,
                    free: true,
                    title: resource.title,
                    type: resource.type,
                    data: resource.url || resource.imageData,
                });
            }

            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements,
                ...(escrowCreated
                    ? {
                          escrow: {
                              key: escrowCreated.key,
                              contract: ESCROW_CONTRACT_ADDRESS,
                              createEscrowTx: escrowCreated.txHash,
                          },
                          instructions: {
                              step1: `Call deposit("${escrowCreated.key}") on contract ${ESCROW_CONTRACT_ADDRESS} and send ${resource.price} ETH`,
                              step2: 'Build X-Payment header: btoa(JSON.stringify({version:1,scheme:"chainlink-escrow",payload:{key,txHash,sender}}))',
                              step3: 'Retry this GET request with the X-Payment header',
                              step4: 'After receiving resource, call requestSettlement(key) on the contract',
                          },
                      }
                    : {
                          instructions: {
                              step0: 'Send X-Agent-Address header with your wallet address so the backend can create your escrow',
                              note: 'Without an agent address, you must create the escrow manually via the contract',
                          },
                      }),
            });
        }

        // 3. Parse X-Payment header
        const header = parsePaymentHeader(paymentHeaderRaw);

        if (!header || header.scheme !== 'chainlink-escrow' || !header.payload?.key) {
            return res.status(402).json({
                error: 'Invalid payment header. Expected scheme "chainlink-escrow" with payload.key (bytes32).',
                paymentRequirements,
            });
        }

        const escrowKey = header.payload.key;
        console.log(`[Gateway] Verifying deposit for escrow key=${escrowKey}, resource=${resource.title}`);

        // 4. Verify deposit on-chain via lockedForResource[key]
        const verification = await verifyDeposit(escrowKey, priceWei);

        if (!verification.isValid) {
            return res.status(402).json({
                error: 'Deposit not found or insufficient',
                details: verification.message,
                paymentRequirements,
            });
        }

        // 5. Find pre-created transaction record (if exists) or create a new one
        const receiptCode = `RCP-${Date.now().toString(36).toUpperCase()}`;
        const autoSettleAt = new Date(Date.now() + (resource.autoApprovalMinutes || 60) * 60 * 1000);

        let tx = await prisma.transaction.findFirst({
            where: {
                resourceId: resource.id,
                paymentTransactionId: escrowKey,
                status: 'PENDING',
            },
        });

        if (tx) {
            // Update existing record with actual payment header
            tx = await prisma.transaction.update({
                where: { id: tx.id },
                data: { paymentHeader: paymentHeaderRaw },
            });
        } else {
            // Create fresh record (agent skipped the pre-escrow step)
            tx = await prisma.transaction.create({
                data: {
                    userId: resource.userId,
                    resourceId: resource.id,
                    agentId: header.payload.sender || 'unknown',
                    amount: resource.price,
                    network: resource.network,
                    token: resource.token,
                    status: 'PENDING',
                    receiptCode,
                    autoSettleAt,
                    expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    paymentTransactionId: escrowKey,
                    paymentHeader: paymentHeaderRaw,
                },
            });
        }

        console.log(`[Gateway] Deposit verified. Delivering resource. tx=${tx.id}`);

        // 6. Deliver resource
        if (resource.type === 'IMAGE' && resource.imageData) {
            const base64Data = resource.imageData.replace(/^data:image\/\w+;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'X-Transaction-ID': tx.id,
                'X-Receipt-Code': tx.receiptCode,
                'X-Escrow-Key': escrowKey,
                'X-Escrow-Contract': ESCROW_CONTRACT_ADDRESS,
                'X-Auto-Settle-At': autoSettleAt.toISOString(),
            });
            return res.end(img);
        }

        return res.json({
            success: true,
            transactionId: tx.id,
            receiptCode: tx.receiptCode,
            escrow: {
                key: escrowKey,
                contractAddress: ESCROW_CONTRACT_ADDRESS,
                autoSettleAt: autoSettleAt.toISOString(),
                note: 'Call requestSettlement(key) on the contract when satisfied, then POST /api/gateway/settle',
            },
            title: resource.title,
            type: resource.type,
            data: resource.url || resource.imageData,
        });
    } catch (error) {
        console.error('[Gateway] Access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/gateway/settle
 *
 * Agent notifies that they've called requestSettlement(key) on-chain.
 * On-chain finalization is handled by the CRE settlement-verifier workflow.
 * This endpoint only updates the DB if the CRE has already settled it.
 *
 * Body: { transactionId, status: "SETTLED" | "DISPUTED", reason? }
 */
export const settleTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId, status, reason } = req.body;

        if (!transactionId || !['SETTLED', 'DISPUTED'].includes(status)) {
            return res.status(400).json({
                error: 'Provide transactionId and status (SETTLED or DISPUTED).',
                note: 'Call requestSettlement(key) or raiseDispute(key) on the contract first.',
            });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { resource: true },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ error: `Transaction already finalized: ${transaction.status}` });
        }

        const escrowKey = transaction.paymentTransactionId;

        if (status === 'SETTLED') {
            // On-chain finalization is now handled by the CRE settlement-verifier workflow.
            // Here we only check if CRE has already settled it on-chain, and sync DB accordingly.
            let onChainSettled = false;
            if (escrowKey) {
                try {
                    const escrow = await getEscrowOnChain(escrowKey);
                    if (escrow.state === EscrowState.Settled) {
                        console.log(`[Gateway] Escrow already settled on-chain by CRE`);
                        onChainSettled = true;
                    }
                } catch { /* ignore */ }
            }

            if (onChainSettled) {
                const updatedTx = await prisma.transaction.update({
                    where: { id: transactionId },
                    data: { status: 'SETTLED' },
                });

                return res.json({
                    success: true,
                    status: updatedTx.status,
                    message: 'Funds released to merchant on-chain via CRE.',
                });
            } else {
                return res.json({
                    success: true,
                    status: 'PENDING',
                    message: 'Settlement requested. CRE workflow will verify delivery and finalize on-chain.',
                });
            }
        } else {
            // DISPUTED: record dispute reason, keep status as REFUND_REQUESTED
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REFUND_REQUESTED',
                    encryptedDisputeReason: reason || null,
                },
            });

            return res.json({
                success: true,
                status: updatedTx.status,
                message: 'Dispute recorded. Awaiting AI resolution.',
            });
        }
    } catch (error) {
        console.error('[Gateway] Settlement error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/gateway/resolve-dispute
 *
 * Merchant resolves a disputed transaction (auth required).
 * If the dispute should be rejected (merchant wins), facilitator pays merchant on-chain.
 * If refunded (agent wins), the DISPUTED→finalizeSettlement(key, false) path should have
 * already been triggered by the agent's settle call above.
 */
export const resolveDispute = async (req: Request, res: Response) => {
    try {
        const { transactionId, decision } = req.body;
        const userId = (req as any).userId;

        if (!transactionId || !['REFUND', 'REJECT'].includes(decision)) {
            return res.status(400).json({
                error: 'Provide transactionId and decision (REFUND or REJECT).',
            });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true },
        });

        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
        if (transaction.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: `Transaction is not in dispute: ${transaction.status}` });
        }

        const escrowKey = transaction.paymentTransactionId;
        let onChainTxHash: string | null = null;

        if (decision === 'REJECT' && escrowKey) {
            // Merchant wins dispute → pay merchant
            try {
                const result = await finalizeSettlementOnChain(escrowKey, true);
                onChainTxHash = result.txHash;
            } catch (err: any) {
                console.error(`[Gateway] finalizeSettlement (dispute rejected) failed: ${err.message}`);
            }
        }

        const finalStatus = decision === 'REFUND' ? 'REFUNDED' : 'SETTLED';
        const updatedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: finalStatus },
        });

        return res.json({
            success: true,
            status: updatedTx.status,
            onChainTx: onChainTxHash,
            message: decision === 'REFUND'
                ? 'Dispute resolved: agent refunded.'
                : 'Dispute rejected: funds released to merchant.',
        });
    } catch (error) {
        console.error('[Gateway] Dispute resolution error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/gateway/escrow/:escrowId
 *
 * Check how much ETH is currently locked for a given escrow key.
 * Route param is the bytes32 key (hex string).
 */
export const getEscrowStatus = async (req: Request, res: Response) => {
    try {
        const key = req.params.escrowId as string;   // param name kept for route compatibility

        if (!key || !key.startsWith('0x') || key.length !== 66) {
            return res.status(400).json({
                error: 'Invalid escrow key. Provide a 0x-prefixed bytes32 hex string (66 chars).',
            });
        }

        const locked = await getLockedAmount(key);

        return res.json({
            key,
            contractAddress: getEscrowContractAddress(),
            lockedWei: locked.toString(),
            lockedETH: Number(locked) / 1e18,
            isFunded: locked > 0n,
        });
    } catch (error: any) {
        console.error('[Gateway] Escrow status error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch escrow status' });
    }
};
