# Orbix

Orbix is an NFT marketplace on Ethereum Sepolia (testnet only, not audited). It has three parts:

- Frontend: React + Vite in `src/`, wagmi/viem wallet layer, Sepolia contracts.
- Contracts: `contracts/` (OrbixNFT ERC-721, OrbixMarketplace), Hardhat tests.
- Backend: Express API in `server/`, Prisma + Postgres (Supabase in production), Sign-In with Ethereum (SIWE) sessions, role checks, launchpad lifecycle, collector dashboard, and a chain-log indexer.

Do not use it with real funds.

## Local setup

Requirements: Node 20+, a Postgres database (local or Supabase).

1. `npm install`
2. `cp .env.example .env`, then fill in `DATABASE_URL` and `DIRECT_URL` (see below). `.env` is git-ignored. Never commit real values.
3. Apply the database schema: `npm run db:migrate` (runs `prisma migrate deploy` with the migrations in `prisma/migrations`).
4. Run the tests: `npm test` (9 unit tests for role ladder, launch-state derivation and indexer log decoding). `cd contracts && npm install && npm test` runs the 15 contract tests.
5. Build the frontend: `npm run build`.
6. Start the API: `npm start` (listens on `PORT`, default 3001). If `dist/` exists, the same process serves the built SPA and everything under `/api/*` is the API.
7. Frontend dev server: `npm run dev` (port 5173). Note: the frontend does not call `/api` yet, and the dev server does not proxy `/api` to port 3001.

Smoke test against a running server with a real database: `node scripts/smoke-e2e.mjs`. It creates throwaway wallets, signs in with SIWE, runs the launchpad flow (apply, submit, review, approve, publish), checks the role and admin rules, and checks the dashboard. It deletes the launchpad rows it creates. It needs `DATABASE_URL` set and the server running on `PORT`.

## Environment

See `.env.example`. Keys:

- `DATABASE_URL`: the pooled connection string for the app runtime. For Supabase, use the transaction pooler (port 6543) and add `?pgbouncer=true`. Placeholder: `postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true`
- `DIRECT_URL`: the direct connection (port 5432), used by Prisma migrations. Placeholder: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
- `PORT`, `NODE_ENV`
- `SIWE_DOMAIN` and `SIWE_ORIGINS`: must match the host and origin the wallet signs for. Render: the public host, for example `orbix-6q0g.onrender.com`, and `https://orbix-6q0g.onrender.com`.
- `ORBIX_CHAIN_ID` (11155111, Sepolia), `SESSION_TTL_HOURS`, `NONCE_TTL_MINUTES`
- `VITE_*`: public frontend values (WalletConnect project id, RPC URL, contract addresses). Vite only exposes `VITE_` variables, so keep secrets out of them.
- `INDEXER_RPC_URL`, `INDEXER_START_BLOCK`, `INDEXER_CONFIRMATIONS`, `INDEXER_BATCH_SIZE`: indexer settings (server only). Use your own RPC for reliability.

## API (implemented)

Public:
- `GET /api/health`
- `GET /api/auth/nonce`, `POST /api/auth/siwe`, `POST /api/auth/signout`
- `GET /api/launchpad` (published projects with derived state), `GET /api/launchpad/:slug`
- `GET /api/activity` (indexed chain events)

Signed in:
- `GET /api/me`
- `GET /api/dashboard` (owned count, purchases, listings, offers, favorites, follows, all from DB. Valuation is reported as unavailable because no pricing source is configured.)
- `POST|DELETE /api/favorites/:assetId`, `POST|DELETE /api/follows/:userId`

Creator (role CREATOR):
- `POST /api/launchpad/applications`, `POST /api/launchpad/applications/:id/submit`

Moderator (MODERATOR):
- `POST /api/launchpad/applications/:id/review` with `{ "decision": "approve" | "reject" }`. Moderators can only move a submitted application to under review. The server rejects a moderator approve with 403.

Administrator (ADMINISTRATOR):
- `POST /api/launchpad/applications/:id/review` (approve or reject), `POST /api/launchpad/applications/:id/publish`
- `GET /api/admin/audit`, `PATCH /api/admin/users/:id/role` (cannot change own role), `PUT /api/admin/config/:key` (only `featured_collections` and `homepage_banner`)

Launch state (`UPCOMING`, `LIVE`, `SOLD_OUT`, `COMPLETED`, `CANCELLED`) is computed from dates and the indexed mint count, never stored. `guaranteedReturns` is always false.

## Verified

- `npm test`: 9 of 9 pass.
- `npm run build` (vite): clean.
- `prisma validate` passes. The migration applies to a fresh Postgres 17 database.
- `scripts/smoke-e2e.mjs`: 27 of 27 pass against a running server and local Postgres (SIWE sign-in and nonce replay, role and transition rules, public visibility of drafts vs. published, dashboard, signout).

## Not done yet

- The frontend does not call the backend. Wallet, mint, buy and offer still work only against the contracts, and the sample data is in `src/data.js`.
- No indexer is running on a schedule yet. `npm run index` runs it once.
- Only testnet. Not audited. Nothing here is a financial product, and launchpad projects are not verified by the platform. Approval does not imply verification.

## Deploy on Render (web service)

1. Create a Render web service from this repo (branch `main`).
2. Build command: `npm install && npm run build:render` (runs install, Prisma client generation and the vite build).
3. Start command: `npm start`. Render sets `PORT`. `server/index.js` serves `dist/` and `/api`.
4. Environment: set `DATABASE_URL` (Supabase pooler string), `DIRECT_URL` (Supabase direct string), `SIWE_DOMAIN` and `SIWE_ORIGINS` for the Render host, `NODE_ENV=production`, and the `VITE_*` values. Set them as Render environment variables, not in the repo.
5. Migrations: run `npm run db:migrate` once against `DIRECT_URL` before the first start, or add it to the build command.
6. Health check path: `/api/health`.

The current deploy at Render (`orbix-6q0g.onrender.com`) runs the frontend only, with start command `npx serve -s dist -l $PORT`. Switching it to `npm start` requires the variables above.

## Contracts and deployed addresses (Ethereum Sepolia, chainId 11155111)

- OrbixNFT: 0x046605a3a77e7645c4160a2Ab03b90127Ef45500 (https://sepolia.etherscan.io/address/0x046605a3a77e7645c4160a2Ab03b90127Ef45500)
- OrbixMarketplace: 0x1114225702ed905Cb6bc2A74882EAFE702e0F53A (https://sepolia.etherscan.io/address/0x1114225702ed905Cb6bc2A74882EAFE702e0F53A)
- Source: `contracts/deployments/sepolia.json`. Contract deploy prerequisites and the contract test suite are in `contracts/`.

## API wiring (frontend)

The frontend calls the Orbix API through `src/api/client.js`. Set `VITE_API_URL` to the API origin
(for example `https://orbix-6q0g.onrender.com`). Leave it empty when the page and API share an origin.
Requests send cookies (`credentials: 'include'`), so the API's CORS origin must include the frontend origin.

Render notes: the web service serves `dist` and `/api` from one process, so leave `VITE_API_URL` empty
at build time. Set `DATABASE_URL` (pooler, port 6543, `?pgbouncer=true`) and `DIRECT_URL` (port 5432) in
the Render environment. Never commit them.
