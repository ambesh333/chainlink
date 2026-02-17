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
