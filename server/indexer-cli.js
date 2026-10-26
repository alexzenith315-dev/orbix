import { runOnce } from './indexer.js';
import { prisma } from './db.js';

// Run one indexing pass. Schedule with cron or a Render cron job; safe to re-run (idempotent).
try {
  const r = await runOnce();
  console.log(JSON.stringify({ processed: r.processed, from: String(r.from), to: String(r.to), reorg: r.reorg ? String(r.reorg.rewoundTo) : null }));
} catch (e) {
  console.error('indexer_error', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
