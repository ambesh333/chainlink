// Backend API URL - configured via environment variables
export function getApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

    // Use environment variable if valid
    if (raw && raw.startsWith('http')) {
        return raw;
    }

    // In browser: use localhost in development
    if (typeof window !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        return isLocalhost ? 'http://localhost:3001/api' : 'http://localhost:3001/api';
    }

    return 'http://localhost:3001/api';
}

// Private Token API URL (Chainlink ACE demo)
// Vault address used for EIP-712 domain verification
export function getVaultAddress(): `0x${string}` {
    const raw = process.env.NEXT_PUBLIC_VAULT_ADDRESS?.trim();
    if (raw && raw.startsWith('0x')) {
        return raw as `0x${string}`;
    }
    return '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13';
}

export function getTokenAddress(): `0x${string}` {
    const raw = process.env.NEXT_PUBLIC_TOKEN_ADDRESS?.trim();
    if (raw && raw.startsWith('0x')) {
        return raw as `0x${string}`;
    }
    return '0x6207B7526941A8De1635AC6eeBD79735DF40177c';
}

export function getFacilitatorShieldedAddress(): `0x${string}` {
    const raw = process.env.NEXT_PUBLIC_FACILITATOR_SHIELDED_ADDRESS?.trim();
    if (raw && raw.startsWith('0x')) {
        return raw as `0x${string}`;
    }
    return '0x95FdF1eF28E672e0aE741BAc98A6c2419Ae7BD09';
}
