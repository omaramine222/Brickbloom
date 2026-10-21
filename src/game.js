'use strict';
const I = require('./items');
const W = 100, H = 60, REACH = 5, MAX_STACK = 250, MAX_SLOTS = 40;

function rngFrom(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
// ---------- parkour course ----------
const PARKOUR = /^RUN[0-9]{0,3}$/;
function generateParkour(name) {
  const r = rngFrom(hashStr(name)), fg = new Array(W * H).fill(0), bg = new Array(W * H).fill(20);
  for (let x = 0; x < W; x++) for (let y = H - 3; y < H; y++) fg[y * W + x] = 4;
  for (let x = 0; x < W; x++) for (let y = H - 6; y < H - 3; y++) fg[y * W + x] = 3; // magma floor
  for (let y = 0; y < H; y++) { fg[y * W] = 4; fg[y * W + W - 1] = 4; }
  let x = 2, y = 42; const cps = [];
  for (let k = 0; k < 5; k++) fg[(y + 1) * W + x + k] = 2;
  const spawn = { x: 3, y };
  x += 6; let seg = 0;
  while (x < W - 8) {
    const len = 2 + Math.floor(r() * 3), dy = Math.floor(r() * 5) - 2;
    y = Math.max(14, Math.min(46, y + dy));
    for (let k = 0; k < len; k++) fg[(y + 1) * W + x + k] = r() < 0.15 ? 30 : 7;
    if (++seg % 4 === 0) { fg[y * W + x] = 28; cps.push({ x, y }); }
    x += len + 2 + Math.floor(r() * 2);
  }
  for (let k = 0; k < 6; k++) fg[(y + 1) * W + W - 8 + k] = 2;
  fg[y * W + W - 4] = 29;
  return { name, w: W, h: H, fg, bg, trees: {}, drops: [], owner: null, access: [], adminLocked: true, parkour: { checkpoints: cps, finish: { x: W - 4, y }, limit: 180000, prize: 40, board: [] }, spawn, nextDrop: 1, hits: {} };
}
function parkourTouch(w, run, px, py, now, user) {
  // run: {start, cp:-1}. returns events
  const pk = w.parkour; if (!pk || !run) return null;
  const cx = Math.floor(px + 0.35), cy = Math.floor(py + 0.45);
  if (now - run.start > pk.limit) return { timeout: true };
  for (let k = run.cp + 1; k < pk.checkpoints.length; k++) { const c = pk.checkpoints[k]; if (Math.abs(c.x - cx) <= 1 && Math.abs(c.y - cy) <= 1) { run.cp = k; return { checkpoint: k, pos: c }; } }
  const f = pk.finish;
  if (Math.abs(f.x - cx) <= 1 && Math.abs(f.y - cy) <= 1 && run.cp === pk.checkpoints.length - 1) {
    const ms = now - run.start;
    pk.board = pk.board.filter(e => e.name !== user.username || e.ms < ms);
    if (!pk.board.find(e => e.name === user.username)) pk.board.push({ name: user.username, ms });
    pk.board.sort((a, b) => a.ms - b.ms); pk.board = pk.board.slice(0, 10);
    user.gems += pk.prize; return { finish: true, ms, prize: pk.prize };
  }
  return null;
}
function equip(user, item) {
  if (item === 0) return { ok: true };
  const it = I.ITEMS[item]; if (!it || it.kind !== 'skin' || invCount(user, item) < 1) return { ok: false, err: 'noitem' };
  user.equip = user.equip || {}; user.equip[it.slot] = user.equip[it.slot] === item ? 0 : item; return { ok: true, equip: user.equip };
}
const validWorldName = n => typeof n === 'string' && /^[A-Z0-9]{1,16}$/.test(n);

function generateWorld(name) {
  const r = rngFrom(hashStr(name));
  const fg = new Array(W * H).fill(0), bg = new Array(W * H).fill(0);
  const surface = [];
  let h = 24;
  for (let x = 0; x < W; x++) { if (r() < 0.3) h += r() < 0.5 ? -1 : 1; h = Math.max(20, Math.min(28, h)); surface.push(h); }
  const spawnX = 50; surface[spawnX - 1] = surface[spawnX] = surface[spawnX + 1] = surface[spawnX];
  for (let x = 0; x < W; x++) for (let y = surface[x]; y < H; y++) {
    const i = y * W + x; bg[i] = 6;
    if (y >= H - 3) fg[i] = 4;
    else if (y > 42 && r() < 0.12) fg[i] = 3;
    else if (y > surface[x] + 5 && r() < 0.35 + (y - 30) * 0.01) fg[i] = 2;
    else fg[i] = 1;
  }
  const sy = surface[spawnX] - 1;
  fg[sy * W + spawnX] = 5; fg[(sy + 1) * W + spawnX] = 4;
  return { name, w: W, h: H, fg, bg, trees: {}, drops: [], owner: null, access: [], spawn: { x: spawnX, y: sy }, nextDrop: 1, hits: {} };
}
const idx = (w, x, y) => y * w.w + x;
const inBounds = (w, x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < w.w && y < w.h;
const isSolid = id => { const it = I.ITEMS[id]; return !!it && it.kind === 'fg'; };

// ---------- roles ----------
const ROLE_RANK = { user: 0, mod: 1, admin: 2, owner: 3 };
// Moderation only for mod/admin. Item/gem spawning and role changes are OWNER ONLY.
const CMD_ROLE = { kick: 'mod', mute: 'mod', unmute: 'mod', tp: 'mod', summon: 'mod', tempban: 'mod',
  broadcast: 'admin', unban: 'admin', lockworld: 'admin', unlockworld: 'admin',
  ban: 'owner', give: 'owner', gems: 'owner', spawn: 'owner', setrole: 'owner' };
function hasRole(user, role) { return !!user && (ROLE_RANK[user.role] || 0) >= ROLE_RANK[role]; }
function canCommand(user, cmd) { const need = Object.prototype.hasOwnProperty.call(CMD_ROLE, cmd) && CMD_ROLE[cmd]; return !!need && hasRole(user, need); }
// may only act on someone of strictly lower rank (owner can act on everyone but cannot demote itself via setrole)
function canTarget(actor, target) { return !!actor && !!target && (actor.role === 'owner' || (ROLE_RANK[target.role] || 0) < (ROLE_RANK[actor.role] || 0)); }
function setRole(actor, target, role) {
  if (!canCommand(actor, 'setrole')) return { ok: false, err: 'perm' };
  if (!target || !['user', 'mod', 'admin'].includes(role)) return { ok: false, err: 'badrole' };
  if (target.role === 'owner') return { ok: false, err: 'owner' };
  target.role = role; return { ok: true };
}
function giveItem(actor, target, item, n) {
  if (!canCommand(actor, 'give')) return { ok: false, err: 'perm' };
  n = Math.floor(n); if (!target || !I.validItem(item) || !(n > 0 && n <= 250)) return { ok: false, err: 'bad' };
  return { ok: true, added: invAdd(target, item, n) };
}
function giveGems(actor, target, n) {
  if (!canCommand(actor, 'gems')) return { ok: false, err: 'perm' };
  n = Math.floor(n); if (!target || !(Math.abs(n) <= 1e7)) return { ok: false, err: 'bad' };
  target.gems = Math.max(0, target.gems + n); return { ok: true };
}
// ---------- inventory ----------
function invCount(u, id) { return u.inv[id] || 0; }
function invAdd(u, id, n) {
  if (!I.validItem(id) || !(n > 0)) return 0;
  if (!u.inv[id] && Object.keys(u.inv).length >= MAX_SLOTS) return 0;
  const add = Math.min(n, MAX_STACK - (u.inv[id] || 0));
  if (add <= 0) return 0;
  u.inv[id] = (u.inv[id] || 0) + add; return add;
}
function invRemove(u, id, n) { if (!(n > 0) || invCount(u, id) < n) return false; u.inv[id] -= n; if (!u.inv[id]) delete u.inv[id]; return true; }
function newUser(username, hash, role = 'user') { return { username, hash, role, gems: 0, inv: { 1: 10, 2: 5, 1001: 2, 1002: 2 }, banned: false, mutedUntil: 0, created: Date.now() }; }

// ---------- permissions ----------
function canBuild(w, user) {
  if (hasRole(user, 'owner')) return true;
  if (w.adminLocked) return false;
  if (!w.owner) return true;
  return w.owner === user.username || w.access.includes(user.username);
}
function inReach(p, x, y) { return Math.abs(p.x - x) <= REACH && Math.abs(p.y - y) <= REACH; }

function spawnDrop(w, x, y, item, count) {
  if (w.drops.length > 400) w.drops.shift();
  const d = { id: w.nextDrop++, x: x + 0.5, y: y + 0.5, item, count }; w.drops.push(d); return d;
}
// returns {ok, changed:[{x,y,fg,bg}], drops:[...], gems, harvested}
function hit(w, user, x, y, now = Date.now(), rnd = Math.random) {
  if (!inBounds(w, x, y)) return { ok: false, err: 'bounds' };
  if (!canBuild(w, user)) return { ok: false, err: 'locked' };
  const i = idx(w, x, y), out = { ok: true, changed: [], drops: [], gems: 0 };
  const tree = w.trees[i];
  if (tree) {
    if (now - tree.planted < tree.grow) { out.growing = Math.ceil((tree.grow - (now - tree.planted)) / 1000); return out; }
    const block = I.blockOf(w.fg[i]);
    delete w.trees[i]; w.fg[i] = 0;
    out.drops.push(spawnDrop(w, x, y, block, 1 + Math.floor(rnd() * 4)));
    if (rnd() < 0.3) out.drops.push(spawnDrop(w, x, y, block + I.SEED_OFFSET, 1));
    out.harvested = true; out.changed.push({ x, y, fg: 0, bg: w.bg[i] }); return out;
  }
  const layer = w.fg[i] ? 'fg' : (w.bg[i] ? 'bg' : null);
  if (!layer) return { ok: false, err: 'empty' };
  const id = w[layer][i], it = I.ITEMS[id];
  if (!it || it.hard === 0) return { ok: false, err: 'unbreakable' };
  if (it.kind === 'lock' && w.owner !== user.username && !hasRole(user, 'owner')) return { ok: false, err: 'locked' };
  const key = i + ':' + layer, hs = w.hits[key];
  const n = hs && now - hs.t < 4000 ? hs.n + 1 : 1;
  if (n < it.hard) { w.hits[key] = { n, t: now }; out.progress = n / it.hard; return out; }
  delete w.hits[key]; w[layer][i] = 0;
  if (it.kind === 'vend') {
    const v = w.vends && w.vends[i];
    if (v && v.owner !== user.username) { w[layer][i] = id; return { ok: false, err: 'notyours' }; }
    if (v) { if (v.stock) invAdd(user, v.item, v.stock); user.gems += v.earnings; delete w.vends[i]; }
    out.drops.push(spawnDrop(w, x, y, id, 1));
  } else if (it.kind === 'lock') { w.owner = null; w.access = []; out.drops.push(spawnDrop(w, x, y, id, 1)); }
  else {
    if (!it.noSeed && rnd() < 0.25) out.drops.push(spawnDrop(w, x, y, id + I.SEED_OFFSET, 1));
    if (rnd() < 0.12) out.drops.push(spawnDrop(w, x, y, id, 1));
    let g = rnd() < 0.5 ? 1 + Math.floor(rnd() * it.tier * 2) : 0;
    if (it.gemBonus) g += it.gemBonus[0] + Math.floor(rnd() * (it.gemBonus[1] - it.gemBonus[0] + 1));
    if (g) out.drops.push(spawnDrop(w, x, y, I.GEM_DROP, g)); // gems fall on the ground
    out.gems = g;
  }
  out.broken = id; out.changed.push({ x, y, fg: w.fg[i], bg: w.bg[i] }); return out;
}
function place(w, user, x, y, item, now = Date.now()) {
  if (!inBounds(w, x, y)) return { ok: false, err: 'bounds' };
  if (!I.validItem(item) || invCount(user, item) < 1) return { ok: false, err: 'noitem' };
  const i = idx(w, x, y);
  if (I.isSeed(item)) {
    if (!canBuild(w, user)) return { ok: false, err: 'locked' };
    if (w.fg[i] || y + 1 >= w.h || !isSolid(w.fg[idx(w, x, y + 1)])) return { ok: false, err: 'needsoil' };
    invRemove(user, item, 1); w.fg[i] = item;
    w.trees[i] = { planted: now, grow: I.growMs(I.blockOf(item)) };
    return { ok: true, changed: [{ x, y, fg: item, bg: w.bg[i] }], tree: w.trees[i] };
  }
  const it = I.ITEMS[item];
  if (it.kind === 'lock') {
    if (w.owner) return { ok: false, err: 'alreadylocked' };
    if (w.fg[i]) return { ok: false, err: 'occupied' };
    if (w.adminLocked && !hasRole(user, 'owner')) return { ok: false, err: 'locked' };
    invRemove(user, item, 1); w.fg[i] = item; w.owner = user.username; w.access = [];
    return { ok: true, changed: [{ x, y, fg: item, bg: w.bg[i] }], locked: true };
  }
  if (!canBuild(w, user)) return { ok: false, err: 'locked' };
  if (it.kind === 'tool') return { ok: false, err: 'notplaceable' };
  if (it.kind === 'vend') {
    if (w.fg[i]) return { ok: false, err: 'occupied' };
    invRemove(user, item, 1); w.fg[i] = item; (w.vends = w.vends || {})[i] = { owner: user.username, item: 0, stock: 0, price: 0, earnings: 0 };
    return { ok: true, changed: [{ x, y, fg: item, bg: w.bg[i] }] };
  }
  if (it.kind === 'door') return { ok: false, err: 'noitem' };
  const layer = it.kind === 'bg' ? 'bg' : 'fg';
  if (w[layer][i]) return { ok: false, err: 'occupied' };
  invRemove(user, item, 1); w[layer][i] = item;
  return { ok: true, changed: [{ x, y, fg: w.fg[i], bg: w.bg[i] }] };
}
function splice(user, a, b) {
  if (!I.isSeed(a) || !I.isSeed(b) || a === b) return { ok: false, err: 'needtwoseeds' };
  const r = I.recipe(a, b); if (!r) return { ok: false, err: 'norecipe' };
  if (invCount(user, a) < 1 || invCount(user, b) < 1) return { ok: false, err: 'noitem' };
  invRemove(user, a, 1); invRemove(user, b, 1);
  if (!invAdd(user, r, 1)) { invAdd(user, a, 1); invAdd(user, b, 1); return { ok: false, err: 'full' }; }
  return { ok: true, result: r };
}
function buy(user, pack, rnd = Math.random) {
  const p = Object.prototype.hasOwnProperty.call(I.SHOP, pack) && I.SHOP[pack];
  if (!p) return { ok: false, err: 'nopack' };
  if (user.gems < p.price) return { ok: false, err: 'gems' };
  let give = p.give;
  if (give === 'randomSkin') { const pool = [40, 41, 43, 44, 45]; give = [[pool[Math.floor(rnd() * pool.length)], 1]]; }
  if (give === 'randomSeeds') { const pool = [1, 2, 3, 6, 7, 8]; give = []; for (let k = 0; k < 4; k++) give.push([pool[Math.floor(rnd() * pool.length)] + I.SEED_OFFSET, 1]); }
  user.gems -= p.price; for (const [id, n] of give) invAdd(user, id, n);
  return { ok: true, got: give };
}
function pickup(w, user, p, dropId) {
  const k = w.drops.findIndex(d => d.id === dropId); if (k < 0) return { ok: false };
  const d = w.drops[k]; if (Math.abs(d.x - p.x - 0.5) > 1.6 || Math.abs(d.y - p.y - 0.5) > 1.6) return { ok: false, err: 'far' };
  const got = d.item === I.GEM_DROP ? (user.gems += d.count, d.count) : invAdd(user, d.item, d.count); if (!got) return { ok: false, err: 'full' };
  d.count -= got; if (d.count <= 0) w.drops.splice(k, 1);
  return { ok: true, item: d.item, count: got, left: d.count };
}
function dropItem(w, user, p, item, n) {
  n = Math.floor(n); if (!I.validItem(item) || !(n > 0) || !invRemove(user, item, n)) return { ok: false };
  return { ok: true, drop: spawnDrop(w, Math.floor(p.x) + 1, Math.floor(p.y), item, n) };
}

// ---------- friends ----------
const MAX_FRIENDS = 100;
function friendRequest(a, b) {
  if (!b || a === b) return { ok: false, err: 'bad' };
  a.friends = a.friends || []; b.friends = b.friends || []; b.friendReq = b.friendReq || []; a.friendReq = a.friendReq || [];
  if (a.friends.includes(b.username)) return { ok: false, err: 'already' };
  if (a.friendReq.includes(b.username)) return friendAccept(a, b); // they asked first -> accept
  if (b.friendReq.includes(a.username)) return { ok: false, err: 'pending' };
  if (b.friendReq.length >= 50) return { ok: false, err: 'full' };
  b.friendReq.push(a.username); return { ok: true, pending: true };
}
function friendAccept(b, a) {
  b.friendReq = b.friendReq || []; if (!a || !b.friendReq.includes(a.username)) return { ok: false, err: 'norequest' };
  b.friends = b.friends || []; a.friends = a.friends || [];
  if (b.friends.length >= MAX_FRIENDS || a.friends.length >= MAX_FRIENDS) return { ok: false, err: 'full' };
  b.friendReq = b.friendReq.filter(n => n !== a.username);
  if (!b.friends.includes(a.username)) b.friends.push(a.username); if (!a.friends.includes(b.username)) a.friends.push(b.username);
  return { ok: true, accepted: true };
}
function friendRemove(a, b) {
  if (!b) return { ok: false, err: 'bad' };
  a.friends = (a.friends || []).filter(n => n !== b.username); b.friends = (b.friends || []).filter(n => n !== a.username);
  a.friendReq = (a.friendReq || []).filter(n => n !== b.username); return { ok: true };
}

// ---------- trading ----------
function validOffer(o) {
  if (!o || typeof o !== 'object') return false;
  if (!Number.isInteger(o.gems) || o.gems < 0) return false;
  if (!Array.isArray(o.items) || o.items.length > 8) return false;
  return o.items.every(([id, n]) => I.validItem(id) && Number.isInteger(n) && n > 0);
}
function hasOffer(u, o) {
  if (u.gems < o.gems) return false;
  const need = {}; for (const [id, n] of o.items) need[id] = (need[id] || 0) + n;
  return Object.entries(need).every(([id, n]) => invCount(u, +id) >= n);
}
// all-or-nothing swap
function executeTrade(a, b, oa, ob) {
  if (!validOffer(oa) || !validOffer(ob) || !hasOffer(a, oa) || !hasOffer(b, ob)) return { ok: false, err: 'invalid' };
  const sa = JSON.stringify({ g: a.gems, i: a.inv }), sb = JSON.stringify({ g: b.gems, i: b.inv });
  const ok = (() => {
    for (const [id, n] of oa.items) invRemove(a, id, n);
    for (const [id, n] of ob.items) invRemove(b, id, n);
    a.gems -= oa.gems; b.gems -= ob.gems;
    for (const [id, n] of oa.items) if (invAdd(b, id, n) !== n) return false;
    for (const [id, n] of ob.items) if (invAdd(a, id, n) !== n) return false;
    a.gems += ob.gems; b.gems += oa.gems; return true;
  })();
  if (!ok) { const ra = JSON.parse(sa), rb = JSON.parse(sb); a.gems = ra.g; a.inv = ra.i; b.gems = rb.g; b.inv = rb.i; return { ok: false, err: 'full' }; }
  return { ok: true };
}

module.exports = { friendRequest, friendAccept, friendRemove, PARKOUR, generateParkour, parkourTouch, equip, W, H, REACH, generateWorld, validWorldName, canBuild, inReach, hit, place, splice, buy, pickup, dropItem,
  executeTrade, validOffer, invAdd, invRemove, invCount, newUser, isSolid, hasRole, canCommand, canTarget, setRole, giveItem, giveGems, ROLE_RANK, CMD_ROLE, idx };
