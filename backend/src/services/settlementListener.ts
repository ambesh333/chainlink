/**
 * Settlement Event Listener
 *
 * Listens for SettlementRequested events on-chain and automatically
 * finalizes settlement by calling finalizeSettlement(key, true) via
 * the facilitator wallet.
 */

import { ethers } from 'ethers';
import { prisma } from '../context';
import {
    getEscrowOnChain,
    finalizeSettlementOnChain,
    EscrowState,
} from '../clients/escrowClient';
import { executePrivateSettlement } from './privateSettlementService';
import EscrowMarketplaceABI from '../contracts/EscrowMarketplaceABI.json';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';
const POLL_INTERVAL_MS = 15_000; // 15 seconds between polls

let isRunning = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Handle a single SettlementRequested event.
 */
async function handleSettlementRequested(key: string, agent: string): Promise<void> {
    const tag = `[SettlementListener]`;
    console.log(`${tag} SettlementRequested event: key=${key.slice(0, 18)}... agent=${agent}`);

    try {
        // 1. Find the DB transaction by escrow key (stored in paymentTransactionId)
        const transaction = await prisma.transaction.findFirst({
            where: { paymentTransactionId: key },
        });

        if (!transaction) {
            console.warn(`${tag} No DB transaction found for escrow key=${key.slice(0, 18)}... — skipping`);
            return;
        }

        // 2. Deduplicate: skip if already settled
        if (transaction.status === 'SETTLED') {
            console.log(`${tag} Transaction ${transaction.id} already SETTLED — skipping`);
            return;
        }

        // 3. Fetch on-chain escrow data for safety checks
        const escrow = await getEscrowOnChain(key);

        // 4. Verify: state == SettlementRequested (enum value 2)
        if (escrow.state !== EscrowState.SettlementRequested) {
            console.warn(`${tag} Escrow state is ${escrow.state}, expected SettlementRequested (2) — skipping`);
            return;
        }

        // 5. Verify: agent matches DB record
        if (escrow.agent.toLowerCase() !== transaction.agentId.toLowerCase()) {
            console.warn(`${tag} Agent mismatch: on-chain=${escrow.agent}, DB=${transaction.agentId} — skipping`);
            return;
        }

        // 6. Verify: escrow not expired
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        if (escrow.expiry <= nowSeconds) {
            console.warn(`${tag} Escrow expired (expiry=${escrow.expiry}, now=${nowSeconds}) — skipping`);
            return;
        }

        // 7. Verify: no dispute raised
        if (escrow.agentRaisedDispute) {
            console.warn(`${tag} Agent raised dispute — skipping auto-settlement`);
            return;
        }

        // 8. Call finalizeSettlement(key, true) via facilitator wallet
        console.log(`${tag} All checks passed. Calling finalizeSettlement(key, true)...`);
        const { txHash } = await finalizeSettlementOnChain(key, true);
        console.log(`${tag} finalizeSettlement tx: ${txHash}`);

        // 9. Update DB transaction status to SETTLED
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'SETTLED' },
        });

        console.log(`${tag} Transaction ${transaction.id} updated to SETTLED`);

        // Trigger private token transfer (idempotent fallback)
        try {
            await executePrivateSettlement(key);
        } catch (ptErr: any) {
            console.warn(`${tag} Private settlement failed (non-fatal): ${ptErr.message}`);
        }
    } catch (error: any) {
        console.error(`${tag} Error processing escrow key=${key.slice(0, 18)}...:`, error.message);
    }
}

/**
 * Start the settlement event listener.
 * Uses polling (getLogs) for reliability — works with any JSON-RPC provider.
 */
export function startSettlementListener(): void {
    if (!ESCROW_CONTRACT_ADDRESS) {
        console.warn('[SettlementListener] ESCROW_CONTRACT_ADDRESS not set — listener disabled');
        return;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, EscrowMarketplaceABI, provider);
    const eventFilter = contract.filters.SettlementRequested();

    let lastBlock = 0;
    isRunning = true;

    async function poll(): Promise<void> {
        if (!isRunning) return;

        try {
            const currentBlock = await provider.getBlockNumber();

            if (lastBlock === 0) {
                // On first run, start from current block (don't replay history)
                lastBlock = currentBlock;
                console.log(`[SettlementListener] Starting from block ${lastBlock}`);
            }

            if (currentBlock > lastBlock) {
                const events = await contract.queryFilter(eventFilter, lastBlock + 1, currentBlock);

                for (const event of events) {
                    const parsed = event as ethers.EventLog;
                    if (parsed.args) {
                        const key = parsed.args[0] as string;
                        const agent = parsed.args[1] as string;
                        await handleSettlementRequested(key, agent);
                    }
                }

                lastBlock = currentBlock;
            }
        } catch (error: any) {
            console.error('[SettlementListener] Poll error:', error.message);
            // On provider errors, try to reconnect by creating a fresh provider next time
        }

        // Schedule next poll
        if (isRunning) {
            pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
    }

    // Start polling
    poll();
    console.log(`[SettlementListener] Active — polling every ${POLL_INTERVAL_MS / 1000}s on ${SEPOLIA_RPC_URL}`);
}

/**
 * Stop the settlement listener gracefully.
 */
export function stopSettlementListener(): void {
    isRunning = false;
    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
    console.log('[SettlementListener] Stopped');
}
