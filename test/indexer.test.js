import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeEventTopics, encodeAbiParameters, pad } from 'viem';
import { decodeLog, toActivity } from '../server/indexer.js';
import marketplaceAbi from '../src/abi/OrbixMarketplace.json' with { type: 'json' };

const soldEvent = marketplaceAbi.find((x) => x.type === 'event' && x.name === 'Sold');
const topics = encodeEventTopics({ abi: [soldEvent], eventName: 'Sold', args: { listingId: 7n, buyer: '0x0000000000000000000000000000000000000001' } });
const data = encodeAbiParameters(soldEvent.inputs.filter((i) => !i.indexed), [10n, 1n, 0n]);

const log = {
  address: '0x1114225702ed905Cb6bc2A74882EAFE702e0F53A',
  topics, data,
  transactionHash: '0x' + 'ab'.repeat(32),
  logIndex: 3, blockNumber: 100n, blockHash: '0x' + '11'.repeat(32),
};

test('decodes a real Sold log into an activity row', () => {
  const d = decodeLog(log);
  assert.equal(d.eventName, 'Sold');
  const row = toActivity(log, d, 11155111);
  assert.equal(row.eventName, 'purchased');
  assert.equal(row.actor, '0x0000000000000000000000000000000000000001');
  assert.equal(row.data.price, '10');
  assert.equal(row.logIndex, 3);
});

test('unknown log yields no activity (nothing synthesized)', () => {
  assert.equal(decodeLog({ ...log, topics: ['0x' + '00'.repeat(32)], data: '0x' }), null);
});
