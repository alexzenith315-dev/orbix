import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveLaunchState, transitionRole } from '../server/launchState.js';

const p = { launchAt: '2030-01-10T00:00:00Z', endAt: '2030-01-20T00:00:00Z', supply: 10, cancelledAt: null };
const at = (s) => new Date(s);

test('upcoming before launch', () => {
  assert.equal(deriveLaunchState(p, { now: at('2029-12-31T00:00:00Z') }), 'UPCOMING');
});
test('live inside window', () => {
  assert.equal(deriveLaunchState(p, { now: at('2030-01-15T00:00:00Z'), mintedCount: 3 }), 'LIVE');
});
test('sold out when indexed mints reach supply', () => {
  assert.equal(deriveLaunchState(p, { now: at('2030-01-15T00:00:00Z'), mintedCount: 10 }), 'SOLD_OUT');
});
test('completed after end', () => {
  assert.equal(deriveLaunchState(p, { now: at('2030-02-01T00:00:00Z') }), 'COMPLETED');
});
test('cancelled wins over every other state', () => {
  assert.equal(deriveLaunchState({ ...p, cancelledAt: new Date() }, { now: at('2030-01-15T00:00:00Z') }), 'CANCELLED');
});
test('only administrators approve or publish', () => {
  assert.deepEqual(transitionRole('SUBMITTED', 'APPROVED'), ['ADMINISTRATOR']);
  assert.deepEqual(transitionRole('APPROVED', 'PUBLISHED'), ['ADMINISTRATOR']);
  assert.equal(transitionRole('DRAFT', 'PUBLISHED'), null);
  assert.equal(transitionRole('REJECTED', 'APPROVED'), null);
});
