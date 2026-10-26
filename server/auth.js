import crypto from 'node:crypto';
import { SiweMessage, generateNonce } from 'siwe';
import { prisma } from './db.js';
import { config } from './config.js';
import { audit } from './audit.js';
import { hasRole } from './roles.js';

const COOKIE = 'orbix_session';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function issueNonce() {
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + config.nonceTtlMinutes * 60_000);
  await prisma.siweNonce.create({ data: { nonce, expiresAt } });
  return { nonce, expiresAt };
}

// Atomically consume a nonce: only one request can ever flip consumedAt from null, so a replayed signature fails.
async function consumeNonce(nonce) {
  const res = await prisma.siweNonce.updateMany({
    where: { nonce, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  return res.count === 1;
}

export async function verifySiwe({ message, signature, ip }) {
  let siwe;
  try {
    siwe = new SiweMessage(message);
  } catch {
    return { error: 'invalid_message' };
  }
  const allowedHosts = [config.siweDomain, ...config.siweOrigins.map((o) => { try { return new URL(o).host; } catch { return null; } })].filter(Boolean);
  if (!allowedHosts.includes(siwe.domain)) return { error: 'domain_mismatch' };
  if (siwe.chainId !== config.chainId) return { error: 'chain_mismatch' };
  if (siwe.expirationTime && new Date(siwe.expirationTime) < new Date()) return { error: 'expired' };

  const result = await siwe.verify({ signature, domain: siwe.domain, time: new Date().toISOString() }, { suppressExceptions: true });
  if (!result.success) return { error: 'bad_signature' };

  if (!(await consumeNonce(siwe.nonce))) return { error: 'nonce_replayed_or_expired' };

  const address = siwe.address.toLowerCase();
  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.wallet.findUnique({ where: { address }, include: { user: true } });
    if (existing) {
      await tx.wallet.update({ where: { id: existing.id }, data: { lastSignInAt: new Date() } });
      return existing.user;
    }
    return tx.user.create({
      data: { wallet: { create: { address, chainId: config.chainId, lastSignInAt: new Date() } } },
    });
  });

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + config.sessionTtlHours * 3600_000) },
  });
  await audit({ actorId: user.id, action: 'auth.signin', target: address, ip });
  return { token, user, address };
}

export async function revokeSession(token, ip) {
  if (!token) return;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (s && !s.revokedAt) {
    await prisma.session.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
    await audit({ actorId: s.userId, action: 'auth.signout', target: s.id, ip });
  }
}

export function readSessionToken(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
}

export function sessionCookie(token) {
  const maxAge = config.sessionTtlHours * 3600;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

// Loads the user from the session. Role comes from the database only.
export async function loadUser(req) {
  const token = readSessionToken(req);
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { include: { wallet: true, creatorProfile: true } } } });
  if (!s || s.revokedAt || s.expiresAt < new Date()) return null;
  return s.user;
}

export async function requireAuth(req, res, next) {
  const user = await loadUser(req);
  if (!user) return res.status(401).json({ error: 'not_signed_in' });
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'not_signed_in' });
    if (!hasRole(req.user.role, role)) {
      audit({ actorId: req.user.id, action: 'authz.denied', target: req.originalUrl, metadata: { required: role }, ip: req.ip }).catch(() => {});
      return res.status(403).json({ error: 'forbidden', required: role });
    }
    next();
  };
}
