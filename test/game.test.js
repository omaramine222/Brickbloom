process.env.NO_LOG_FILE = '1';
const test = require('node:test'), assert = require('node:assert/strict');
const I = require('../src/items'), G = require('../src/game'), E = require('../src/economy');
const U = (name, role = 'user') => ({ ...G.newUser(name, 'x', role), inv: {} });
const seq = (...v) => { let k = 0; return () => v[k++ % v.length]; };
function flatWorld() { const w = G.generateWorld('TEST'); w.fg.fill(0); w.bg.fill(0); for (let x = 0; x < w.w; x++) w.fg[30 * w.w + x] = 2; return w; }

test('catalogue has 150+ original items with rarity and value', () => {
  const all = Object.values(I.ITEMS); assert.ok(all.length >= 150);
  for (const it of all) { assert.ok(I.RARITY.includes(it.rarity)); assert.ok(it.value > 0); }
  assert.ok(!all.some(it => /growtopia|world lock|dirt\b/i.test(it.name)));
});
test('world generation: size, bedrock, magma, spawn gate', () => {
  const w = G.generateWorld('ABC'); assert.equal(w.w, 100); assert.equal(w.h, 60);
  assert.equal(w.fg[w.spawn.y * w.w + w.spawn.x], 5); assert.ok(w.fg.includes(3)); assert.equal(w.fg[59 * 100 + 3], 4);
  assert.deepEqual(G.generateWorld('ABC').fg, w.fg);
});
test('break takes several hits, place uses inventory, separate layers', () => {
  const w = flatWorld(), u = U('a'); const t = 1000;
  for (let k = 1; k < 5; k++) assert.ok(G.hit(w, u, 5, 30, t + k, () => 0.99).progress);
  const r = G.hit(w, u, 5, 30, t + 6, () => 0.99); assert.equal(r.broken, 2); assert.equal(w.fg[30 * 100 + 5], 0);
  assert.equal(G.hit(w, u, 5, 30).err, 'empty');
  assert.equal(G.place(w, u, 5, 30, 1).err, 'noitem');
  G.invAdd(u, 1, 2); G.invAdd(u, 6, 1);
  assert.ok(G.place(w, u, 5, 29, 6).ok); assert.ok(G.place(w, u, 5, 29, 1).ok);
  assert.equal(w.bg[29 * 100 + 5], 6); assert.equal(w.fg[29 * 100 + 5], 1); assert.equal(u.inv[1], 1);
  assert.equal(G.place(w, u, 5, 29, 1).err, 'occupied');
  assert.equal(G.hit(w, u, 0, w.h - 1, 1).err, 'empty');
  w.fg[0] = 4; assert.equal(G.hit(w, u, 0, 0).err, 'unbreakable');
});
test('bad input never throws', () => {
  const w = flatWorld(), u = U('a');
  for (const v of [-1, 1e9, NaN, 'x', null, 1.5, {}]) { assert.equal(G.hit(w, u, v, v).ok, false); assert.equal(G.place(w, u, v, 3, v).ok, false); }
  assert.equal(G.splice(u, 'a', null).ok, false); assert.equal(G.buy(u, '__proto__').ok, false); assert.equal(G.canCommand(u, 'constructor'), false);
});
test('drops: seeds and gems fall on the ground and can be picked up', () => {
  const w = flatWorld(), u = U('a'); w.fg[30 * 100 + 7] = 22; // gemrock
  let r; for (let k = 0; k < 6; k++) r = G.hit(w, u, 7, 30, 100 + k, () => 0.01);
  const gem = r.drops.find(d => d.item === I.GEM_DROP); assert.ok(gem && gem.count >= 5);
  assert.ok(r.drops.find(d => d.item === 1022));
  assert.equal(G.pickup(w, u, { x: 50, y: 10 }, gem.id).err, 'far');
  const n = gem.count; assert.ok(G.pickup(w, u, { x: 7, y: 30 }, gem.id).ok); assert.equal(u.gems, n); assert.ok(!w.drops.includes(gem));
});
test('seeds grow over time and harvest gives blocks', () => {
  const w = flatWorld(), u = U('a'); G.invAdd(u, 1001, 1);
  assert.equal(G.place(w, u, 10, 20, 1001).err, 'needsoil');
  assert.ok(G.place(w, u, 10, 29, 1001, 0).ok);
  assert.ok(G.hit(w, u, 10, 29, 1000).growing);
  const r = G.hit(w, u, 10, 29, I.growMs(1) + 1, () => 0.1);
  assert.ok(r.harvested); assert.ok(r.drops.some(d => d.item === 1 && d.count >= 1)); assert.equal(w.fg[29 * 100 + 10], 0);
});
test('splicing two seeds makes a new seed', () => {
  const u = U('a'); G.invAdd(u, 1001, 1); G.invAdd(u, 1002, 1);
  const r = G.splice(u, 1001, 1002); assert.ok(r.ok); assert.equal(r.result, 1007); assert.equal(u.inv[1007], 1); assert.ok(!u.inv[1001]);
  G.invAdd(u, 1001, 1); G.invAdd(u, 1005 - 4 + 4, 0);
  assert.equal(G.splice(u, 1001, 1001).ok, false);
  assert.equal(G.splice(u, 1001, 1002).err, 'noitem');
});
test('world seal: only owner + invited can build; staff lock', () => {
  const w = flatWorld(), o = U('own'), g = U('guest'), f = U('friend'); G.invAdd(o, 19, 1); [o, g, f].forEach(u => G.invAdd(u, 1, 5));
  assert.ok(G.place(w, o, 3, 29, 19).ok); assert.equal(w.owner, 'own');
  assert.equal(G.place(w, g, 4, 29, 1).err, 'locked'); assert.equal(G.hit(w, g, 6, 30).err, 'locked');
  assert.equal(G.hit(w, g, 3, 29).err, 'locked');
  w.access.push('friend'); assert.ok(G.place(w, f, 4, 29, 1).ok);
  assert.equal(G.hit(w, f, 3, 29).err, 'locked'); // friend can't remove the seal
  G.invAdd(g, 19, 1); assert.equal(G.place(w, g, 8, 29, 19).err, 'alreadylocked');
  w.adminLocked = true; assert.equal(G.place(w, U('x'), 9, 29, 1).err, 'noitem'); const x = U('x'); G.invAdd(x, 1, 1); assert.equal(G.place(w, x, 9, 29, 1).err, 'locked');
});
test('trade is atomic and validated', () => {
  const a = U('a'), b = U('b'); G.invAdd(a, 1, 10); a.gems = 50; G.invAdd(b, 2, 3);
  assert.ok(G.executeTrade(a, b, { items: [[1, 4]], gems: 20 }, { items: [[2, 3]], gems: 0 }).ok);
  assert.equal(a.inv[1], 6); assert.equal(a.inv[2], 3); assert.equal(b.inv[1], 4); assert.equal(b.gems, 20); assert.equal(a.gems, 30); assert.ok(!b.inv[2]);
  // cannot offer what you don't have; nothing changes
  const snap = JSON.stringify([a, b]);
  assert.equal(G.executeTrade(a, b, { items: [[1, 99]], gems: 0 }, { items: [], gems: 0 }).ok, false);
  assert.equal(G.executeTrade(a, b, { items: [[1, 1], [1, 6]], gems: 0 }, { items: [], gems: 0 }).ok, false); // duplicate-line dupe attempt
  assert.equal(G.executeTrade(a, b, { items: [[1, -5]], gems: 0 }, { items: [], gems: 0 }).ok, false);
  assert.equal(G.executeTrade(a, b, { items: [], gems: -10 }, { items: [], gems: 0 }).ok, false);
  assert.equal(JSON.stringify([a, b]), snap);
  // receiver full -> rollback everything
  for (let k = 0; k < 40; k++) G.invAdd(b, 100 + k, 1);
  const s2 = JSON.stringify([a, b]);
  assert.equal(G.executeTrade(a, b, { items: [[2, 1]], gems: 5 }, { items: [[100, 1]], gems: 0 }).ok, true);
  const c = U('c'); for (let k = 0; k < 40; k++) G.invAdd(c, 150 + k, 1); G.invAdd(a, 3, 1);
  const s3 = JSON.stringify([a, c]);
  assert.equal(G.executeTrade(a, c, { items: [[3, 1]], gems: 0 }, { items: [], gems: 0 }).ok, false);
  assert.equal(JSON.stringify([a, c]), s3); void s2;
});
test('roles: owner-only spawning and promotion; admins/mods moderation only', () => {
  const owner = U('omar', 'owner'), admin = U('ad', 'admin'), mod = U('md', 'mod'), user = U('us');
  for (const c of ['give', 'gems', 'spawn', 'setrole', 'ban']) { assert.equal(G.canCommand(admin, c), false, c); assert.equal(G.canCommand(mod, c), false, c); assert.equal(G.canCommand(user, c), false, c); assert.ok(G.canCommand(owner, c)); }
  for (const c of ['kick', 'mute', 'tempban', 'tp']) { assert.ok(G.canCommand(mod, c)); assert.ok(G.canCommand(admin, c)); assert.equal(G.canCommand(user, c), false); }
  assert.ok(G.canCommand(admin, 'lockworld')); assert.equal(G.canCommand(mod, 'lockworld'), false);
  assert.equal(G.giveItem(admin, admin, 1, 50).err, 'perm'); assert.ok(!admin.inv[1]);
  assert.equal(G.giveGems(admin, user, 999).err, 'perm'); assert.equal(user.gems, 0);
  assert.equal(G.setRole(admin, user, 'admin').err, 'perm'); assert.equal(user.role, 'user');
  assert.equal(G.setRole(mod, mod, 'admin').err, 'perm');
  assert.ok(G.giveItem(owner, user, 13, 5).ok); assert.equal(user.inv[13], 5);
  assert.ok(G.setRole(owner, user, 'mod').ok); assert.equal(user.role, 'mod'); assert.ok(G.setRole(owner, user, 'user').ok);
  assert.equal(G.setRole(owner, owner, 'user').err, 'owner'); assert.equal(G.setRole(owner, user, 'owner').err, 'badrole');
  assert.equal(G.canTarget(mod, admin), false); assert.equal(G.canTarget(admin, owner), false); assert.ok(G.canTarget(admin, mod)); assert.ok(G.canTarget(owner, admin));
});
test('shop uses gems only', () => {
  const u = U('a'); assert.equal(G.buy(u, 'starter').err, 'gems'); u.gems = 60; assert.ok(G.buy(u, 'starter').ok); assert.equal(u.gems, 10); assert.equal(u.inv[7], 10);
});
test('vending: stock, buy atomically, price-change guard, collect', () => {
  const w = flatWorld(), s = U('seller'), b = U('buyer'); G.invAdd(s, 25, 1); G.invAdd(s, 13, 10);
  assert.ok(G.place(w, s, 20, 29, 25).ok);
  assert.equal(E.vendStock(w, b, 20, 29, 13, 1, 5).err, 'notyours');
  assert.ok(E.vendStock(w, s, 20, 29, 13, 4, 7).ok); assert.equal(s.inv[13], 6);
  assert.equal(E.vendBuy(w, b, 20, 29, 2).err, 'gems'); assert.ok(!b.inv[13]);
  b.gems = 100; assert.equal(E.vendBuy(w, b, 20, 29, 1, 3).err, 'pricechanged');
  assert.equal(E.vendBuy(w, b, 20, 29, 9).err, 'stock');
  assert.ok(E.vendBuy(w, b, 20, 29, 2, 7).ok); assert.equal(b.gems, 86); assert.equal(b.inv[13], 2);
  assert.equal(E.vendCollect(w, b, 20, 29).ok, false); assert.equal(E.vendCollect(w, s, 20, 29).gems, 14); assert.equal(s.gems, 14);
  assert.equal(G.hit(w, b, 20, 29).ok, true); // hit progress ok but cannot break someone's box
  for (let k = 0; k < 5; k++) G.hit(w, b, 20, 29, 50 + k); assert.equal(w.fg[29 * 100 + 20], 25);
});
test('seal currency converts 100:1 both ways', () => {
  const u = U('a'); G.invAdd(u, 19, 150);
  assert.ok(E.convertSeal(u, 19, 'up').ok); assert.equal(u.inv[19], 50); assert.equal(u.inv[23], 1);
  assert.equal(E.convertSeal(u, 19, 'up').err, 'need100'); assert.equal(u.inv[19], 50);
  assert.ok(E.convertSeal(u, 23, 'down').ok); assert.equal(u.inv[19], 150); assert.ok(!u.inv[23]);
  assert.equal(E.convertSeal(u, 1, 'up').ok, false);
});
test('Patch-Up Clinic: right steps win, two wrong fail', () => {
  const u = U('doc'); G.invAdd(u, 26, 2);
  const st = E.clinicStart(u, seq(0.5, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6)).state; assert.ok(st.symptom);
  let r; while (u.clinic) r = E.clinicUse(u, E.SYMPTOMS[u.clinic.steps[u.clinic.at]], () => 0.9);
  assert.ok(r.success); assert.ok(u.gems > 0);
  E.clinicStart(u); const wrong = E.TOOLS.find(t => t !== E.SYMPTOMS[u.clinic.steps[0]]);
  E.clinicUse(u, wrong); r = E.clinicUse(u, wrong); assert.equal(r.success, false); assert.ok(!u.clinic);
  assert.equal(E.clinicStart(u).err, 'needkit');
});
test('Mystery Crate: gems-only, published rates sum to 100', () => {
  assert.equal(E.CRATE_TABLE.reduce((a, e) => a + e[0], 0), 100);
  const u = U('a'); assert.equal(E.openCrate(u).err, 'nocrate'); G.invAdd(u, 27, 1);
  assert.ok(E.openCrate(u, () => 0.0).ok); assert.equal(u.gems, 60); assert.ok(!u.inv[27]);
});
test('daily quests track, claim once, reset next day', () => {
  const u = U('q'), day1 = Date.UTC(2026, 9, 20, 12);
  const qs = E.quests(u, day1); assert.equal(qs.length, 3);
  const q = qs[0], ev = { break50: 'break', place30: 'place', harvest5: 'harvest', splice1: 'splice', clinic1: 'clinic_win', trade1: 'trade', gems100: 'gems' }[q.id];
  assert.equal(E.claimQuest(u, q.id, day1).ok, false);
  E.questEvent(u, ev, 500, day1); assert.ok(E.claimQuest(u, q.id, day1).ok); assert.equal(E.claimQuest(u, q.id, day1).ok, false);
  E.quests(u, day1 + 86400000); assert.equal(u.quests.list.every(x => x.p === 0), true);
});
test('XP and levels', () => { const u = U('a'); assert.equal(E.levelFor(0), 1); for (let k = 0; k < 10; k++) E.addXp(u, 'harvest'); assert.equal(E.levelFor(u.xp), 2); });
test('market price: owner only', () => {
  assert.equal(E.setMarketPrice(U('ad', 'admin'), 13, 1).err, 'perm'); assert.ok(E.setMarketPrice(U('o', 'owner'), 13, 999).ok); assert.equal(E.priceOf(13), 999);
});
test('carnival: schedule, owner force, wheel rates and gem cost', () => {
  assert.equal(E.carnivalActive(Date.UTC(2026, 9, 23, 18, 30)), true); // Friday
  assert.equal(E.carnivalActive(Date.UTC(2026, 9, 21, 18, 30)), false);
  const u = U('p'); u.gems = 100; assert.equal(E.spinWheel(u, Date.UTC(2026, 9, 21, 12)).err, 'closed');
  assert.equal(E.setCarnival(U('ad', 'admin'), true).err, 'perm');
  assert.ok(E.setCarnival(U('o', 'owner'), true).ok);
  const r = E.spinWheel(u, Date.now(), seq(0.999, 0)); assert.equal(r.kind, 'legendary'); assert.equal(I.ITEMS[r.item].rarity, 'legendary'); assert.equal(u.gems, 75);
  u.gems = 10; assert.equal(E.spinWheel(u).err, 'gems'); E.setCarnival(U('o', 'owner'), null);
});
test('parkour: checkpoints in order, finish prize, leaderboard, time limit', () => {
  const w = G.generateParkour('RUN'), u = U('runner'), pk = w.parkour, runr = { start: 0, cp: -1 };
  assert.ok(pk.checkpoints.length >= 2);
  assert.equal(G.parkourTouch(w, runr, pk.finish.x, pk.finish.y, 1000, u), null); // can't skip checkpoints
  for (const c of pk.checkpoints) assert.ok(G.parkourTouch(w, runr, c.x, c.y, 2000, u).checkpoint >= 0);
  const r = G.parkourTouch(w, runr, pk.finish.x, pk.finish.y, 30000, u); assert.ok(r.finish); assert.equal(u.gems, pk.prize); assert.equal(pk.board[0].name, 'runner');
  assert.ok(G.parkourTouch(w, { start: 0, cp: -1 }, 3, 3, pk.limit + 1, u).timeout);
});
test('cosmetics: equip only owned skins', () => {
  const u = U('a'); assert.equal(G.equip(u, 42).ok, false); G.invAdd(u, 42, 1); assert.ok(G.equip(u, 42).ok); assert.equal(u.equip.hat, 42); assert.equal(G.equip(u, 1).ok, false);
});
test('atomic helper rolls back on failure', () => {
  const u = U('a'); u.gems = 5; const r = E.atomic([u], () => { u.gems = 999; G.invAdd(u, 1, 5); return { ok: false }; });
  assert.equal(r.ok, false); assert.equal(u.gems, 5); assert.ok(!u.inv[1]);
});
test('Mythic Path: level gate, ordered stages, quiz pass/fail, legendary reward', () => {
  const u = U('hero'); assert.equal(E.legendStart(u).err, 'level');
  u.xp = 50 * 16; assert.ok(E.legendStart(u).ok); assert.equal(E.legendStart(u).err, 'active');
  assert.equal(E.quizStart(u).err, 'notyet');
  E.questEvent(u, 'clinic_win', 5); assert.equal(u.legend.stage, 0); // wrong order does nothing
  for (const s of E.LEGEND_STAGES.slice(0, 4)) E.questEvent(u, s.ev, s.goal);
  assert.equal(u.legend.stage, 4);
  assert.ok(E.quizStart(u, () => 0).ok); const wrong = E.quizAnswer(u, [3, 3, 3, 3, 3]); assert.equal(wrong.passed, false);
  assert.equal(E.quizStart(u).err, 'cooldown'); u.legend.quizCooldown = 0;
  E.quizStart(u, () => 0); const ans = u.legend.quiz.qs.map(k => E.QUIZ[k][2]);
  assert.equal(E.quizAnswer(u, 'x').ok, false);
  E.quizStart(u, () => 0); const r = E.quizAnswer(u, u.legend.quiz.qs.map(k => E.QUIZ[k][2]));
  assert.ok(r.passed); assert.equal(I.ITEMS[r.item].rarity, 'legendary'); assert.equal(u.inv[r.item], 1); assert.equal(E.legendLevel(u), 10); void ans;
});
test('friends: request, accept (incl. mutual auto-accept), remove', () => {
  const a = U('a'), b = U('b'), c = U('c');
  assert.equal(G.friendRequest(a, a).ok, false);
  assert.ok(G.friendRequest(a, b).pending); assert.equal(G.friendRequest(a, b).err, 'pending');
  assert.equal(G.friendAccept(a, b).err, 'norequest'); // a can't accept on b's behalf
  assert.ok(G.friendAccept(b, a).accepted); assert.deepEqual([a.friends, b.friends], [['b'], ['a']]);
  assert.equal(G.friendRequest(a, b).err, 'already');
  G.friendRequest(c, a); assert.ok(G.friendRequest(a, c).accepted); assert.ok(c.friends.includes('a'));
  G.friendRemove(a, b); assert.ok(!a.friends.includes('b') && !b.friends.includes('a'));
});
test('hand-made parkour courses are completable (jump-envelope BFS through all checkpoints)', () => {
  const { COURSES, buildCourse } = require('../src/courses');
  for (const key of Object.keys(COURSES)) {
    const w = buildCourse(key), solid = (x, y) => G.isSolid(w.fg[y * w.w + x]) && w.fg[y * w.w + x] !== 3;
    const stands = []; for (let y = 1; y < w.h - 8; y++) for (let x = 1; x < w.w - 1; x++) if (!solid(x, y) && solid(x, y + 1) && !solid(x, y - 1)) stands.push([x, y]);
    const bounce = (x, y) => w.fg[(y + 1) * w.w + x] === 30;
    const reach = (a, b) => { const dx = Math.abs(a[0] - b[0]), up = a[1] - b[1], jh = bounce(...a) ? 6 : 3; return up <= jh && dx <= (up > 0 ? 4 : 4 + Math.floor(-up / 2)); };
    const goal = (p, t) => Math.abs(p[0] - t.x) <= 1 && Math.abs(p[1] - t.y) <= 1;
    let start = [w.spawn.x, w.spawn.y];
    for (const target of [...w.parkour.checkpoints, w.parkour.finish]) {
      const seen = new Set([start + '']), qq = [start]; let found = null;
      while (qq.length && !found) { const c = qq.shift(); if (goal(c, target)) found = c; for (const s of stands) if (!seen.has(s + '') && reach(c, s)) { seen.add(s + ''); qq.push(s); } }
      assert.ok(found, `${key}: cannot reach ${JSON.stringify(target)}`); start = found;
    }
    assert.ok(w.parkour.checkpoints.length >= 2);
  }
});
test('carnival: Lantern Shuffle and Higher-or-Lower are server-decided and gem-only', () => {
  const o = U('o', 'owner'); E.setCarnival(o, false);
  const u = U('p'); u.gems = 100;
  assert.equal(E.lanternShuffle(u, 0).err, 'closed'); assert.equal(E.hlStart(u).err, 'closed');
  E.setCarnival(o, true);
  assert.equal(E.lanternShuffle(u, 7).err, 'bad');
  let r = E.lanternShuffle(u, 1, Date.now(), seq(0.5, 0.9)); assert.ok(r.win); assert.equal(u.gems, 125);
  r = E.lanternShuffle(u, 0, Date.now(), () => 0.9); assert.equal(r.win, false); assert.equal(u.gems, 110);
  assert.equal(E.hlGuess(u, 'hi').err, 'nogame');
  assert.ok(E.hlStart(u, Date.now(), () => 0).ok); assert.equal(u.hl.card, 1); assert.equal(E.hlStart(u).err, 'active');
  assert.ok(E.hlGuess(u, 'hi', () => 0.5).right); assert.equal(u.hl.streak, 1);
  const g = u.gems; assert.equal(E.hlGuess(u, 'cash').cashed, 20); assert.equal(u.gems, g + 20); assert.ok(!u.hl);
  E.hlStart(u, Date.now(), () => 0.99); assert.equal(E.hlGuess(u, 'hi', () => 0.1).right, false); assert.ok(!u.hl);
  const poor = U('poor'); assert.equal(E.lanternShuffle(poor, 0).err, 'gems'); assert.equal(poor.gems, 0);
  E.setCarnival(o, null);
});
