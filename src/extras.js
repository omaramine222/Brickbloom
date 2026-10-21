'use strict';
// v5 extras: daily login reward with streak, leaderboards, trade history, farm (BFG-style) worlds.
const I = require('./items'), G = require('./game'), E = require('./economy');
const DAY = 86400000;
const dayNum = now => Math.floor(now / DAY);
const DAILY = [20, 30, 40, 50, 60, 80, 120]; // gems for streak day 1..7; day 7 also gives a Mystery Crate
function dailyView(u, now = Date.now()) {
  const d = u.daily || { last: -1, streak: 0 }, today = dayNum(now);
  const canClaim = d.last !== today, streakIfClaim = d.last === today - 1 ? (d.streak % 7) + 1 : (d.last === today ? d.streak : 1);
  return { canClaim, streak: d.last >= today - 1 ? d.streak : 0, next: streakIfClaim, table: DAILY };
}
function claimDaily(u, now = Date.now()) {
  const v = dailyView(u, now); if (!v.canClaim) return { ok: false, err: 'claimed' };
  const s = v.next, gems = DAILY[s - 1]; u.gems += gems; let crate = false;
  if (s === 7) { if (G.invAdd(u, 27, 1) === 1) crate = true; }
  u.daily = { last: dayNum(now), streak: s }; E.log('daily', { u: u.username, streak: s, gems, crate });
  return { ok: true, streak: s, gems, crate };
}
// leaderboards: staff excluded from the richest board (owner can spawn gems)
function leaders(users) {
  const all = Object.values(users).filter(u => !u.banned);
  const lv = all.map(u => ({ name: u.username, level: E.levelFor(u.xp), xp: u.xp || 0 })).sort((a, b) => b.xp - a.xp).slice(0, 10);
  const rich = all.filter(u => u.role === 'user').map(u => ({ name: u.username, gems: u.gems || 0 })).sort((a, b) => b.gems - a.gems).slice(0, 10);
  return { level: lv, rich };
}
// trade history from the audit log. Owner sees every trade and Barter Box sale; others only their own.
function tradeHistory(rows, viewer, limit = 100) {
  const isOwner = G.hasRole(viewer, 'owner'), me = viewer.username;
  return rows.filter(r => (r.type === 'trade' && r.ok !== false) || r.type === 'vend_buy')
    .filter(r => isOwner || r.a === me || r.b === me || r.u === me || r.seller === me)
    .slice(-limit).reverse()
    .map(r => r.type === 'trade' ? { t: r.t, kind: 'trade', a: r.a, b: r.b, offers: r.offers } : { t: r.t, kind: 'vend', buyer: r.u, seller: r.seller, item: r.item, qty: r.qty, cost: r.cost, w: r.w });
}
// FARM worlds: flat dirt shelves with walkways — made for planting rows of trees (big farm grid)
const FARM = /^FARM[A-Z0-9]{0,12}$/;
function generateFarm(name) {
  const w = G.generateWorld(name), W = w.w, H = w.h;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; w.fg[i] = 0; w.bg[i] = 0; }
  const top = 14;
  for (let y = top; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, row = (y - top) % 4;
    if (y >= H - 3) { w.fg[i] = 4; continue; }
    w.bg[i] = 6;
    if (row === 0 && y < H - 8) w.fg[i] = 1;       // dirt shelf (plant on top of this)
    else if (y >= H - 8) w.fg[i] = 1;
    if ((x === 0 || x === W - 1)) w.fg[i] = 4;      // walls
  }
  for (let y = top; y < H - 8; y += 4) for (const x of [4, W - 5]) { w.fg[y * W + x] = 0; } // drop-holes to move between shelves
  w.spawn = { x: 50, y: top - 1 }; w.fg[top * W + 50] = 4; w.farm = true;
  return w;
}
module.exports = { dailyView, claimDaily, leaders, tradeHistory, FARM, generateFarm, DAILY };
