# Orbix

Orbix is a dark, 3D-styled NFT marketplace frontend (React + Vite) with ERC-721 and marketplace contracts for Ethereum Sepolia testnet. Testnet only. Not audited. Not deployed yet.

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

## Sepolia deploy prerequisites

1. A deployer wallet used only for testnet. Never use a wallet that holds real funds.
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
- Not deployed. Until the Sepolia deploy and the env addresses are set, buy, offer and mint show "contract not deployed yet" and send nothing.
- Placeholder art and sample data: all NFTs, collections, creators, prices and activity in `src/data.js` are sample data, not on-chain data. The detail page shows the on-chain owner and listing only when contracts are configured.
- No IPFS pinning or upload service. Mint needs a metadata URI (ipfs:// or https://) that you host yourself. The Create page does not upload files.
- No indexer or backend. Listings are read by scanning the marketplace contract (capped at 200 listings).
- The Create page shows a draft metadata JSON, but nothing is uploaded or pinned.
- The frontend bundle is over 500 kB before gzip warnings; code-splitting is not done yet.
- No ESLint or TypeScript config is set up in this repo yet, so there is no separate typecheck or lint step. The checks are the production build and the 15 contract tests.
