/**
 * Chainlink Compliant Private Token API Client
 *
 * Adapted from: Compliant-Private-Transfer-Demo/api-scripts/src/common.ts
 *
 * All requests are authenticated via EIP-712 typed data signatures.
 * This client wraps the Private Token API for use in the gateway controller.
 */

import { ethers } from 'ethers';

const API_BASE_URL = process.env.PRIVATE_TOKEN_API_URL || 'https://convergence2026-token-api.cldev.cloud';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13';

/** EIP-712 domain for the Compliant Private Token system */
const EIP712_DOMAIN = {
    name: 'CompliantPrivateTokenDemo',
    version: '0.0.1',
    chainId: 11155111, // Sepolia
    verifyingContract: VAULT_ADDRESS as `0x${string}`,
};

// ─── Helper Functions ────────────────────────────────────────────

function getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
}

function getWallet(privateKey?: string): ethers.Wallet {
    const key = privateKey || process.env.FACILITATOR_PRIVATE_KEY;
    if (!key) throw new Error('No private key provided');
    return new ethers.Wallet(key);
}

async function signTypedData(
    wallet: ethers.Wallet,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, unknown>
): Promise<string> {
    return wallet.signTypedData(EIP712_DOMAIN, types, message);
}

async function postApi(endpoint: string, body: Record<string, unknown>): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[PrivateToken] POST ${url}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
        console.error(`[PrivateToken] Error (${response.status}):`, JSON.stringify(data));
        throw new Error(data.error_details || data.error || `API error: ${response.statusText}`);
    }

    return data;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generate a shielded address for a wallet.
 * Shielded addresses look like regular ETH addresses but can't be linked to the owner.
 */
export async function generateShieldedAddress(privateKey: string): Promise<string> {
    const wallet = getWallet(privateKey);
    const account = wallet.address;
    const timestamp = getTimestamp();

    const types = {
        'Generate Shielded Address': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
        ],
    };

    const message = { account, timestamp };
    const auth = await signTypedData(wallet, types, message);

    const result = await postApi('/shielded-address', { account, timestamp, auth });
    console.log(`[PrivateToken] Generated shielded address: ${result.address}`);
    return result.address;
}

/**
 * Execute a private token transfer.
 * Uses hide-sender flag by default to protect sender identity.
 */
export async function privateTransfer(params: {
    senderPrivateKey: string;
    recipient: string;
    tokenAddress: string;
    amount: string; // in wei
    hideSender?: boolean;
}): Promise<{ transaction_id: string }> {
    const wallet = getWallet(params.senderPrivateKey);
    const sender = wallet.address;
    const timestamp = getTimestamp();
    const flags = params.hideSender !== false ? ['hide-sender'] : [];

    const types = {
        'Private Token Transfer': [
            { name: 'sender', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'flags', type: 'string[]' },
            { name: 'timestamp', type: 'uint256' },
        ],
    };

    const message = { sender, recipient: params.recipient, token: params.tokenAddress, amount: params.amount, flags, timestamp };
    const auth = await signTypedData(wallet, types, message);

    const result = await postApi('/private-transfer', {
        account: sender,
        recipient: params.recipient,
        token: params.tokenAddress,
        amount: params.amount,
        flags,
        timestamp,
        auth,
    });

    console.log(`[PrivateToken] Transfer complete: ${result.transaction_id}`);
    return result;
}

/**
 * Get private token balances for an account.
 */
export async function getBalances(privateKey: string): Promise<{ balances: Array<{ token: string; amount: string }> }> {
    const wallet = getWallet(privateKey);
    const account = wallet.address;
    const timestamp = getTimestamp();

    const types = {
        'Retrieve Balances': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
        ],
    };

    const message = { account, timestamp };
    const auth = await signTypedData(wallet, types, message);

    return postApi('/balances', { account, timestamp, auth });
}

/**
 * List transaction history for an account.
 * Used to verify that a payment was received by the facilitator.
 */
export async function getTransactions(
    privateKey: string,
    limit: number = 20,
    cursor?: string
): Promise<{
    transactions: Array<{
        id: string;
        type: string;
        sender?: string;
        recipient?: string;
        token: string;
        amount: string;
        is_incoming?: boolean;
        is_sender_hidden?: boolean;
    }>;
    has_more: boolean;
    next_cursor?: string;
}> {
    const wallet = getWallet(privateKey);
    const account = wallet.address;
    const timestamp = getTimestamp();

    const types = {
        'List Transactions': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
            { name: 'cursor', type: 'string' },
            { name: 'limit', type: 'uint256' },
        ],
    };

    const message = { account, timestamp, cursor: cursor || '', limit };
    const auth = await signTypedData(wallet, types, message);

    const body: Record<string, unknown> = { account, timestamp, auth, limit };
    if (cursor) body.cursor = cursor;

    return postApi('/transactions', body);
}

/**
 * Request a withdrawal ticket to redeem tokens on-chain.
 */
export async function requestWithdrawal(params: {
    privateKey: string;
    tokenAddress: string;
    amount: string;
}): Promise<{ id: string; ticket: string; deadline: number }> {
    const wallet = getWallet(params.privateKey);
    const account = wallet.address;
    const timestamp = getTimestamp();

    const types = {
        'Withdraw Tokens': [
            { name: 'account', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'timestamp', type: 'uint256' },
        ],
    };

    const message = { account, token: params.tokenAddress, amount: params.amount, timestamp };
    const auth = await signTypedData(wallet, types, message);

    return postApi('/withdraw', {
        account,
        token: params.tokenAddress,
        amount: params.amount,
        timestamp,
        auth,
    });
}
