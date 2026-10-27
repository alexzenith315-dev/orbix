import { defineChain } from 'viem';
import { bscTestnet, baseSepolia, sepolia, abstractTestnet } from 'viem/chains';

// Robinhood Chain testnet, chain id 46630 (verified via eth_chainId on the RPC).
// No public default RPC pinned: set VITE_ROBIN_RPC_URL.
export const robinTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_ROBIN_RPC_URL || 'https://rpc.robinhood-testnet.invalid'] } },
  blockExplorers: { default: { name: 'Explorer', url: import.meta.env.VITE_ROBIN_EXPLORER_URL || '' } },
  testnet: true,
});

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const env = (k) => (import.meta.env[k] || '').trim();

const EMPTY = { nft: '', marketplace: '', tokenFactory: '', pairing: '' };

// Per-chain config. An empty address means "not deployed on this chain yet": the UI shows
// "contract not deployed yet" instead of calling a missing contract.
// Sepolia addresses are the live deployment (contracts/deployments/sepolia.json).
export const EVM_CHAINS = {
  sepolia: {
    key: 'sepolia',
    chain: sepolia,
    label: 'Ethereum Sepolia',
    rpcUrl: env('VITE_SEPOLIA_RPC_URL') || 'https://ethereum-sepolia-rpc.publicnode.com',
    contracts: {
      nft: '0x046605a3a77e7645c4160a2Ab03b90127Ef45500',
      marketplace: '0x1114225702ed905Cb6bc2A74882EAFE702e0F53A',
      tokenFactory: '0x34D01E1F470f12a9B3EBb3AA2123296A23274cF5',
      pairing: '0x973382A07966EA347bFE54932D50b633834BDd7E',
    },
    envPrefix: 'SEPOLIA',
  },
  bsc: {
    key: 'bsc',
    chain: bscTestnet,
    label: 'BSC Testnet',
    rpcUrl: env('VITE_BSC_TESTNET_RPC_URL') || bscTestnet.rpcUrls.default.http[0],
    contracts: { ...EMPTY },
    envPrefix: 'BSC',
  },
  base: {
    key: 'base',
    chain: baseSepolia,
    label: 'Base Sepolia',
    rpcUrl: env('VITE_BASE_SEPOLIA_RPC_URL') || baseSepolia.rpcUrls.default.http[0],
    contracts: { ...EMPTY },
    envPrefix: 'BASE',
  },
  robin: {
    key: 'robin',
    chain: robinTestnet,
    label: 'Robinhood Chain Testnet',
    rpcUrl: env('VITE_ROBIN_RPC_URL'),
    contracts: { ...EMPTY },
    envPrefix: 'ROBIN',
  },
  abstract: {
    key: 'abstract',
    chain: abstractTestnet,
    label: 'Abstract Testnet',
    rpcUrl: env('VITE_ABSTRACT_RPC_URL') || abstractTestnet.rpcUrls.default.http[0],
    contracts: { ...EMPTY },
    envPrefix: 'ABSTRACT',
  },
};

const ENV_NAME = { nft: 'NFT', marketplace: 'MARKETPLACE', tokenFactory: 'TOKEN_FACTORY', pairing: 'PAIRING' };

// Env vars override per-chain addresses, e.g. VITE_BASE_SEPOLIA... -> VITE_BASE_NFT_ADDRESS.
export function resolveContracts(cfg) {
  const out = {};
  for (const [name, fallback] of Object.entries(cfg.contracts)) {
    const addr = env(`VITE_${cfg.envPrefix}_${ENV_NAME[name]}_ADDRESS`) || fallback;
    out[name] = ADDRESS_RE.test(addr) ? addr : '';
  }
  return out;
}

export const EVM_LIST = Object.values(EVM_CHAINS);
export const EVM_CHAIN_BY_ID = Object.fromEntries(EVM_LIST.map((c) => [c.chain.id, c]));
export const DEFAULT_CHAIN_KEY = 'sepolia';
