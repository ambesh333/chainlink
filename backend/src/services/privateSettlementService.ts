/**
 * Private Settlement Service
 *
 * After on-chain escrow settlement (ETH → platform treasury), this service
 * executes a private token transfer from the platform's Vault balance to
 * the merchant's shielded address via the Chainlink Private Token API.
 *
 * Idempotent: if privateTransferTxId already exists, returns it without retrying.
 */

import { prisma } from '../context';
import { privateTransfer } from '../clients/privateTokenClient';

const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';

/**
 * Execute a private token transfer for a settled escrow.
 *
 * @param escrowKey - The bytes32 escrow key (paymentTransactionId in DB)
 * @returns The privateTransferTxId, or null if not applicable
 */
export async function executePrivateSettlement(escrowKey: string): Promise<string | null> {
    const tag = '[PrivateSettlement]';

    // 1. Find the transaction by escrow key
    const transaction = await prisma.transaction.findFirst({
        where: { paymentTransactionId: escrowKey },
        include: { user: { select: { shieldedAddress: true, walletAddress: true } } },
        orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
        console.warn(`${tag} No transaction found for escrowKey=${escrowKey}`);
        return null;
    }

    // 2. Idempotent: already done
    if (transaction.privateTransferTxId) {
        console.log(`${tag} Already completed: txId=${transaction.privateTransferTxId}`);
        return transaction.privateTransferTxId;
    }

    // 3. Validate status
    if (transaction.status !== 'SETTLED') {
        console.warn(`${tag} Transaction status is ${transaction.status}, expected SETTLED — skipping`);
        return null;
    }

    // 4. Validate merchant has a shielded address
    const merchantShieldedAddress = transaction.user?.shieldedAddress;
    if (!merchantShieldedAddress) {
        console.warn(`${tag} Merchant ${transaction.user?.walletAddress} has no shielded address — skipping private transfer`);
        return null;
    }

    // 5. Skip free resources
    if (transaction.amount === 0) {
        console.log(`${tag} Free resource — no private transfer needed`);
        return null;
    }

    // 6. Validate env config
    if (!FACILITATOR_PRIVATE_KEY) {
        console.error(`${tag} FACILITATOR_PRIVATE_KEY not configured`);
        return null;
    }
    if (!TOKEN_ADDRESS) {
        console.error(`${tag} TOKEN_ADDRESS not configured`);
        return null;
    }

    // 6. Execute private transfer
    const amountWei = BigInt(Math.floor(transaction.amount * 1e18)).toString();
    console.log(`${tag} Executing private transfer: ${transaction.amount} ETH → ${merchantShieldedAddress}`);

    const result = await privateTransfer({
        senderPrivateKey: FACILITATOR_PRIVATE_KEY,
        recipient: merchantShieldedAddress,
        tokenAddress: TOKEN_ADDRESS,
        amount: amountWei,
        hideSender: true,
    });

    const txId = result.transaction_id;

    // 7. Store in DB
    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { privateTransferTxId: txId },
    });

    console.log(`${tag} Private transfer complete: txId=${txId} for escrowKey=${escrowKey}`);
    return txId;
}
