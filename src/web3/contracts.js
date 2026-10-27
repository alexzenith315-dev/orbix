import OrbixNFTAbi from '../abi/OrbixNFT.json';
import OrbixMarketplaceAbi from '../abi/OrbixMarketplace.json';
import OrbixTokenFactoryAbi from '../abi/OrbixTokenFactory.json';
import OrbixPairingAbi from '../abi/OrbixPairing.json';
import OrbixTokenAbi from '../abi/OrbixToken.json';
import { resolveContracts, EVM_CHAINS } from '../lib/chains/index.js';

// Contract addresses are per chain (src/lib/chains/evm.js). Components read them from
// useWallet().contracts, which follows the chain the user selected. Do not add module-level addresses here.
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function contractsFor(chainKey) {
  const cfg = EVM_CHAINS[chainKey] || EVM_CHAINS.sepolia;
  const c = resolveContracts(cfg);
  return {
    nft: c.nft,
    marketplace: c.marketplace,
    tokenFactory: c.tokenFactory,
    pairing: c.pairing,
    nftDeployed: ADDRESS_RE.test(c.nft),
    marketplaceDeployed: ADDRESS_RE.test(c.marketplace),
    tokenFactoryDeployed: ADDRESS_RE.test(c.tokenFactory),
    pairingDeployed: ADDRESS_RE.test(c.pairing),
  };
}

export const NOT_DEPLOYED_LABEL = 'contract not deployed yet';

export const NFT_ABI = OrbixNFTAbi;
export const MARKETPLACE_ABI = OrbixMarketplaceAbi;
export const TOKEN_FACTORY_ABI = OrbixTokenFactoryAbi;
export const PAIRING_ABI = OrbixPairingAbi;
export const TOKEN_ABI = OrbixTokenAbi;

// Mirrors OrbixMarketplace.FEE_BPS. Used only for display; the contract computes the real split.
export const PLATFORM_FEE_BPS = 250;
