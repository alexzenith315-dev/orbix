import { createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem';
import { sepolia } from 'viem/chains';
import { prisma } from './db.js';
import { config } from './config.js';
import marketplaceAbi from '../src/abi/OrbixMarketplace.json' with { type: 'json' };
import nftAbi from '../src/abi/OrbixNFT.json' with { type: 'json' };

// Activity is only written from real logs. Nothing is synthesized.
// Idempotent: unique (chainId, txHash, logIndex). Reorg-safe: stored block hashes are compared against the chain and rewound on mismatch.
// Tracked ranges: IndexerCursor.lastBlock records the last fully processed block.

const NAME = 'orbix-marketplace-nft';

export function buildClient() {
  if (!config.rpcUrl) throw new Error('INDEXER_RPC_URL (or VITE_SEPOLIA_RPC_URL) is not set');
  return createPublicClient({ chain: sepolia, transport: http(config.rpcUrl) });
}

const addresses = () => [config.marketplaceAddress, config.nftAddress].map((a) => a.toLowerCase());
const allAbi = [...marketplaceAbi, ...nftAbi];

export function decodeLog(log) {
  try {
    const d = decodeEventLog({ abi: allAbi, data: log.data, topics: log.topics });
    return d;
  } catch {
    return null;
  }
}

// Map a decoded event to an ActivityEvent row, or null for events we do not show.
export function toActivity(log, decoded, chainId) {
  const { eventName, args } = decoded;
  const actor = args.seller || args.buyer || args.creator || args.from || null;
  const data = JSON.parse(JSON.stringify(args, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
  const map = { Listed: 'listed', Sold: 'purchased', ListingCancelled: 'listing_cancelled', OfferMade: 'offer_created', OfferAccepted: 'offer_accepted', OfferCancelled: 'offer_cancelled', Minted: 'minted', Transfer: 'transferred' };
  if (!map[eventName]) return null;
  return {
    chainId,
    txHash: log.transactionHash,
    logIndex: Number(log.logIndex),
    blockNumber: BigInt(log.blockNumber),
    blockHash: log.blockHash,
    eventName: map[eventName],
    actor: actor ? String(actor).toLowerCase() : null,
    contractAddress: log.address.toLowerCase(),
    data,
  };
}

async function getCursor() {
  return prisma.indexerCursor.upsert({
    where: { name: NAME },
    create: { name: NAME, chainId: config.chainId, contractAddress: config.marketplaceAddress.toLowerCase(), lastBlock: BigInt(config.indexerStartBlock) },
    update: {},
  });
}

// Detects a reorg: if any stored block in the recent window no longer matches the chain, rewind to before it.
async function reconcileReorg(client) {
  const recent = await prisma.indexedBlock.findMany({
    where: { chainId: config.chainId },
    orderBy: { blockNumber: 'desc' },
    take: config.indexerReorgDepth,
  });
  for (const b of recent) {
    const onChain = await client.getBlock({ blockNumber: b.blockNumber }).catch(() => null);
    if (!onChain || onChain.hash !== b.blockHash) {
      const fork = b.blockNumber;
      await prisma.$transaction([
        prisma.activityEvent.deleteMany({ where: { chainId: config.chainId, blockNumber: { gte: fork } } }),
        prisma.indexedBlock.deleteMany({ where: { chainId: config.chainId, blockNumber: { gte: fork } } }),
        prisma.indexerCursor.update({ where: { name: NAME }, data: { lastBlock: fork - 1n } }),
      ]);
      return { rewoundTo: fork - 1n };
    }
  }
  return null;
}

export async function runOnce(client = buildClient()) {
  const reorg = await reconcileReorg(client);
  const cursor = await getCursor();
  const head = await client.getBlockNumber();
  const safeHead = head - BigInt(config.indexerConfirmations);
  const from = cursor.lastBlock + 1n;
  if (from > safeHead) return { processed: 0, from, to: safeHead, reorg };

  let processed = 0;
  for (let start = from; start <= safeHead; start += BigInt(config.indexerBatchSize)) {
    const end = start + BigInt(config.indexerBatchSize) - 1n > safeHead ? safeHead : start + BigInt(config.indexerBatchSize) - 1n;
    const logs = await client.getLogs({ address: addresses(), fromBlock: start, toBlock: end });
    const rows = [];
    for (const log of logs) {
      const decoded = decodeLog(log);
      if (!decoded) continue;
      const row = toActivity(log, decoded, config.chainId);
      if (row) rows.push(row);
    }
    const blockHashes = new Map();
    for (const r of rows) blockHashes.set(r.blockNumber, r.blockHash);
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.activityEvent.upsert({
          where: { chainId_txHash_logIndex: { chainId: r.chainId, txHash: r.txHash, logIndex: r.logIndex } },
          create: r,
          update: {},
        });
      }
      // Record every block in range, not just those with events, so reorg detection covers the window.
      const latest = await client.getBlock({ blockNumber: end });
      await tx.indexedBlock.upsert({
        where: { chainId_blockNumber: { chainId: config.chainId, blockNumber: end } },
        create: { chainId: config.chainId, blockNumber: end, blockHash: latest.hash },
        update: { blockHash: latest.hash },
      });
      await tx.indexerCursor.update({ where: { name: NAME }, data: { lastBlock: end } });
    });
    processed += rows.length;
  }
  return { processed, from, to: safeHead, reorg };
}
