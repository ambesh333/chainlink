/**
 * On-chain Escrow Client
 *
 * Interacts with the PrivacyEscrow smart contract on Sepolia.
 * Provides read-only methods for the gateway to verify deposits
 * and check escrow status without needing the facilitator's private key.
 */

import { ethers } from 'ethers';
import PrivacyEscrowABI from '../contracts/PrivacyEscrowABI.json';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '';

// Escrow status enum matches the smart contract
export enum EscrowStatus {
    PENDING = 0,
    SETTLED = 1,
    DISPUTED = 2,
    REFUNDED = 3,
    AUTO_SETTLED = 4,
}

export interface EscrowDetails {
    agent: string;
    merchant: string;
    amount: bigint;
    resourceId: string;
    status: EscrowStatus;
    createdAt: number;
    deadline: number;
    disputeReason: string;
}

function getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

function getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    if (!ESCROW_CONTRACT_ADDRESS) {
        throw new Error('ESCROW_CONTRACT_ADDRESS not set in environment');
    }
    const provider = signerOrProvider || getProvider();
    return new ethers.Contract(ESCROW_CONTRACT_ADDRESS, PrivacyEscrowABI, provider);
}

/**
 * Get escrow details by ID from the smart contract.
 */
export async function getEscrowDetails(escrowId: number): Promise<EscrowDetails> {
    const contract = getContract();
    const result = await contract.getEscrow(escrowId);

    return {
        agent: result[0],
        merchant: result[1],
        amount: result[2],
        resourceId: result[3],
        status: Number(result[4]) as EscrowStatus,
        createdAt: Number(result[5]),
        deadline: Number(result[6]),
        disputeReason: result[7],
    };
}

/**
 * Get the total number of escrows created.
 */
export async function getEscrowCount(): Promise<number> {
    const contract = getContract();
    const count = await contract.escrowCount();
    return Number(count);
}

/**
 * Verify that an on-chain deposit exists and matches expected parameters.
 */
export async function verifyDeposit(
    escrowId: number,
    expectedResourceId: string,
    expectedAmountWei: bigint
): Promise<{ isValid: boolean; message: string; escrow?: EscrowDetails }> {
    try {
        const escrow = await getEscrowDetails(escrowId);

        if (escrow.status !== EscrowStatus.PENDING) {
            return {
                isValid: false,
                message: `Escrow ${escrowId} is not pending (status: ${EscrowStatus[escrow.status]})`,
            };
        }

        if (escrow.resourceId !== expectedResourceId) {
            return {
                isValid: false,
                message: `Resource ID mismatch: expected ${expectedResourceId}, got ${escrow.resourceId}`,
            };
        }

        if (escrow.amount < expectedAmountWei) {
            return {
                isValid: false,
                message: `Insufficient deposit: expected ${expectedAmountWei}, got ${escrow.amount}`,
            };
        }

        return {
            isValid: true,
            message: 'Deposit verified on-chain',
            escrow,
        };
    } catch (error: any) {
        return {
            isValid: false,
            message: `Verification failed: ${error.message}`,
        };
    }
}

/**
 * Get the contract address for frontend/client reference.
 */
export function getEscrowContractAddress(): string {
    return ESCROW_CONTRACT_ADDRESS;
}

/**
 * Status label helper.
 */
export function getStatusLabel(status: EscrowStatus): string {
    switch (status) {
        case EscrowStatus.PENDING: return 'PENDING';
        case EscrowStatus.SETTLED: return 'SETTLED';
        case EscrowStatus.DISPUTED: return 'DISPUTED';
        case EscrowStatus.REFUNDED: return 'REFUNDED';
        case EscrowStatus.AUTO_SETTLED: return 'AUTO_SETTLED';
        default: return 'UNKNOWN';
    }
}
