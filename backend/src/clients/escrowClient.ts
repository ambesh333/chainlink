/**
 * On-chain Escrow Client for EscrowMarketplace.sol (Sepolia)
 *
 * Contract address: set ESCROW_CONTRACT_ADDRESS in .env
 *
 * Key design:
 * - Resources are NOT on-chain. Only payment escrows are.
 * - Flow: facilitator calls createEscrow() → agent calls deposit(key) →
 *         backend reads lockedForResource[key] to verify →
 *         facilitator calls finalizeSettlement(key, true) to pay merchant.
 */

import { ethers } from 'ethers';
import EscrowMarketplaceABI from '../contracts/EscrowMarketplaceABI.json';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || '';

function getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

function getReadContract(): ethers.Contract {
    if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not set in environment');
    }
    return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, EscrowMarketplaceABI, getProvider());
}

function getWriteContract(): ethers.Contract {
    if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not set in environment');
    }
    if (!FACILITATOR_PRIVATE_KEY || FACILITATOR_PRIVATE_KEY.includes('YOUR_')) {
        throw new Error('FACILITATOR_PRIVATE_KEY not configured in environment');
    }
    const signer = new ethers.Wallet(FACILITATOR_PRIVATE_KEY, getProvider());
    return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, EscrowMarketplaceABI, signer);
}

/**
 * Generate a unique bytes32 escrow key tied to a specific resource + agent purchase.
 * Including timestamp ensures a fresh key per purchase attempt.
 */
export function generateEscrowKey(resourceId: string, agentAddress: string): string {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'address', 'uint256'],
            [resourceId, agentAddress.toLowerCase(), BigInt(Date.now())]
        )
    );
}

/**
 * Create an escrow on-chain via the facilitator wallet.
 * Must be called before the agent can deposit.
 *
 * @param key            - bytes32 escrow identifier (from generateEscrowKey)
 * @param merchantAddress - wallet address of the resource owner
 * @param agentAddress   - wallet address of the buyer
 * @param priceWei       - required deposit amount in wei
 * @param holdDurationSeconds - seconds before merchant can claimAfterExpiry
 */
export async function createEscrowOnChain(
    key: string,
    merchantAddress: string,
    agentAddress: string,
    priceWei: bigint,
    holdDurationSeconds: number
): Promise<{ txHash: string }> {
    const contract = getWriteContract();
    const tx = await contract.createEscrow(
        key,
        merchantAddress,
        agentAddress,
        ethers.ZeroAddress,          // asset = zero address means ETH (not ERC20)
        priceWei,
        BigInt(holdDurationSeconds)
    );
    await tx.wait();
    console.log(`[EscrowClient] createEscrow tx: ${tx.hash}`);
    return { txHash: tx.hash };
}

/**
 * Verify that the agent has deposited the required amount for a given escrow key.
 * Uses the public `lockedForResource` mapping — no private key needed.
 *
 * lockedForResource[key] > 0 means the escrow is in Funded state.
 * lockedForResource[key] == 0 means not funded yet (or already settled/released).
 */
export async function verifyDeposit(
    key: string,
    expectedAmountWei: bigint
): Promise<{ isValid: boolean; message: string; lockedAmount?: bigint }> {
    try {
        const contract = getReadContract();
        const locked: bigint = await contract.lockedForResource(key);

        if (locked >= expectedAmountWei) {
            return {
                isValid: true,
                message: 'Deposit verified on-chain',
                lockedAmount: locked,
            };
        }

        return {
            isValid: false,
            message: `Insufficient deposit: need ${expectedAmountWei} wei, locked ${locked} wei`,
            lockedAmount: locked,
        };
    } catch (error: any) {
        return {
            isValid: false,
            message: `On-chain verification failed: ${error.message}`,
        };
    }
}

/**
 * Finalize settlement on-chain (facilitator action).
 * - payMerchant = true  → funds released to merchant (normal settlement)
 * - payMerchant = false → funds returned to agent (refund on dispute)
 *
 * Contract requires: facilitator role, escrow in Funded/SettlementRequested/Disputed state.
 */
export async function finalizeSettlementOnChain(
    key: string,
    payMerchant: boolean
): Promise<{ txHash: string }> {
    const contract = getWriteContract();
    const tx = await contract.finalizeSettlement(key, payMerchant);
    await tx.wait();
    console.log(`[EscrowClient] finalizeSettlement tx: ${tx.hash} | payMerchant: ${payMerchant}`);
    return { txHash: tx.hash };
}

/**
 * Read how much ETH is currently locked for a given escrow key.
 * Useful for status checks without needing the full escrow struct.
 */
export async function getLockedAmount(key: string): Promise<bigint> {
    const contract = getReadContract();
    return await contract.lockedForResource(key);
}

export function getEscrowContractAddress(): string {
    return ESCROW_CONTRACT_ADDRESS;
}
