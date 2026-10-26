# Orbix

Orbix is a dark, 3D-styled NFT drop and marketplace frontend (React + Vite).

## Run
- npm install
- npm run dev (local dev server)
- npm run build (production build to dist/)
- npm run preview (serve dist/ locally)

## What works
- Pages: Home (hero, featured, collections, trending, creators), Marketplace (search, category, chain, collection, max price, sort, grid/list, pagination), NFT detail (properties, activity), 3D Gallery (CSS 3D carousel), Create (4-step upload, metadata, mint flow), Creator profile (Created, Collected, Listed tabs).
- Wallet: connects to an injected EIP-1193 wallet (window.ethereum). The modal lists MetaMask, Rabby, Coinbase, Trust and Rainbow. It only requests account access.
- Mobile-first responsive layout, skip link, focus styles, reduced-motion support.

## Honest limitations
- All NFT, collection and creator data is placeholder data in src/data.js. It is not live on-chain data.
- Buy, offer and mint do not call any contract. They show a notice. Nothing is signed or sent.
- WalletConnect is listed but not wired. No connect kit (wagmi, viem, RainbowKit) is integrated yet.
- No Solidity contracts, indexer, IPFS pinning, or backend yet.
- Collected counts and verification badges are intentionally not shown.
- Upload previews are local only. Nothing is uploaded.

## Next steps
- Add wagmi + viem (+ a connect kit) and testnet-only chain config (Sepolia, Amoy).
- Write ERC-721 / ERC-1155 contracts with OpenZeppelin, Hardhat tests, testnet deploy.
- Replace src/data.js with an indexer or API.
- Deploy as a static site on Render.
