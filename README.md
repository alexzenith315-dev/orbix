# Orbix

Orbix is a dark, 3D-styled NFT marketplace frontend (React + Vite) with ERC-721 and marketplace contracts for Ethereum Sepolia testnet. Testnet only. Not audited. Deployed to Ethereum Sepolia (testnet, see Deployed addresses below).

## Setup (frontend)

1. `npm install`
2. Copy `.env.example` to `.env` and set `VITE_WALLETCONNECT_PROJECT_ID` (free project id from cloud.walletconnect.com). `.env` is git-ignored and must not be committed.
3. `npm run dev` for the local dev server, `npm run build` for a production build in `dist/`, `npm run preview` to serve `dist/`.

## .env keys (root, frontend)

- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect project id. Without it, only injected wallets (MetaMask, Rabby and similar) are offered.
- `VITE_SEPOLIA_RPC_URL`: optional. Defaults to the public Sepolia RPC `https://ethereum-sepolia-rpc.publicnode.com`.
- `VITE_ORBIX_NFT_ADDRESS`: OrbixNFT address after deploy. Empty means the app shows "contract not deployed yet" and sends nothing.
- `VITE_ORBIX_MARKETPLACE_ADDRESS`: OrbixMarketplace address after deploy. Same behavior when empty.

Vite only exposes variables that start with `VITE_`. Only public values go in the frontend `.env`.

## Contracts (contracts/)

- `OrbixNFT.sol`: ERC-721 with `mint(uri, royaltyBps)`, royalty capped at 10%, max supply and an owner toggle for minting.
- `OrbixMarketplace.sol`: listings, buys, escrowed offers (max 30 days), 2.5% platform fee, creator royalty split.
- Tests: `cd contracts && npm install && npm test` (15 tests, Hardhat).
- ABIs are copied into `src/abi/` with `node scripts/export-abi.js` from `contracts/`. Re-run it after any contract change.

## Deployed addresses (Ethereum Sepolia, chainId 11155111)

- OrbixNFT: 0x4c0Da0aACF74d6D58B1F09dBAE77287aCD0089fb
  https://sepolia.etherscan.io/address/0x4c0Da0aACF74d6D58B1F09dBAE77287aCD0089fb
- OrbixMarketplace: 0x6ab97D118cEbCfA6eBCE4bF0B8e8306fb05BE017
  https://sepolia.etherscan.io/address/0x6ab97D118cEbCfA6eBCE4bF0B8e8306fb05BE017
- Deployer (testnet only): 0x9D9b3ac599160cD0701698D7Ec4d4154a56d4f46
- Deploy txs: OrbixNFT https://sepolia.etherscan.io/tx/0xd4c8c615dee04317434cef6875599d9c443d4b053bfe02399efcfddf8b63e978 , OrbixMarketplace https://sepolia.etherscan.io/tx/0xe9c03bcc398a03690e93f331cb36e494c9e38a7f43921f715015c8315554cf60
- Source: `contracts/deployments/sepolia.json`. The addresses are also the defaults in `src/web3/contracts.js`, so the frontend works without a local env file.

## Sepolia deploy prerequisites

1. A deployer wallet used only for testnet. Never use a wallet that holds real funds. The deployer key in `contracts/.env` must be a throwaway testnet-only key: it is never committed, and any key that has ever been pasted into chat or logs should be treated as burned and replaced.
2. Sepolia test ETH in that wallet. The deploy script refuses to run with a zero balance. Get test ETH from a Sepolia faucet (for example the Alchemy or Google Cloud Sepolia faucets; faucet limits and requirements change, so check their current rules). Two contract deployments need a small amount of test ETH for gas; fund it with a comfortable margin.
3. `contracts/.env` (git-ignored) with:
   - `DEPLOYER_PRIVATE_KEY`: the deployer key (testnet only)
   - `SEPOLIA_RPC_URL`: optional, defaults to the public RPC
   - `ETHERSCAN_API_KEY`: optional, only for source verification
4. Run `cd contracts && npm run deploy:sepolia`. It writes `contracts/deployments/sepolia.json`.
5. Put the two addresses into the root `.env` as `VITE_ORBIX_NFT_ADDRESS` and `VITE_ORBIX_MARKETPLACE_ADDRESS`, then `npm run build`.

Check the deployer address and balance on https://sepolia.etherscan.io before deploying.

## What works

- Pages: Home, Marketplace (search, filters, sort, grid/list, pagination), NFT detail, 3D Gallery, Create (upload, metadata, traits, royalty, then mint), Creator profiles.
- Wallet: wagmi + viem with injected wallets and WalletConnect. The app switches to Ethereum Sepolia and rejects other networks.
- Buy, escrowed offers and mint call the real contracts once they are deployed. Each write shows wallet, pending and confirmed states, and "confirmed" only appears after the receipt reports success.
- Mobile-first responsive layout, skip link, focus styles, reduced-motion support.

## Honest limitations

- Not audited. Do not use it with real funds.
- Deployed to Sepolia testnet only. If the addresses are removed or empty, buy, offer and mint show "contract not deployed yet" and send nothing.
- Placeholder art and sample data: all NFTs, collections, creators, prices and activity in `src/data.js` are sample data, not on-chain data. The detail page shows the on-chain owner and listing only when contracts are configured.
- No IPFS pinning or upload service. Mint needs a metadata URI (ipfs:// or https://) that you host yourself. The Create page does not upload files.
- No indexer or backend. Listings are read by scanning the marketplace contract (capped at 200 listings).
- The Create page shows a draft metadata JSON, but nothing is uploaded or pinned.
- The frontend bundle is over 500 kB before gzip warnings; code-splitting is not done yet.
- No ESLint or TypeScript config is set up in this repo yet, so there is no separate typecheck or lint step. The checks are the production build and the 15 contract tests.
