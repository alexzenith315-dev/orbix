import OrbixNFTAbi from '../abi/OrbixNFT.json';
import OrbixMarketplaceAbi from '../abi/OrbixMarketplace.json';
import OrbixTokenFactoryAbi from '../abi/OrbixTokenFactory.json';
import OrbixPairingAbi from '../abi/OrbixPairing.json';
import OrbixTokenAbi from '../abi/OrbixToken.json';

// Deployed addresses come from Vite env vars (see README). Empty means not deployed yet.
// Sepolia deployments (public addresses, see README). Env vars override.
export const NFT_ADDRESS = import.meta.env.VITE_ORBIX_NFT_ADDRESS || '0x046605a3a77e7645c4160a2Ab03b90127Ef45500';
export const MARKETPLACE_ADDRESS = import.meta.env.VITE_ORBIX_MARKETPLACE_ADDRESS || '0x1114225702ed905Cb6bc2A74882EAFE702e0F53A';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const nftDeployed = ADDRESS_RE.test(NFT_ADDRESS);
export const marketplaceDeployed = ADDRESS_RE.test(MARKETPLACE_ADDRESS);
export const TOKEN_FACTORY_ADDRESS = import.meta.env.VITE_ORBIX_TOKEN_FACTORY_ADDRESS || '0x34D01E1F470f12a9B3EBb3AA2123296A23274cF5';
export const PAIRING_ADDRESS = import.meta.env.VITE_ORBIX_PAIRING_ADDRESS || '0x973382A07966EA347bFE54932D50b633834BDd7E';
export const tokenFactoryDeployed = ADDRESS_RE.test(TOKEN_FACTORY_ADDRESS);
export const pairingDeployed = ADDRESS_RE.test(PAIRING_ADDRESS);

export const NOT_DEPLOYED_LABEL = 'contract not deployed yet';

export const NFT_ABI = OrbixNFTAbi;
export const MARKETPLACE_ABI = OrbixMarketplaceAbi;
export const TOKEN_FACTORY_ABI = OrbixTokenFactoryAbi;
export const PAIRING_ABI = OrbixPairingAbi;
export const TOKEN_ABI = OrbixTokenAbi;

// Mirrors OrbixMarketplace.FEE_BPS. Used only for display; the contract computes the real split.
export const PLATFORM_FEE_BPS = 250;
