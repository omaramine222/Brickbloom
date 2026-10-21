const test = require('node:test'), assert = require('node:assert/strict');
const X = require('../src/extras'), G = require('../src/game');
const DAY = 86400000, T0 = 20000 * DAY + 3600000;
test('daily reward: claim once per day, streak grows, resets after a missed day, day 7 gives a crate', () => {
  const u = G.newUser('dee', 'h');
  assert.equal(X.dailyView(u, T0).canClaim, true);
  let r = X.claimDaily(u, T0); assert.deepEqual([r.ok, r.streak, r.gems], [true, 1, 20]); assert.equal(u.gems, 20);
  assert.equal(X.claimDaily(u, T0 + 1000).ok, false);
  for (let d = 1; d < 7; d++) r = X.claimDaily(u, T0 + d * DAY);
  assert.equal(r.streak, 7); assert.equal(r.crate, true); assert.equal(u.inv[27], 1);
  assert.equal(X.claimDaily(u, T0 + 7 * DAY).streak, 1, 'wraps after 7');
  assert.equal(X.claimDaily(u, T0 + 10 * DAY).streak, 1, 'missed days reset streak');
});
test('leaderboards: staff never appear on the richest board', () => {
  const us = { o: { ...G.newUser('Omar', 'h', 'owner'), gems: 1e6, xp: 50 }, a: { ...G.newUser('ann', 'h'), gems: 500, xp: 9000 }, b: { ...G.newUser('bob', 'h', 'admin'), gems: 9999 } };
  const L = X.leaders(us); assert.deepEqual(L.rich.map(x => x.name), ['ann']); assert.equal(L.level[0].name, 'ann');
});
test('trade history: owner sees all trades + sales, players only their own', () => {
  const rows = [{ t: 1, type: 'trade', a: 'ann', b: 'bob', offers: { a: { items: [[7, 1]], gems: 0 }, b: { items: [], gems: 5 } }, ok: true },
    { t: 2, type: 'trade', a: 'cy', b: 'dan', offers: { a: { items: [], gems: 1 }, b: { items: [], gems: 0 } }, ok: true },
    { t: 3, type: 'vend_buy', u: 'dan', seller: 'ann', item: 7, qty: 2, cost: 10, w: 'X' }, { t: 4, type: 'trade', a: 'ann', b: 'cy', ok: false, offers: {} }];
  assert.equal(X.tradeHistory(rows, { username: 'Omar', role: 'owner' }).length, 3);
  const ann = X.tradeHistory(rows, { username: 'ann', role: 'user' }); assert.equal(ann.length, 2); assert.equal(ann[0].kind, 'vend');
  assert.equal(X.tradeHistory(rows, { username: 'ann', role: 'admin' }).length, 2, 'admins do not see everyone');
  assert.equal(X.tradeHistory(rows, { username: 'zed', role: 'user' }).length, 0);
});
test('FARM worlds: dirt shelves you can plant rows of trees on', () => {
  const w = X.generateFarm('FARMOMAR'); assert.ok(w.farm); const u = G.newUser('f', 'h'); u.inv[1001] = 20;
  let planted = 0; for (let x = 10; x < 30; x++) if (G.place(w, u, x, 17, 1001).ok) planted++;
  assert.equal(planted, 20); assert.ok(X.FARM.test('FARM') && X.FARM.test('FARMOMAR') && !X.FARM.test('START'));
  assert.equal(w.fg[(w.spawn.y + 1) * w.w + w.spawn.x] !== 0, true, 'spawn stands on something');
});
