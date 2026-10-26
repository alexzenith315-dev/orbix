import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server/app.js';
import { buildSiweMessage } from '../src/api/siweMessage.js';

// These run with no cookie, so every guard answers before any database query.
// They pin the public contract the frontend relies on: 401 when signed out, 404 for unknown routes.
let server;
let base;

before(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function get(path, init = {}) {
  const res = await fetch(`${base}${path}`, init);
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

test('health is public', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});

test('nonce endpoint issues a nonce and chain id for the SIWE flow', async () => {
  const r = await get('/auth/nonce');
  assert.equal(r.status, 200);
  assert.equal(typeof r.json.nonce, 'string');
  assert.ok(r.json.nonce.length >= 8);
  assert.equal(r.json.chainId, 11155111);
  assert.equal(typeof r.json.domain, 'string');
});

test('signed-out session probe returns not_signed_in', async () => {
  const r = await get('/me');
  assert.equal(r.status, 401);
  assert.equal(r.json.error, 'not_signed_in');
});

test('dashboard, favorites, follows and launchpad applications require a session', async () => {
  for (const [method, path] of [
    ['GET', '/dashboard'],
    ['POST', '/favorites/1'],
    ['DELETE', '/favorites/1'],
    ['POST', '/follows/1'],
    ['DELETE', '/follows/1'],
    ['GET', '/launchpad/applications'],
    ['POST', '/launchpad/applications'],
    ['GET', '/admin/audit'],
  ]) {
    const r = await get(path, { method, headers: { 'content-type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    assert.equal(r.status, 401, `${method} ${path} should be 401 when signed out, got ${r.status}`);
  }
});

test('admin routes are not reachable without a session', async () => {
  const r = await get('/admin/users/1/role', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
});

test('signout without a session is harmless', async () => {
  const r = await get('/auth/signout', { method: 'POST' });
  assert.ok([200, 401].includes(r.status), `unexpected ${r.status}`);
});

test('unknown api route returns a JSON 404, not an HTML page', async () => {
  const r = await get('/does-not-exist');
  assert.equal(r.status, 404);
  assert.equal(r.json.error, 'not_found');
});

test('siwe body validation rejects an empty payload before verifying', async () => {
  const r = await get('/auth/siwe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.ok([400, 401].includes(r.status), `unexpected ${r.status}`);
});

test('SIWE message builder matches the EIP-4361 shape the server parses', () => {
  const msg = buildSiweMessage({
    domain: 'localhost:5173',
    address: '0x0000000000000000000000000000000000000001',
    chainId: 11155111,
    nonce: 'abcdefgh12345678',
    uri: 'http://localhost:5173',
  });
  const lines = msg.split('\n');
  assert.equal(lines[0], 'localhost:5173 wants you to sign in with your Ethereum account:');
  assert.equal(lines[1], '0x0000000000000000000000000000000000000001');
  assert.ok(lines.includes('URI: http://localhost:5173'));
  assert.ok(lines.includes('Version: 1'));
  assert.ok(lines.includes('Chain ID: 11155111'));
  assert.ok(lines.includes('Nonce: abcdefgh12345678'));
  assert.ok(lines.some((l) => l.startsWith('Issued At: ')));
});
