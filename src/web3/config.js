import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { EVM_LIST, EVM_CHAINS, DEFAULT_CHAIN_KEY } from '../lib/chains/index.js';

export const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Only chains with a usable RPC go into wagmi. Sepolia is always included.
export const ENABLED_CHAINS = EVM_LIST.filter((c) => c.key === DEFAULT_CHAIN_KEY || !!c.rpcUrl);
export const DEFAULT_CHAIN = EVM_CHAINS[DEFAULT_CHAIN_KEY];

export function chainCfg(key) {
  return EVM_CHAINS[key] || DEFAULT_CHAIN;
}

export function explorerUrl(key) {
  return chainCfg(key).chain.blockExplorers?.default?.url || '';
}

export function explorerTx(hash, key = DEFAULT_CHAIN_KEY) {
  return `${explorerUrl(key)}/tx/${hash}`;
}

export function explorerAddress(address, key = DEFAULT_CHAIN_KEY) {
  return `${explorerUrl(key)}/address/${address}`;
}

const connectors = [injected({ shimDisconnect: true })];
if (WALLETCONNECT_PROJECT_ID) {
  connectors.push(
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'Orbix',
        description: 'Orbix testnet NFT marketplace (multi-chain testnets)',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://orbix.local',
        icons: [],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  chains: ENABLED_CHAINS.map((c) => c.chain),
  connectors,
  transports: Object.fromEntries(ENABLED_CHAINS.map((c) => [c.chain.id, http(c.rpcUrl || undefined)])),
  multiInjectedProviderDiscovery: true,
});
