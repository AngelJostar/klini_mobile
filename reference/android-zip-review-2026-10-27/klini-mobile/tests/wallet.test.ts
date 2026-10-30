import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWallet, rechargeWallet, walletTotals } from '../src/domain/wallet';
import { appReducer, hydrateState } from '../src/domain/reducer';
import { createDemoState } from '../src/domain/seed';

test('wallet keeps recharge limits, unique movements and totals', () => {
  for (const amount of [0, 9, 10.001, 100010, NaN, Infinity, -10])
    assert.throws(() => rechargeWallet(initialWallet, amount, 'one', '27/10/2026'));
  const next = rechargeWallet(initialWallet, 200, 'one', '27/10/2026');
  assert.equal(next.balance, 1060);
  assert.equal(rechargeWallet(initialWallet, 15, 'fifteen', '27/10/2026').balance, 875);
  const cents = rechargeWallet(initialWallet, 123.45, 'cents', '27/10/2026');
  assert.equal(cents.balance, 983.45);
  assert.equal(cents.movements[0].amount, 123.45);
  assert.deepEqual(walletTotals(next), { credits: 200, debits: 0, count: 1 });
  assert.equal(initialWallet.movements.length, 0);
  assert.throws(() => rechargeWallet(next, 200, 'one', '27/10/2026'));
});
test('old saved accounts gain wallet without losing data; corrupt wallet rejected', () => {
  const old = createDemoState();
  const restored = hydrateState(JSON.stringify(old));
  assert.equal(restored.error, null);
  assert.deepEqual(restored.state.profile, old.profile);
  assert.equal(restored.state.wallet?.balance, 860);
  const next = appReducer(restored.state, {
    type: 'RECHARGE_WALLET',
    amount: 10,
    id: 'two',
    date: '27/10/2026',
  });
  assert.equal(hydrateState(JSON.stringify(next)).state.wallet?.balance, 870);
  assert.ok(hydrateState(JSON.stringify({ ...old, wallet: { balance: -1, movements: [] } })).error);
});
