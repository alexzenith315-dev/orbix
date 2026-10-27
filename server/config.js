import 'dotenv/config';

function int(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
}

export const config = {
  port: int('PORT', 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  // SIWE domain and the origin the frontend is served from. Must match what the wallet signs.
  siweDomain: process.env.SIWE_DOMAIN || 'localhost:5173',
  siweOrigins: (process.env.SIWE_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  sessionTtlHours: int('SESSION_TTL_HOURS', 24),
  nonceTtlMinutes: int('NONCE_TTL_MINUTES', 5),
  chainId: int('ORBIX_CHAIN_ID', 11155111),
  rpcUrl: process.env.INDEXER_RPC_URL || process.env.VITE_SEPOLIA_RPC_URL || '',
  tokenFactoryAddress: process.env.VITE_ORBIX_TOKEN_FACTORY_ADDRESS || '0x34D01E1F470f12a9B3EBb3AA2123296A23274cF5',
  pairingAddress: process.env.VITE_ORBIX_PAIRING_ADDRESS || '0x973382A07966EA347bFE54932D50b633834BDd7E',
  nftAddress: process.env.VITE_ORBIX_NFT_ADDRESS || '0x046605a3a77e7645c4160a2Ab03b90127Ef45500',
  marketplaceAddress: process.env.VITE_ORBIX_MARKETPLACE_ADDRESS || '0x1114225702ed905Cb6bc2A74882EAFE702e0F53A',
  indexerStartBlock: int('INDEXER_START_BLOCK', 0),
  indexerBatchSize: int('INDEXER_BATCH_SIZE', 500),
  // Blocks to wait before treating an event as final. Reorgs deeper than this are not expected on Sepolia but are still checked.
  indexerConfirmations: int('INDEXER_CONFIRMATIONS', 12),
  indexerReorgDepth: int('INDEXER_REORG_DEPTH', 64),
};
