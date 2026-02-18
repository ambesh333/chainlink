import { Request, Response } from 'express';
import { prisma } from '../context';
import { privateTransfer, getTransactions } from '../clients/privateTokenClient';
import { verifyDeposit, getEscrowDetails, getEscrowContractAddress, getStatusLabel, EscrowStatus } from '../clients/escrowClient';

const FACILITATOR_SHIELDED_ADDRESS = process.env.FACILITATOR_SHIELDED_ADDRESS || '';
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';

/**
 * Payment header format for x402 with on-chain escrow
 */
interface EscrowPaymentHeader {
    version: number;
    scheme: 'chainlink-escrow';
    payload: {
        escrowId: number;       // On-chain escrow ID from deposit()
        txHash: string;         // Deposit transaction hash
        sender: string;         // Agent address
    };
}

const parsePaymentHeader = (raw: string): EscrowPaymentHeader | null => {
    try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        return JSON.parse(decoded);
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
 * x402 Gateway with on-chain escrow.
 *
 * Without X-Payment header:
 *   Returns 402 with escrow contract address + payment instructions
 *
 * With X-Payment header (contains escrowId):
 *   Verifies on-chain deposit → creates DB record → delivers resource
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const resourceId = req.params.resourceId as string;
        const paymentHeaderRaw = (req.header('X-Payment') || req.header('Authorization')) as string | undefined;

        // 1. Fetch resource details
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { user: true }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // 2. Build payment requirements
        const priceWei = BigInt(Math.floor(resource.price * 1e18));

        const paymentRequirements = {
            x402Version: 1,
            scheme: 'chainlink-escrow',
            network: 'ethereum-sepolia',
            escrowContract: ESCROW_CONTRACT_ADDRESS,
            payTo: FACILITATOR_SHIELDED_ADDRESS,     // Shielded — never exposes real wallet
            maxAmountRequired: resource.price.toString(),
            maxAmountRequiredWei: priceWei.toString(),
            resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            description: `Payment for ${resource.title}`,
            mimeType: resource.type === 'IMAGE' ? 'image/png' : 'application/json',
            maxTimeoutSeconds: 3600,
            extra: {
                merchantAddress: resource.user.walletAddress,
                resourceId: resource.id,
                chainId: 11155111,
                privacyFeatures: ['shielded-address', 'on-chain-escrow', 'chainlink-automation'],
                complianceEngine: 'chainlink-ace',
            }
        };

        // 3. No payment header => return 402
        if (!paymentHeaderRaw) {
            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements,
                instructions: {
                    step1: `Call deposit("${resource.id}", "${resource.user.walletAddress}") on contract ${ESCROW_CONTRACT_ADDRESS} with ${resource.price} ETH`,
                    step2: 'Encode {version:1, scheme:"chainlink-escrow", payload:{escrowId, txHash, sender}} as base64',
                    step3: 'Retry this GET request with X-Payment header containing the base64 string',
                    step4: 'After receiving the resource, call settle(escrowId) on the contract to release funds, or dispute(escrowId, reason) to freeze',
                    contractABI: 'See /api/gateway/abi for the contract ABI',
                    chainlinkAutomation: 'If you do nothing, Chainlink Automation auto-settles after the deadline',
                }
            });
        }

        // 4. Parse payment header
        const header = parsePaymentHeader(paymentHeaderRaw);

        if (!header || header.scheme !== 'chainlink-escrow' || header.payload?.escrowId === undefined) {
            return res.status(402).json({
                error: 'Invalid payment header. Use scheme "chainlink-escrow" with escrowId.',
                paymentRequirements
            });
        }

        console.log(`[Gateway] Verifying on-chain escrow #${header.payload.escrowId} for: ${resource.title}`);

        // 5. Verify on-chain deposit
        const verification = await verifyDeposit(
            header.payload.escrowId,
            resource.id,
            priceWei
        );

        if (!verification.isValid) {
            return res.status(402).json({
                error: 'Deposit verification failed',
                details: verification.message,
                paymentRequirements
            });
        }

        // 6. Create DB record linking on-chain escrow to our system
        const receiptCode = `RCP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const autoSettleAt = verification.escrow
            ? new Date(verification.escrow.deadline * 1000)
            : new Date(Date.now() + (resource.autoApprovalMinutes || 60) * 60 * 1000);

        const tx = await prisma.transaction.create({
            data: {
                userId: resource.userId,
                resourceId: resource.id,
                agentId: header.payload.sender || verification.escrow?.agent || 'unknown',
                amount: resource.price,
                network: resource.network,
                token: resource.token,
                status: 'PENDING',
                receiptCode: receiptCode,
                autoSettleAt: autoSettleAt,
                expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                paymentTransactionId: header.payload.txHash || null,
                paymentHeader: paymentHeaderRaw,
            }
        });

        console.log(`[Gateway] Escrow verified on-chain. DB record: ${tx.id}, receipt: ${tx.receiptCode}`);

        // 7. Deliver resource
        if (resource.type === 'IMAGE' && resource.imageData) {
            const base64Data = resource.imageData.replace(/^data:image\/\w+;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'X-Transaction-ID': tx.id,
                'X-Receipt-Code': tx.receiptCode,
                'X-Escrow-Id': header.payload.escrowId.toString(),
                'X-Escrow-Contract': ESCROW_CONTRACT_ADDRESS,
                'X-Auto-Settle-At': autoSettleAt.toISOString(),
                'X-Escrow-Status': 'PENDING',
            });
            return res.end(img);
        }

        return res.json({
            success: true,
            transactionId: tx.id,
            receiptCode: tx.receiptCode,
            escrow: {
                escrowId: header.payload.escrowId,
                contractAddress: ESCROW_CONTRACT_ADDRESS,
                status: 'PENDING',
                autoSettleAt: autoSettleAt.toISOString(),
                chainlinkAutomation: 'Auto-settles if agent takes no action by deadline',
            },
            privacy: {
                features: ['shielded-address', 'on-chain-escrow', 'chainlink-automation'],
                compliance: 'chainlink-ace',
            },
            settlement: {
                toSettle: `Call settle(${header.payload.escrowId}) on ${ESCROW_CONTRACT_ADDRESS}`,
                toDispute: `Call dispute(${header.payload.escrowId}, "reason") on ${ESCROW_CONTRACT_ADDRESS}`,
            },
            title: resource.title,
            type: resource.type,
            data: resource.url || resource.imageData
        });

    } catch (error) {
        console.error('[Gateway] Access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/gateway/settle
 *
 * Agent notifies the backend that they've settled on-chain.
 * The backend verifies the on-chain state and updates the DB record.
 */
export const settleTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId, escrowId, status, reason } = req.body;

        if (!transactionId || !['SETTLED', 'DISPUTED'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid settlement request. Provide transactionId and status (SETTLED or DISPUTED).',
                note: 'Settlement happens on-chain. Call settle(escrowId) or dispute(escrowId, reason) on the escrow contract first.'
            });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true, resource: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ error: `Transaction already finalized: ${transaction.status}` });
        }

        console.log(`[Gateway] Settlement notification: status=${status}, tx=${transactionId}`);

        // If escrowId provided, verify on-chain state
        if (escrowId !== undefined) {
            try {
                const onChainEscrow = await getEscrowDetails(escrowId);
                const onChainStatus = getStatusLabel(onChainEscrow.status);
                console.log(`[Gateway] On-chain escrow #${escrowId} status: ${onChainStatus}`);

                // Map on-chain status to DB status
                if (onChainEscrow.status === EscrowStatus.SETTLED || onChainEscrow.status === EscrowStatus.AUTO_SETTLED) {
                    const updatedTx = await prisma.transaction.update({
                        where: { id: transactionId },
                        data: { status: 'SETTLED' }
                    });
                    return res.json({
                        success: true,
                        status: updatedTx.status,
                        onChainStatus: onChainStatus,
                        message: onChainEscrow.status === EscrowStatus.AUTO_SETTLED
                            ? 'Auto-settled by Chainlink Automation'
                            : 'Funds released to merchant on-chain'
                    });
                }

                if (onChainEscrow.status === EscrowStatus.DISPUTED) {
                    const updatedTx = await prisma.transaction.update({
                        where: { id: transactionId },
                        data: {
                            status: 'REFUND_REQUESTED',
                            encryptedDisputeReason: onChainEscrow.disputeReason || reason || null
                        }
                    });
                    return res.json({
                        success: true,
                        status: updatedTx.status,
                        onChainStatus: onChainStatus,
                        message: 'Dispute recorded on-chain. Awaiting resolution.'
                    });
                }

                if (onChainEscrow.status === EscrowStatus.REFUNDED) {
                    const updatedTx = await prisma.transaction.update({
                        where: { id: transactionId },
                        data: { status: 'REFUNDED' }
                    });
                    return res.json({
                        success: true,
                        status: updatedTx.status,
                        onChainStatus: onChainStatus,
                        message: 'Funds refunded to agent on-chain.'
                    });
                }
            } catch (err: any) {
                console.warn(`[Gateway] Could not verify on-chain state: ${err.message}`);
            }
        }

        // Fallback: trust the agent's self-report if on-chain check fails/unavailable
        if (status === 'SETTLED') {
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'SETTLED' }
            });
            return res.json({
                success: true,
                status: updatedTx.status,
                message: 'Settlement recorded. Verify on-chain for confirmation.'
            });
        } else {
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REFUND_REQUESTED',
                    encryptedDisputeReason: reason || null
                }
            });
            return res.json({
                success: true,
                status: updatedTx.status,
                message: 'Dispute recorded. Call dispute() on the escrow contract to freeze funds on-chain.'
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
 * Merchant resolves a disputed transaction (requires auth).
 * Should call resolveDispute(escrowId, refund) on-chain first, then notify backend.
 */
export const resolveDispute = async (req: Request, res: Response) => {
    try {
        const { transactionId, escrowId, decision } = req.body;
        const userId = (req as any).userId;

        if (!transactionId || !['REFUND', 'REJECT'].includes(decision)) {
            return res.status(400).json({
                error: 'Invalid resolve request. Provide transactionId and decision (REFUND or REJECT).',
                note: 'Call resolveDispute(escrowId, true/false) on the escrow contract first.'
            });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized: you do not own this transaction' });
        }

        if (transaction.status !== 'REFUND_REQUESTED') {
            return res.status(400).json({ error: `Transaction is not in dispute: ${transaction.status}` });
        }

        console.log(`[Gateway] Resolving dispute: decision=${decision}, tx=${transactionId}`);

        // Verify on-chain state if escrowId provided
        if (escrowId !== undefined) {
            try {
                const onChainEscrow = await getEscrowDetails(escrowId);
                const onChainStatus = getStatusLabel(onChainEscrow.status);
                console.log(`[Gateway] On-chain escrow #${escrowId} status: ${onChainStatus}`);
            } catch (err: any) {
                console.warn(`[Gateway] Could not verify on-chain state: ${err.message}`);
            }
        }

        const finalStatus = decision === 'REFUND' ? 'REFUNDED' : 'SETTLED';
        const updatedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: finalStatus }
        });

        return res.json({
            success: true,
            status: updatedTx.status,
            message: decision === 'REFUND'
                ? 'Refund processed. Ensure resolveDispute(escrowId, true) was called on-chain.'
                : 'Dispute rejected. Ensure resolveDispute(escrowId, false) was called on-chain.'
        });

    } catch (error) {
        console.error('[Gateway] Dispute resolution error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * GET /api/gateway/escrow/:escrowId
 *
 * Check on-chain escrow status.
 */
export const getEscrowStatus = async (req: Request, res: Response) => {
    try {
        const escrowId = parseInt(req.params.escrowId as string);

        if (isNaN(escrowId)) {
            return res.status(400).json({ error: 'Invalid escrow ID' });
        }

        const escrow = await getEscrowDetails(escrowId);

        return res.json({
            escrowId,
            contractAddress: getEscrowContractAddress(),
            agent: escrow.agent,
            merchant: escrow.merchant,
            amount: escrow.amount.toString(),
            amountETH: Number(escrow.amount) / 1e18,
            resourceId: escrow.resourceId,
            status: getStatusLabel(escrow.status),
            createdAt: new Date(escrow.createdAt * 1000).toISOString(),
            deadline: new Date(escrow.deadline * 1000).toISOString(),
            disputeReason: escrow.disputeReason || null,
            chainlinkAutomation: escrow.status === EscrowStatus.PENDING
                ? `Will auto-settle at ${new Date(escrow.deadline * 1000).toISOString()}`
                : null,
        });

    } catch (error: any) {
        console.error('[Gateway] Escrow status error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch escrow status' });
    }
};
