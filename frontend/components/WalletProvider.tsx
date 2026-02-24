'use client';
import { FC, ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    RainbowKitProvider,
    connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
    rainbowWallet,
    metaMaskWallet,
    walletConnectWallet,
    phantomWallet,
    coinbaseWallet,
    injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                metaMaskWallet,
                phantomWallet,
                rainbowWallet,
                coinbaseWallet,
                walletConnectWallet,
            ],
        },
        {
            groupName: 'Other',
            wallets: [injectedWallet],
        },
    ],
    { appName: 'Chainlink Agent', projectId }
);

const config = createConfig({
    connectors,
    chains: [mainnet, sepolia],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

interface WalletContextProviderProps {
    children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};
