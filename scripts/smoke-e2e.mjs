import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3001/api';
const db = new PrismaClient();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

async function signIn(account) {
  const nonceRes = await fetch(`${BASE}/auth/nonce`);
  const { nonce, domain, chainId } = await nonceRes.json();
  const msg = new SiweMessage({ domain, address: account.address, statement: 'Sign in to Orbix', uri: 'http://localhost:3001', version: '1', chainId, nonce, issuedAt: new Date().toISOString() }).prepareMessage();
  const signature = await account.signMessage({ message: msg });
  const res = await fetch(`${BASE}/auth/siwe`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3001' }, body: JSON.stringify({ message: msg, signature }) });
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { status: res.status, body: await res.json(), cookie };
}
const call = async (method, path, cookie, body) => {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

try {
  const creatorAcct = privateKeyToAccount(generatePrivateKey());
  const modAcct = privateKeyToAccount(generatePrivateKey());
  const adminAcct = privateKeyToAccount(generatePrivateKey());

  const c = await signIn(creatorAcct);
  check('siwe sign-in (creator wallet)', c.status === 200 && !!c.cookie, `status=${c.status}`);
  const m = await signIn(modAcct);
  check('siwe sign-in (moderator wallet)', m.status === 200, `status=${m.status}`);
  const a = await signIn(adminAcct);
  check('siwe sign-in (admin wallet)', a.status === 200, `status=${a.status}`);

  // replay the same signed message should fail
  const nonceRes = await fetch(`${BASE}/auth/nonce`);
  const { nonce, domain, chainId } = await nonceRes.json();
  const msg = new SiweMessage({ domain, address: creatorAcct.address, statement: 'Sign in to Orbix', uri: 'http://localhost:3001', version: '1', chainId, nonce, issuedAt: new Date().toISOString() }).prepareMessage();
  const sig = await creatorAcct.signMessage({ message: msg });
  const first = await call('POST', '/auth/siwe', null, { message: msg, signature: sig });
  const replay = await call('POST', '/auth/siwe', null, { message: msg, signature: sig });
  check('siwe nonce replay rejected', first.status === 200 && replay.status === 401, `first=${first.status} replay=${replay.status} ${JSON.stringify(replay.json)}`);

  const me = await call('GET', '/me', c.cookie);
  check('GET /me with session', me.status === 200 && me.json?.role === 'USER', `status=${me.status} role=${me.json?.role}`);

  const dash0 = await call('GET', '/dashboard', c.cookie);
  check('GET /dashboard signed in', dash0.status === 200, `status=${dash0.status} keys=${dash0.json ? Object.keys(dash0.json).join(',') : ''}`);

  // promote roles directly in DB (no public path exists for this)
  const creatorUser = await db.wallet.findUnique({ where: { address: creatorAcct.address.toLowerCase() } });
  const modUser = await db.wallet.findUnique({ where: { address: modAcct.address.toLowerCase() } });
  const adminUser = await db.wallet.findUnique({ where: { address: adminAcct.address.toLowerCase() } });
  await db.user.update({ where: { id: creatorUser.userId }, data: { role: 'CREATOR' } });
  await db.user.update({ where: { id: modUser.userId }, data: { role: 'MODERATOR' } });
  await db.user.update({ where: { id: adminUser.userId }, data: { role: 'ADMINISTRATOR' } });

  const slug = `e2e-${Date.now().toString(36)}`;
  const launchAt = new Date(Date.now() + 86400e3).toISOString();
  const endAt = new Date(Date.now() + 7 * 86400e3).toISOString();
  const body = { slug, name: 'E2E Test Drop', description: 'A throwaway project created by the end to end smoke test.', teamName: 'Test Team', chainId: 11155111, mintPriceWei: '1000000000000000', supply: 10, launchAt, endAt, riskDisclosure: 'Testnet only. No guaranteed returns. Not audited.' };

  const bad = await call('POST', '/launchpad/applications', c.cookie, { ...body, supply: -1 });
  check('apply rejects invalid body', bad.status === 400, `status=${bad.status} ${JSON.stringify(bad.json)}`);

  const apply = await call('POST', '/launchpad/applications', c.cookie, body);
  check('creator applies (DRAFT)', apply.status === 201 && apply.json?.status === 'DRAFT', `status=${apply.status} state=${apply.json?.status}`);
  const id = apply.json?.id;

  const plain = await signIn(privateKeyToAccount(generatePrivateKey()));
  const userApply = await call('POST', '/launchpad/applications', plain.cookie, { ...body, slug: slug + 'x' });
  check('plain USER cannot apply (403)', userApply.status === 403, `status=${userApply.status}`);

  const pub0 = await call('GET', `/launchpad/${slug}`);
  check('draft is not public (404)', pub0.status === 404, `status=${pub0.status}`);

  const submit = await call('POST', `/launchpad/applications/${id}/submit`, c.cookie);
  check('creator submits (SUBMITTED)', submit.status === 200 && submit.json?.status === 'SUBMITTED', `status=${submit.status}`);

  const modPublish = await call('POST', `/launchpad/applications/${id}/publish`, m.cookie);
  check('moderator cannot publish (403, needs ADMINISTRATOR)', modPublish.status === 403, `status=${modPublish.status} ${JSON.stringify(modPublish.json)}`);

  const review = await call('POST', `/launchpad/applications/${id}/review`, m.cookie, { decision: 'approve' });
  check('moderator review approve is forbidden (needs ADMIN)', review.status === 403, `status=${review.status} ${JSON.stringify(review.json)}`);

  const adminApprove = await call('POST', `/launchpad/applications/${id}/review`, a.cookie, { decision: 'approve' });
  check('admin approves (APPROVED)', adminApprove.status === 200 && adminApprove.json?.status === 'APPROVED', `status=${adminApprove.status}`);

  const publish = await call('POST', `/launchpad/applications/${id}/publish`, a.cookie);
  check('admin publishes (PUBLISHED)', publish.status === 200 && publish.json?.status === 'PUBLISHED', `status=${publish.status}`);

  const list = await call('GET', '/launchpad');
  const listed = list.json?.items?.find((p) => p.slug === slug);
  check('published project in public list with derived state', list.status === 200 && !!listed, `state=${listed?.state} guaranteedReturns=${listed?.guaranteedReturns}`);

  const one = await call('GET', `/launchpad/${slug}`);
  check('public detail returns project', one.status === 200 && one.json?.slug === slug, `status=${one.status} state=${one.json?.state}`);

  const audit = await call('GET', '/admin/audit', a.cookie);
  check('admin reads audit log', audit.status === 200 && audit.json?.items?.length > 0, `rows=${audit.json?.items?.length}`);

  const denied = await call('GET', '/admin/audit', c.cookie);
  check('creator cannot read audit (403)', denied.status === 403, `status=${denied.status}`);

  const roleChange = await call('PATCH', `/admin/users/${creatorUser.userId}/role`, a.cookie, { role: 'USER' });
  check('admin changes role', roleChange.status === 200 && roleChange.json?.role === 'USER', `status=${roleChange.status}`);
  const selfChange = await call('PATCH', `/admin/users/${adminUser.userId}/role`, a.cookie, { role: 'USER' });
  check('admin cannot change own role (400)', selfChange.status === 400, `status=${selfChange.status}`);

  const cfg = await call('PUT', '/admin/config/fee_bps', a.cookie, { value: 999 });
  check('config rejects non-display key (400)', cfg.status === 400, `status=${cfg.status}`);

  const fav = await call('POST', '/favorites/does-not-exist', c.cookie);
  check('favorite unknown asset 404', fav.status === 404, `status=${fav.status}`);

  const follow = await call('POST', `/follows/${modUser.userId}`, c.cookie);
  check('follow another user', follow.status === 200, `status=${follow.status}`);
  const selfFollow = await call('POST', `/follows/${creatorUser.userId}`, c.cookie);
  check('cannot follow self (400)', selfFollow.status === 400, `status=${selfFollow.status}`);

  const dash = await call('GET', '/dashboard', c.cookie);
  check('dashboard reports following=1 and valuation unavailable', dash.status === 200 && dash.json?.social?.following === 1 && dash.json?.valuation?.available === false, `social=${JSON.stringify(dash.json?.social)}`);

  const out = await call('POST', '/auth/signout', c.cookie);
  const after = await call('GET', '/me', c.cookie);
  check('signout revokes session', out.status === 200 && after.status === 401, `after=${after.status}`);

  // cleanup the test rows so the local DB stays tidy
  await db.launchpadProject.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
} catch (e) {
  check('script ran without exception', false, e.stack?.split('\n').slice(0, 3).join(' | '));
} finally {
  await db.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nTOTAL ${results.length} checks, ${results.length - failed.length} pass, ${failed.length} fail`);
}
