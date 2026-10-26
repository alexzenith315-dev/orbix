import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasRole } from '../server/roles.js';

test('role ladder enforced', () => {
  assert.equal(hasRole('USER', 'CREATOR'), false);
  assert.equal(hasRole('CREATOR', 'CREATOR'), true);
  assert.equal(hasRole('MODERATOR', 'ADMINISTRATOR'), false);
  assert.equal(hasRole('ADMINISTRATOR', 'MODERATOR'), true);
  assert.equal(hasRole('bogus', 'USER'), false);
});
