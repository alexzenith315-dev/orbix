import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';

// Orbix runs on Ethereum Sepolia only. No mainnet chain is configured anywhere in this app.
export const ORBIX_CHAIN = sepolia;
export const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
export const EXPLORER_URL = sepolia.blockExplorers.default.url;

export function explorerTx(hash) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(address) {
  return `${EXPLORER_URL}/address/${address}`;
}

const connectors = [injected({ shimDisconnect: true })];
if (WALLETCONNECT_PROJECT_ID) {
  connectors.push(
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'Orbix',
        description: 'Orbix testnet NFT marketplace (Sepolia)',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://orbix.local',
        icons: [],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [ORBIX_CHAIN],
  connectors,
  transports: { [ORBIX_CHAIN.id]: http(SEPOLIA_RPC_URL) },
  multiInjectedProviderDiscovery: true,
});
