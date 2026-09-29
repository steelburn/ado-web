import assert from 'node:assert/strict';
import test from 'node:test';
import { VaultAdapter } from '../src/vault/adapter.js';
import { checkout } from '../src/checkout.js';

const fakeVault = () => {
  const store = new Map();
  let n = 0;
  return {
    issue: (id, pan) => { const t = `tok_${++n}_${pan.slice(-4)}`; store.set(id, t); return t; },
    get: (id) => store.get(id),
    reissue: (tok) => `${tok}_r`,
  };
};

test('write then read returns the issued token', async () => {
  const adapter = new VaultAdapter(fakeVault());
  const tok = await adapter.write('c1', '4111111111111111');
  assert.equal(await adapter.read('c1'), tok);
});

test('rotate reissues an existing token', async () => {
  const vault = fakeVault();
  const adapter = new VaultAdapter(vault);
  const tok = await adapter.write('c1', '4111111111111111');
  assert.equal(await adapter.rotate('c1'), `${tok}_r`);
});

test('rotate without a token throws', async () => {
  const adapter = new VaultAdapter(fakeVault());
  await assert.rejects(() => adapter.rotate('missing'), /no token/);
});

test('checkout tokens a card with no token on file', async () => {
  const res = await checkout({ cardId: 'c1', pan: '4111111111111111', hasTokenOnFile: false }, fakeVault());
  assert.equal(res.charged, true);
  assert.match(res.token, /^tok_/);
});
