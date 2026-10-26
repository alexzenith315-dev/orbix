import OrbixNFTAbi from '../abi/OrbixNFT.json';
import OrbixMarketplaceAbi from '../abi/OrbixMarketplace.json';

// Deployed addresses come from Vite env vars (see README). Empty means not deployed yet.
// Sepolia deployments (public addresses, see README). Env vars override.
export const NFT_ADDRESS = import.meta.env.VITE_ORBIX_NFT_ADDRESS || '0x4c0Da0aACF74d6D58B1F09dBAE77287aCD0089fb';
export const MARKETPLACE_ADDRESS = import.meta.env.VITE_ORBIX_MARKETPLACE_ADDRESS || '0x6ab97D118cEbCfA6eBCE4bF0B8e8306fb05BE017';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const nftDeployed = ADDRESS_RE.test(NFT_ADDRESS);
export const marketplaceDeployed = ADDRESS_RE.test(MARKETPLACE_ADDRESS);

export const NOT_DEPLOYED_LABEL = 'contract not deployed yet';

export const NFT_ABI = OrbixNFTAbi;
export const MARKETPLACE_ABI = OrbixMarketplaceAbi;

// Mirrors OrbixMarketplace.FEE_BPS. Used only for display; the contract computes the real split.
export const PLATFORM_FEE_BPS = 250;
