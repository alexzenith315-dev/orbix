import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from './db.js';
import { config } from './config.js';
import { audit } from './audit.js';
import { ROLES, hasRole } from './roles.js';
import { issueNonce, verifySiwe, revokeSession, sessionCookie, clearSessionCookie, readSessionToken, loadUser, requireAuth, requireRole } from './auth.js';
import { deriveLaunchState, LAUNCH_STATES, transitionRole, APP_TRANSITIONS } from './launchState.js';

const api = express.Router();
const ip = (req) => req.ip;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limiter = (max) => rateLimit({ windowMs: 60_000, limit: max, standardHeaders: true, legacyHeaders: false });

const dropDecimal = (r) => JSON.parse(JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));

// --- health and auth ---
api.get('/health', (_req, res) => res.json({ ok: true }));

api.get('/auth/nonce', limiter(30), wrap(async (_req, res) => {
  const { nonce, expiresAt } = await issueNonce();
  res.json({ nonce, expiresAt, chainId: config.chainId, domain: config.siweDomain });
}));

const siweBody = z.object({ message: z.string().min(10).max(4000), signature: z.string().regex(/^0x[0-9a-fA-F]+$/).max(400) });
api.post('/auth/siwe', limiter(20), wrap(async (req, res) => {
  const parsed = siweBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  const out = await verifySiwe({ ...parsed.data, ip: ip(req) });
  if (out.error) {
    await audit({ action: 'auth.failed', target: out.error, ip: ip(req) }).catch(() => {});
    return res.status(401).json({ error: out.error });
  }
  res.setHeader('Set-Cookie', sessionCookie(out.token));
  res.json({ user: { id: out.user.id, role: out.user.role, address: out.address } });
}));

api.post('/auth/signout', wrap(async (req, res) => {
  await revokeSession(readSessionToken(req), ip(req));
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ ok: true });
}));

api.get('/me', wrap(async (req, res) => {
  const u = await loadUser(req);
  if (!u) return res.status(401).json({ error: 'not_signed_in' });
  res.json({ id: u.id, role: u.role, address: u.wallet?.address ?? null, creatorProfile: u.creatorProfile ? { handle: u.creatorProfile.handle, displayName: u.creatorProfile.displayName, verified: u.creatorProfile.verified } : null });
}));

// --- collector dashboard, favorites, follows, activity (all from DB) ---
api.get('/dashboard', requireAuth, wrap(async (req, res) => {
  const address = req.user.wallet?.address ?? null;
  const [favorites, following, followers, purchases, listings, offers, ownedCount] = await Promise.all([
    prisma.favorite.findMany({ where: { userId: req.user.id }, include: { nftAsset: { include: { metadata: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.follow.count({ where: { followerId: req.user.id } }),
    prisma.follow.count({ where: { followingId: req.user.id } }),
    address ? prisma.activityEvent.findMany({ where: { eventName: 'purchased', actor: address }, orderBy: { blockNumber: 'desc' }, take: 50 }) : [],
    address ? prisma.activityEvent.findMany({ where: { eventName: 'listed', actor: address }, orderBy: { blockNumber: 'desc' }, take: 50 }) : [],
    address ? prisma.activityEvent.findMany({ where: { eventName: 'offer_created', actor: address }, orderBy: { blockNumber: 'desc' }, take: 50 }) : [],
    address ? prisma.nFTAsset.count({ where: { ownerAddress: address } }) : 0,
  ]);
  res.json(dropDecimal({
    // Each section is labelled by its source. Valuation is intentionally absent: no reliable pricing source is wired in.
    valuation: { available: false, reason: 'no reliable pricing source configured' },
    owned: { count: ownedCount, source: 'indexed Transfer state' },
    purchases: { items: purchases, source: 'indexed Sold events' },
    listings: { items: listings, source: 'indexed Listed events' },
    offersMade: { items: offers, source: 'indexed OfferMade events' },
    favorites: favorites.map((f) => ({ id: f.id, asset: f.nftAsset.id, tokenId: f.nftAsset.tokenId, contractAddress: f.nftAsset.contractAddress, placeholderArt: f.nftAsset.metadata?.isPlaceholder ?? true, name: f.nftAsset.metadata?.name ?? null })),
    social: { following, followers },
  }));
}));

api.post('/favorites/:assetId', requireAuth, wrap(async (req, res) => {
  const asset = await prisma.nFTAsset.findUnique({ where: { id: req.params.assetId } });
  if (!asset) return res.status(404).json({ error: 'not_found' });
  await prisma.favorite.upsert({ where: { userId_nftAssetId: { userId: req.user.id, nftAssetId: asset.id } }, create: { userId: req.user.id, nftAssetId: asset.id }, update: {} });
  res.json({ ok: true });
}));
api.delete('/favorites/:assetId', requireAuth, wrap(async (req, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.user.id, nftAssetId: req.params.assetId } });
  res.json({ ok: true });
}));

api.post('/follows/:userId', requireAuth, wrap(async (req, res) => {
  if (req.params.userId === req.user.id) return res.status(400).json({ error: 'cannot_follow_self' });
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) return res.status(404).json({ error: 'not_found' });
  await prisma.follow.upsert({ where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } }, create: { followerId: req.user.id, followingId: target.id }, update: {} });
  res.json({ ok: true });
}));
api.delete('/follows/:userId', requireAuth, wrap(async (req, res) => {
  await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId: req.params.userId } });
  res.json({ ok: true });
}));

api.get('/activity', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const events = await prisma.activityEvent.findMany({ orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }], take: limit });
  res.json({ items: dropDecimal(events), source: 'indexed chain logs' });
}));

// --- launchpad: public read, creator apply, moderator review, admin approve/publish ---
const projectBody = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
  name: z.string().min(2).max(120),
  description: z.string().min(20).max(4000),
  teamName: z.string().min(2).max(120),
  chainId: z.literal(config.chainId),
  mintPriceWei: z.string().regex(/^\d{1,40}$/),
  supply: z.number().int().positive().max(1_000_000),
  launchAt: z.string().datetime(),
  endAt: z.string().datetime(),
  riskDisclosure: z.string().min(20).max(4000),
  officialLinks: z.record(z.string().url()).optional(),
  artworkUrl: z.string().url().optional(),
});

function publicProject(p, mintedCount) {
  return { ...dropDecimal(p), state: deriveLaunchState(p, { mintedCount }), guaranteedReturns: false };
}

async function mintedFor(p) {
  if (!p.contractAddress) return null;
  return prisma.activityEvent.count({ where: { eventName: 'minted', contractAddress: p.contractAddress.toLowerCase() } });
}

api.get('/launchpad', wrap(async (_req, res) => {
  const rows = await prisma.launchpadProject.findMany({ where: { status: 'PUBLISHED' }, orderBy: { launchAt: 'asc' } });
  const items = await Promise.all(rows.map(async (p) => publicProject(p, await mintedFor(p))));
  res.json({ states: LAUNCH_STATES, items });
}));

api.get('/launchpad/:slug', wrap(async (req, res) => {
  const p = await prisma.launchpadProject.findUnique({ where: { slug: req.params.slug } });
  if (!p || p.status !== 'PUBLISHED') return res.status(404).json({ error: 'not_found' });
  res.json(publicProject(p, await mintedFor(p)));
}));

api.post('/launchpad/applications', requireAuth, requireRole('CREATOR'), wrap(async (req, res) => {
  const parsed = projectBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues.map((i) => i.path.join('.')) });
  const d = parsed.data;
  if (new Date(d.endAt) <= new Date(d.launchAt)) return res.status(400).json({ error: 'end_before_launch' });
  const p = await prisma.launchpadProject.create({
    data: { ...d, mintPriceWei: d.mintPriceWei, launchAt: new Date(d.launchAt), endAt: new Date(d.endAt), creatorId: req.user.id, status: 'DRAFT', artworkIsPlaceholder: !d.artworkUrl, officialLinks: d.officialLinks ?? null },
  });
  await audit({ actorId: req.user.id, action: 'launchpad.draft', target: p.id, ip: ip(req) });
  res.status(201).json(dropDecimal(p));
}));

// Owner-only transition to SUBMITTED. Review and publish are gated by role on the separate routes below.
api.post('/launchpad/applications/:id/submit', requireAuth, requireRole('CREATOR'), wrap(async (req, res) => {
  const p = await prisma.launchpadProject.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'not_found' });
  if (p.creatorId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  if (transitionRole(p.status, 'SUBMITTED') === null) return res.status(409).json({ error: 'invalid_transition', from: p.status });
  const updated = await prisma.launchpadProject.update({ where: { id: p.id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
  await audit({ actorId: req.user.id, action: 'launchpad.submit', target: p.id, ip: ip(req) });
  res.json(dropDecimal(updated));
}));

async function transition(req, res, to) {
  const p = await prisma.launchpadProject.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'not_found' });
  const need = transitionRole(p.status, to);
  if (need === null) return res.status(409).json({ error: 'invalid_transition', from: p.status, to });
  if (!hasRole(req.user.role, need[0])) {
    await audit({ actorId: req.user.id, action: 'authz.denied', target: p.id, metadata: { to, required: need[0] }, ip: ip(req) }).catch(() => {});
    return res.status(403).json({ error: 'forbidden', required: need[0] });
  }
  const data = { status: to, reviewedById: req.user.id };
  if (to === 'APPROVED') data.approvedAt = new Date();
  if (to === 'PUBLISHED') data.publishedAt = new Date();
  const updated = await prisma.launchpadProject.update({ where: { id: p.id }, data });
  await audit({ actorId: req.user.id, action: `launchpad.${to.toLowerCase()}`, target: p.id, metadata: { from: p.status }, ip: ip(req) });
  res.json(dropDecimal(updated));
}

api.post('/launchpad/applications/:id/review', requireAuth, requireRole('MODERATOR'), wrap(async (req, res) => {
  const to = req.body?.decision === 'reject' ? 'REJECTED' : req.body?.decision === 'approve' ? 'APPROVED' : 'UNDER_REVIEW';
  return transition(req, res, to);
}));
api.post('/launchpad/applications/:id/publish', requireAuth, requireRole('ADMINISTRATOR'), wrap(async (req, res) => transition(req, res, 'PUBLISHED')));

// --- administration ---
api.get('/admin/audit', requireAuth, requireRole('ADMINISTRATOR'), wrap(async (req, res) => {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: Math.min(Number(req.query.limit) || 100, 500) });
  res.json({ items: dropDecimal(rows) });
}));

const roleBody = z.object({ role: z.enum(ROLES) });
api.patch('/admin/users/:id/role', requireAuth, requireRole('ADMINISTRATOR'), wrap(async (req, res) => {
  const parsed = roleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'cannot_change_own_role' });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'not_found' });
  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  await audit({ actorId: req.user.id, action: 'admin.role_change', target: target.id, metadata: { from: target.role, to: parsed.data.role }, ip: ip(req) });
  res.json({ id: updated.id, role: updated.role });
}));

const configBody = z.object({ value: z.any() });
api.put('/admin/config/:key', requireAuth, requireRole('ADMINISTRATOR'), wrap(async (req, res) => {
  const parsed = configBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  // Fee and contract settings are not editable here: the contract owns them. Only display-level keys are accepted.
  const allowed = ['featured_collections', 'homepage_banner'];
  if (!allowed.includes(req.params.key)) return res.status(400).json({ error: 'key_not_editable' });
  const row = await prisma.platformConfiguration.upsert({ where: { key: req.params.key }, create: { key: req.params.key, value: parsed.data.value, updatedById: req.user.id }, update: { value: parsed.data.value, updatedById: req.user.id } });
  await audit({ actorId: req.user.id, action: 'admin.config', target: req.params.key, ip: ip(req) });
  res.json(dropDecimal(row));
}));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.siweOrigins, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use((err, _req, res, _next) => {
    console.error('request_error', err?.message);
    res.status(500).json({ error: 'server_error' });
  });
  return app;
}

export { APP_TRANSITIONS };
