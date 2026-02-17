import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../context';

const FACILITATOR_WALLET = process.env.FACILITATOR_WALLET_ADDRESS || '';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

/**
 * x402 Payment Header format for Ethereum
 */
interface EthPaymentHeader {
    version: number;
    scheme: 'exact';
    network: 'sepolia';
    payload: {
        txHash: string;
        sender: string;
        amount: string; // in ETH (decimal string)
        timestamp: number;
    };
}

const parsePaymentHeader = (raw: string): EthPaymentHeader | null => {
    try {
        // Try base64 first
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
 * Verify an Ethereum payment on Sepolia
 */
async function verifyEthPayment(
    txHash: string,
    requiredAmountWei: bigint,
    requiredRecipient: string
): Promise<{ isValid: boolean; message: string; sender?: string }> {
    try {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const tx = await provider.getTransaction(txHash);

        if (!tx) {
            return { isValid: false, message: `Transaction not found: ${txHash}` };
        }

        // Check if transaction is confirmed
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) {
            return { isValid: false, message: 'Transaction not confirmed or failed' };
        }

        // Check recipient matches facilitator wallet
        if (tx.to?.toLowerCase() !== requiredRecipient.toLowerCase()) {
            return {
                isValid: false,
                message: `Invalid recipient: expected ${requiredRecipient}, got ${tx.to}`
            };
        }

        // Check amount is sufficient
        if (tx.value < requiredAmountWei) {
            return {
                isValid: false,
                message: `Insufficient amount: required ${requiredAmountWei.toString()} wei, got ${tx.value.toString()} wei`
            };
        }

        console.log(`✓ Payment verified on Sepolia: ${txHash} from ${tx.from}`);
        return { isValid: true, message: 'Payment verified on-chain', sender: tx.from };
    } catch (error: any) {
        console.error('Verification error:', error.message);
        return { isValid: false, message: `Verification error: ${error.message}` };
    }
}

/**
 * GET /api/gateway/resource/:resourceId
 * x402 Gateway — paywall for resource access
 */
export const accessResource = async (req: Request, res: Response) => {
    try {
        const resourceId = req.params.resourceId as string;
        const paymentHeaderRaw = (req.header('X-Payment') || req.header('Authorization')) as string | undefined;

        // 1. Fetch resource
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { user: true }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (!resource.isActive) {
            return res.status(403).json({ error: 'Resource is not active' });
        }

        // 2. Build payment requirements
        const priceEth = resource.price.toString();
        const priceWei = ethers.parseEther(priceEth);

        const paymentRequirements = {
            x402Version: 1,
            scheme: 'exact',
            network: 'ethereum-sepolia',
            token: 'ETH',
            maxAmountRequired: priceEth,
            maxAmountRequiredWei: priceWei.toString(),
            resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            description: `Payment for "${resource.title}"`,
            mimeType: resource.type === 'IMAGE' ? 'image/png' : 'application/json',
            payTo: FACILITATOR_WALLET,
            maxTimeoutSeconds: 300,
        };

        // 3. If no payment header → 402
        if (!paymentHeaderRaw) {
            return res.status(402).json({
                error: 'Payment Required',
                paymentRequirements,
            });
        }

        // 4. Parse and verify payment
        const header = parsePaymentHeader(paymentHeaderRaw);
        if (!header) {
            return res.status(402).json({
                error: 'Invalid payment header format',
                paymentRequirements,
            });
        }

        // Extract txHash — support both structured header and plain txHash string
        const txHash = header.payload?.txHash || (paymentHeaderRaw.startsWith('0x') ? paymentHeaderRaw : null);
        if (!txHash) {
            return res.status(402).json({
                error: 'Missing txHash in payment header',
                paymentRequirements,
            });
        }

        console.log(`Verifying payment for ${priceEth} ETH — tx: ${txHash}`);

        const result = await verifyEthPayment(txHash, priceWei, FACILITATOR_WALLET);

        if (!result.isValid) {
            console.log(`✗ Payment verification failed: ${result.message}`);
            return res.status(402).json({
                error: 'Invalid Payment',
                details: result.message,
                paymentRequirements,
            });
        }

        // 5. Payment valid — deliver resource
        console.log(`✓ Delivering resource "${resource.title}" to ${result.sender}`);

        if (resource.type === 'IMAGE' && resource.imageData) {
            const base64Data = resource.imageData.replace(/^data:image\/\w+;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'X-Resource-ID': resource.id,
                'X-Payment-Verified': 'true',
                'X-Payer': result.sender || 'unknown',
            });
            return res.end(img);
        }

        return res.json({
            success: true,
            resourceId: resource.id,
            title: resource.title,
            type: resource.type,
            data: resource.url || resource.imageData,
            paymentVerified: true,
            payer: result.sender,
        });

    } catch (error) {
        console.error('Gateway access error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
