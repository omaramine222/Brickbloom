'use strict';
const http = require('http'), path = require('path'), crypto = require('crypto');
const express = require('express'), compression = require('compression'), { WebSocketServer } = require('ws'), bcrypt = require('bcryptjs');
const I = require('./items'), G = require('./game'), E = require('./economy'), store = require('./store');

const PORT = +process.env.PORT || 3000;
const OWNER = (process.env.OWNER_USERNAME || '').toLowerCase();
const users = store.users;
if (OWNER && users[OWNER] && users[OWNER].role !== 'owner') { users[OWNER].role = 'owner'; store.saveUsers(); }
E.setLogSink(store.log); Object.assign(E.market, store.kvGet('market', {})); E.onMarketChange(m => store.kvSet('market', m));
const app = express();
app.set('trust proxy', 1); // Render/any proxy: real client IP for rate limits (friends on one Wi-Fi still each get own limits per IP header)
const STARTED = Date.now();
app.get(['/healthz', '/health'], (req, res) => res.json({ ok: true, version: 6, uptime: Math.round((Date.now() - STARTED) / 1000), online: players.size }));
app.use(express.json({ limit: '4kb' }));
app.use(compression());
app.use(express.static(path.join(__dirname, '..', 'public'), { setHeaders(res, file) {
  if (/(index\.html|sw\.js)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  else if (/\.(ttf|png|svg)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=604800');
  else res.setHeader('Cache-Control', 'public, max-age=3600'); } }));
app.get('/version', (req, res) => res.json({ version: 6 }));

// ---- simple per-key rate limiter ----
const buckets = new Map();
function allow(key, perMin) {
  const now = Date.now(), b = buckets.get(key) || { n: 0, t: now };
  if (now - b.t > 60000) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b); return b.n <= perMin;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.t > 120000) buckets.delete(k); }, 60000).unref();

const validName = n => typeof n === 'string' && /^[A-Za-z0-9_]{3,16}$/.test(n);
const validPass = p => typeof p === 'string' && p.length >= 6 && p.length <= 72;
const isBanned = u => u.banned || (u.bannedUntil && u.bannedUntil > Date.now());
function newToken(name) { const t = crypto.randomBytes(24).toString('hex'); store.saveSession(t, name); return t; }

app.post('/api/register', async (req, res) => {
  if (!allow('reg:' + req.ip, 5)) return res.status(429).json({ err: 'Too many attempts, wait a minute' });
  const { username, password } = req.body || {};
  if (!validName(username)) return res.status(400).json({ err: 'Username: 3-16 letters, numbers or _' });
  if (!validPass(password)) return res.status(400).json({ err: 'Password: 6-72 characters' });
  const key = username.toLowerCase();
  if (users[key]) return res.status(409).json({ err: 'Username taken' });
  users[key] = G.newUser(username, await bcrypt.hash(password, 10), key === OWNER ? 'owner' : 'user');
  store.saveUsers(); E.log('register', { u: username });
  res.json({ token: newToken(key), username });
});
app.post('/api/login', async (req, res) => {
  if (!allow('login:' + req.ip, 10)) return res.status(429).json({ err: 'Too many attempts, wait a minute' });
  const { username, password } = req.body || {};
  if (!validName(username) || !validPass(password)) return res.status(400).json({ err: 'Wrong username or password' });
  const u = users[username.toLowerCase()];
  if (!u || !(await bcrypt.compare(password, u.hash))) return res.status(401).json({ err: 'Wrong username or password' });
  if (isBanned(u)) return res.status(403).json({ err: 'This account is banned' });
  res.json({ token: newToken(username.toLowerCase()), username: u.username });
});
app.get('/api/info', (req, res) => res.json({ courses: Object.fromEntries(Object.entries(C.COURSES).map(([k, c]) => [k, { name: c.name, limit: c.limit, prize: c.prize }])), shuffleCost: E.SHUFFLE_COST, hlCost: E.HL_COST,
  items: Object.fromEntries(Object.entries(I.ITEMS).map(([id, it]) => [id, { name: it.name, kind: it.kind, color: it.color, rarity: it.rarity, value: E.priceOf(+id), form: it.form, light: !!it.light, hard: it.hard, clear: !!it.clear, slot: it.slot }])),
  recipes: I.RECIPES, shop: I.SHOP, crate: E.crateRates(), wheel: E.wheelRates(), wheelCost: E.WHEEL_COST, seedOffset: I.SEED_OFFSET, gemDrop: I.GEM_DROP,
  symptoms: E.SYMPTOMS, carnival: E.carnivalActive(),
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 8 * 1024 });
const players = new Map(); // ws -> player
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const inWorld = name => [...players.entries()].filter(([, p]) => p.world === name);
const bcastWorld = (name, m, except) => { for (const [ws] of inWorld(name)) if (ws !== except) send(ws, m); };
const bcastAll = m => { for (const [ws] of players) send(ws, m); };
const findPlayer = name => [...players.entries()].find(([, p]) => p.user.username.toLowerCase() === String(name || '').toLowerCase());
const pubPlayer = p => ({ equip: p.user.equip || {}, id: p.id, name: p.user.username, role: p.user.role, x: p.x, y: p.y, face: p.face || 1, level: E.levelFor(p.user.xp) });
const me = p => ({ t: 'me', daily: X.dailyView(p.user), hl: p.user.hl || null, legend: E.legendView(p.user), equip: p.user.equip || {}, username: p.user.username, role: p.user.role, gems: p.user.gems, inv: p.user.inv, xp: p.user.xp || 0, level: E.levelFor(p.user.xp), quests: E.quests(p.user), clinic: E.clinicView(p.user) || null });
const touch = p => { store.saveUsers(p.user.username.toLowerCase()); send(p.ws, me(p)); };
const sys = (ws, text, kind = 'sys') => send(ws, { t: 'chat', from: '', text, kind });
let nextPid = 1;
function sendFriends(ws, u) {
  const list = (u.friends || []).map(n => { const fp = findPlayer(n); return { name: n, online: !!fp, world: fp ? fp[1].world : null }; });
  send(ws, { t: 'friends', list, requests: u.friendReq || [] });
}
function notifyFriends(u, online) { for (const n of u.friends || []) { const fp = findPlayer(n); if (fp) { sys(fp[0], `${u.username} is ${online ? 'online 🟢' : 'offline'}`); sendFriends(fp[0], fp[1].user); } } }

function worldMsg(w) {
  const now = Date.now(), trees = {};
  for (const [i, t] of Object.entries(w.trees)) trees[i] = { age: now - t.planted, grow: t.grow };
  return { t: 'world', name: w.name, w: w.w, h: w.h, fg: w.fg, bg: w.bg, trees, drops: w.drops, owner: w.owner, access: w.access, adminLocked: !!w.adminLocked, parkour: !!w.parkour, vends: w.vends || {}, spawn: w.spawn, players: inWorld(w.name).map(([, p]) => pubPlayer(p)) };
}
function joinWorld(ws, p, name) {
  name = String(name || '').toUpperCase();
  if (!G.validWorldName(name)) return sys(ws, 'World names: 1-16 letters/numbers');
  if (p.world) leaveWorld(ws, p);
  const w = store.getWorld(name, genAny);
  p.world = name; p.x = w.spawn.x; p.y = w.spawn.y; p.lastMove = Date.now();
  p.run = w.parkour ? { start: Date.now(), cp: -1 } : null;
  send(ws, worldMsg(w)); if (w.parkour) send(ws, { t: 'run', start: 0, limit: w.parkour.limit, cps: w.parkour.checkpoints.length, cp: -1, board: w.parkour.board }); bcastWorld(name, { t: 'pjoin', p: pubPlayer(p) }, ws);
  sys(ws, `Welcome to ${name}${w.owner ? ' (sealed by ' + w.owner + ')' : ''}`);
}
function leaveWorld(ws, p) { cancelTrade(p, 'left'); bcastWorld(p.world, { t: 'pleave', id: p.id }, ws); p.world = null; }
const C = require('./courses'), X = require('./extras');
const genAny = n => C.COURSES[n] ? C.buildCourse(n) : X.FARM.test(n) ? X.generateFarm(n) : G.PARKOUR.test(n) ? G.generateParkour(n) : G.generateWorld(n);
const W = p => store.getWorld(p.world, genAny);

// ---- movement validation ----
function solidAt(w, x, y) { if (x < 0 || x >= w.w || y >= w.h) return true; if (y < 0) return false; const id = w.fg[y * w.w + x]; return G.isSolid(id) && !(w.trees[y * w.w + x]); }
function boxFree(w, x, y) {
  const pw = 0.7, ph = 0.9;
  for (const cx of [x + 0.05, x + pw - 0.05]) for (const cy of [y + 0.05, y + ph - 0.05]) if (solidAt(w, Math.floor(cx), Math.floor(cy))) return false;
  return true;
}
function handleMove(ws, p, m) {
  const x = +m.x, y = +m.y; if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const w = W(p), now = Date.now(), dt = Math.min(1, (now - p.lastMove) / 1000);
  const maxD = 22 * dt + 0.6;
  if (Math.abs(x - p.x) > maxD || Math.abs(y - p.y) > 26 * dt + 1.1 || !boxFree(w, x, y) || x < 0 || x > w.w - 1 || y < -2 || y > w.h) {
    p.strikes = (p.strikes || 0) + 1; return send(ws, { t: 'pos', x: p.x, y: p.y });
  }
  p.x = x; p.y = y; p.face = m.face === -1 ? -1 : 1; p.lastMove = now;
  bcastWorld(p.world, { t: 'pmove', id: p.id, x, y, face: p.face }, ws);
  if (w.parkour && p.run) {
    const ev = G.parkourTouch(w, p.run, x, y, now, p.user);
    if (ev && ev.timeout) { sys(ws, '⏱ Time up! Restarting the course.'); p.run = { start: now, cp: -1 }; p.x = w.spawn.x; p.y = w.spawn.y; send(ws, { t: 'pos', x: p.x, y: p.y }); send(ws, { t: 'run', start: 0, limit: w.parkour.limit, cps: w.parkour.checkpoints.length, cp: -1, board: w.parkour.board }); }
    else if (ev && ev.checkpoint !== undefined) { send(ws, { t: 'run', cp: ev.checkpoint, cps: w.parkour.checkpoints.length, respawn: ev.pos }); }
    else if (ev && ev.finish) { E.questEvent(p.user, 'parkour'); E.log('parkour', { u: p.user.username, ms: ev.ms, w: w.name }); E.addXp(p.user, 'quest'); bcastWorld(p.world, { t: 'chat', from: '', text: `🏁 ${p.user.username} finished in ${(ev.ms / 1000).toFixed(2)}s (+${ev.prize} gems)`, kind: 'good' }); p.run = null; store.saveWorld(p.world); send(ws, { t: 'run', done: ev.ms, board: w.parkour.board }); touch(p); }
  }
  // auto pickup
  for (const d of w.drops.slice()) if (Math.abs(d.x - x - 0.35) < 1 && Math.abs(d.y - y - 0.45) < 1.1) {
    const r = G.pickup(w, p.user, { x: x - 0.15, y: y - 0.05 }, d.id);
    if (r.ok) { if (r.item === I.GEM_DROP) E.questEvent(p.user, 'gems', r.count); bcastWorld(p.world, { t: 'drop', d: r.left > 0 ? d : null, id: d.id }); touch(p); store.saveWorld(p.world); }
  }
}

// ---- trading ----
const trades = new Map(); let nextTrade = 1;
function tradeView(t) { return { t: 'trade', id: t.id, a: t.a.user.username, b: t.b.user.username, offers: t.offers, ready: t.ready, confirm: t.confirm, stage: t.ready.a && t.ready.b ? 'confirm' : 'offer' }; }
function cancelTrade(p, why) { const t = p.trade && trades.get(p.trade); if (!t) return; trades.delete(t.id); for (const q of [t.a, t.b]) { q.trade = null; send(q.ws, { t: 'tradeend', why }); } }
function tradeSide(t, p) { return t.a === p ? 'a' : 'b'; }

// ---- admin / moderation (server-side checks for every command) ----
function adminCmd(ws, p, cmd, args) {
  cmd = String(cmd || '').toLowerCase(); args = Array.isArray(args) ? args.map(String).slice(0, 4) : [];
  if (!G.canCommand(p.user, cmd)) { E.log('perm_denied', { u: p.user.username, cmd }); return sys(ws, 'You do not have permission for /' + cmd); }
  const targetName = args[0], tu = targetName && users[targetName.toLowerCase()], tp = findPlayer(targetName);
  const needTarget = ['kick', 'mute', 'unmute', 'tp', 'summon', 'tempban', 'ban', 'unban', 'give', 'gems', 'setrole'];
  if (needTarget.includes(cmd) && !tu) return sys(ws, 'No such player');
  if (needTarget.includes(cmd) && cmd !== 'tp' && !G.canTarget(p.user, tu)) return sys(ws, 'You cannot target that player');
  E.log('admin', { u: p.user.username, cmd, args });
  switch (cmd) {
    case 'kick': if (tp) { sys(tp[0], 'You were kicked by ' + p.user.username); send(tp[0], { t: 'bye', why: 'kicked' }); tp[0].close(); } return sys(ws, 'Kicked ' + tu.username);
    case 'mute': tu.mutedUntil = Date.now() + Math.min(1440, Math.max(1, +args[1] || 10)) * 60000; store.saveUsers(); return sys(ws, 'Muted ' + tu.username);
    case 'unmute': tu.mutedUntil = 0; store.saveUsers(); return sys(ws, 'Unmuted ' + tu.username);
    case 'tempban': tu.bannedUntil = Date.now() + Math.min(10080, Math.max(1, +args[1] || 60)) * 60000; store.saveUsers(); if (tp) { send(tp[0], { t: 'bye', why: 'banned' }); tp[0].close(); } return sys(ws, 'Temp-banned ' + tu.username);
    case 'ban': tu.banned = true; store.saveUsers(); if (tp) { send(tp[0], { t: 'bye', why: 'banned' }); tp[0].close(); } return sys(ws, 'Banned ' + tu.username);
    case 'unban': tu.banned = false; tu.bannedUntil = 0; store.saveUsers(); return sys(ws, 'Unbanned ' + tu.username);
    case 'tp': if (!tp) return sys(ws, 'Player offline'); if (tp[1].world !== p.world) joinWorld(ws, p, tp[1].world); p.x = tp[1].x; p.y = tp[1].y; send(ws, { t: 'pos', x: p.x, y: p.y }); return;
    case 'summon': if (!tp) return sys(ws, 'Player offline'); if (tp[1].world !== p.world) joinWorld(tp[0], tp[1], p.world); tp[1].x = p.x; tp[1].y = p.y; send(tp[0], { t: 'pos', x: p.x, y: p.y }); return;
    case 'broadcast': return bcastAll({ t: 'chat', from: p.user.username, text: args.join(' ').slice(0, 200), kind: 'broadcast' });
    case 'lockworld': case 'unlockworld': {
      const name = (args[0] || p.world || '').toUpperCase(); if (!G.validWorldName(name)) return sys(ws, 'Bad world');
      const w = store.getWorld(name, genAny);
      if (cmd === 'lockworld') w.adminLocked = true; else { w.adminLocked = false; w.owner = null; w.access = []; for (let i = 0; i < w.fg.length; i++) if (I.ITEMS[w.fg[i]] && I.ITEMS[w.fg[i]].kind === 'lock') w.fg[i] = 0; }
      store.saveWorld(name); for (const [s] of inWorld(name)) send(s, worldMsg(w)); return sys(ws, name + (cmd === 'lockworld' ? ' locked by staff' : ' unlocked'));
    }
    case 'give': { const r = G.giveItem(p.user, tu, Math.floor(+args[1]), +args[2] || 1); if (!r.ok) return sys(ws, 'Give failed: ' + r.err); E.log('spawn_item', { by: p.user.username, to: tu.username, item: +args[1], n: r.added }); store.saveUsers(); if (tp) touch(tp[1]); return sys(ws, `Gave ${r.added} ${I.itemName(+args[1])} to ${tu.username}`); }
    case 'gems': { const r = G.giveGems(p.user, tu, +args[1]); if (!r.ok) return sys(ws, 'Failed: ' + r.err); E.log('spawn_gems', { by: p.user.username, to: tu.username, n: +args[1] }); store.saveUsers(); if (tp) touch(tp[1]); return sys(ws, 'Gems updated for ' + tu.username); }
    case 'setrole': { const r = G.setRole(p.user, tu, args[1]); if (!r.ok) return sys(ws, 'Failed: ' + r.err); store.saveUsers(); if (tp) { touch(tp[1]); bcastWorld(tp[1].world, { t: 'pjoin', p: pubPlayer(tp[1]) }); } return sys(ws, tu.username + ' is now ' + args[1]); }
    case 'spawn': return sys(ws, 'Use /give <player> <itemId> <count>');
  }
}

function handle(ws, p, m) {
  const w = p.world && W(p), u = p.user;
  switch (m.t) {
    case 'join': return joinWorld(ws, p, m.name);
    case 'move': return w && handleMove(ws, p, m);
    case 'hit': case 'place': {
      if (!w) return; const x = m.x | 0, y = m.y | 0;
      const now = Date.now(); if (now - (p.lastAct || 0) < 110) return; p.lastAct = now;
      if (!G.inReach({ x: Math.floor(p.x + 0.35), y: Math.floor(p.y + 0.45) }, x, y)) return sys(ws, 'Too far away');
      const r = m.t === 'hit' ? G.hit(w, u, x, y, now) : G.place(w, u, x, y, m.item | 0, now);
      if (!r.ok) { if (r.err === 'locked') sys(ws, 'This world is sealed. Ask the owner for access.'); return; }
      if (r.progress) return bcastWorld(p.world, { t: 'crack', x, y, p: r.progress });
      if (r.growing) return sys(ws, `Still growing: ${r.growing}s left`);
      for (const c of r.changed || []) bcastWorld(p.world, { t: 'tile', ...c, tree: r.tree ? { age: 0, grow: r.tree.grow } : null });
      for (const d of r.drops || []) bcastWorld(p.world, { t: 'drop', d, id: d.id });
      if (r.locked) { bcastWorld(p.world, { t: 'owner', owner: w.owner, access: w.access }); E.log('world_seal', { u: u.username, w: w.name }); }
      const ev = m.t === 'hit' ? (r.harvested ? 'harvest' : 'break') : 'place';
      E.questEvent(u, ev); const lv = E.addXp(u, ev); if (lv) sys(ws, `Level up! You are now level ${lv}`, 'good');
      if (m.t === 'place' && I.ITEMS[m.item | 0] && I.ITEMS[m.item | 0].kind === 'vend') send(ws, { t: 'vend', x, y, v: w.vends[G.idx(w, x, y)] });
      store.saveWorld(p.world); return touch(p);
    }
    case 'drop': { if (!w) return; const r = G.dropItem(w, u, { x: p.x, y: p.y }, m.item | 0, m.n | 0); if (r.ok) { E.log('drop', { u: u.username, item: m.item, n: m.n, w: w.name }); bcastWorld(p.world, { t: 'drop', d: r.drop, id: r.drop.id }); store.saveWorld(p.world); touch(p); } return; }
    case 'splice': { const r = G.splice(u, m.a | 0, m.b | 0); if (!r.ok) return sys(ws, r.err === 'norecipe' ? 'Those seeds do not combine.' : 'Cannot splice: ' + r.err); E.questEvent(u, 'splice'); E.addXp(u, 'splice'); E.log('splice', { u: u.username, a: m.a, b: m.b, r: r.result }); sys(ws, 'New seed: ' + I.itemName(r.result), 'good'); return touch(p); }
    case 'buy': { const r = E.atomic([u], () => G.buy(u, String(m.pack))); if (!r.ok) return sys(ws, r.err === 'gems' ? 'Not enough gems' : 'Cannot buy'); E.log('buy', { u: u.username, pack: m.pack }); sys(ws, 'Bought ' + I.SHOP[m.pack].name, 'good'); return touch(p); }
    case 'chat': {
      const text = String(m.text || '').slice(0, 200).trim(); if (!text) return;
      if (text[0] !== '/' || !/^\/(msg|pm|w) /.test(text)) { if (now() - (p.lastChat || 0) < 700) return; p.lastChat = now(); }
      if (text[0] === '/') {
        const [c, ...args] = text.slice(1).split(/\s+/);
        if (c === 'access' || c === 'unaccess') {
          if (!w || (w.owner !== u.username && !G.hasRole(u, 'admin'))) return sys(ws, 'Only the world owner can do that');
          const n = users[String(args[0] || '').toLowerCase()]; if (!n) return sys(ws, 'No such player');
          w.access = w.access.filter(a => a !== n.username); if (c === 'access') w.access.push(n.username);
          store.saveWorld(p.world); bcastWorld(p.world, { t: 'owner', owner: w.owner, access: w.access }); return sys(ws, (c === 'access' ? 'Gave build access to ' : 'Removed ') + n.username);
        }
        if (c === 'msg' || c === 'pm' || c === 'w') return handle(ws, p, { t: 'pm', name: args[0], text: args.slice(1).join(' ') }, true);
        if (c === 'friend') return handle(ws, p, { t: 'friend', op: 'add', name: args[0] });
        if (c === 'warp') return joinWorld(ws, p, args[0]);
        if (c === 'trade') { m = { t: 'trade_req', name: args[0] }; return handle(ws, p, m); }
        if (c === 'help') return sys(ws, '/warp NAME, /trade player, /access player, /unaccess player' + (G.hasRole(u, 'mod') ? ' | staff: /kick /mute /unmute /tempban /tp /summon' : '') + (G.hasRole(u, 'admin') ? ' /broadcast /unban /lockworld /unlockworld' : '') + (G.hasRole(u, 'owner') ? ' /ban /give /gems /setrole' : ''));
        return adminCmd(ws, p, c, args);
      }
      if (u.mutedUntil > Date.now()) return sys(ws, 'You are muted');
      if (!w) return;
      return bcastWorld(p.world, { t: 'chat', from: u.username, role: u.role, text, kind: 'say' });
    }
    case 'equip': { const r = G.equip(u, m.item | 0); if (!r.ok) return; store.saveUsers(); bcastWorld(p.world, { t: 'pjoin', p: pubPlayer(p) }); return touch(p); }
    case 'restart': { if (!w || !w.parkour) return; p.run = { start: Date.now(), cp: -1 }; p.x = w.spawn.x; p.y = w.spawn.y; send(ws, { t: 'pos', x: p.x, y: p.y }); return send(ws, { t: 'run', start: 0, limit: w.parkour.limit, cps: w.parkour.checkpoints.length, cp: -1, board: w.parkour.board }); }
    case 'legend': {
      if (m.op === 'start') { const r = E.legendStart(u); if (!r.ok) return sys(ws, r.err === 'level' ? `You need level ${E.legendLevel(u)} for the Mythic Path` : 'Mythic Path already active'); sys(ws, 'The Mythic Path begins…', 'good'); }
      else if (m.op === 'quiz') { const r = E.quizStart(u); if (!r.ok) return sys(ws, r.err === 'cooldown' ? 'Quiz on cooldown, study the game a bit more!' : 'Finish the earlier steps first'); }
      else if (m.op === 'answer') { const r = E.quizAnswer(u, Array.isArray(m.answers) ? m.answers.slice(0, 5).map(x => x | 0) : null); if (!r.ok) return sys(ws, 'Quiz error: ' + r.err);
        if (r.passed) { bcastAll({ t: 'chat', from: '', text: `🌟 ${u.username} completed the Mythic Path and earned ${I.itemName(r.item)}!`, kind: 'broadcast' }); } else sys(ws, `Only ${r.right}/5 correct. Try again in 10 minutes.`); }
      return touch(p);
    }
    case 'friend': {
      const tu = users[String(m.name || '').toLowerCase()]; const op = m.op;
      if (op === 'list') return sendFriends(ws, u);
      if (!tu) return sys(ws, 'No such player');
      const r = op === 'add' ? G.friendRequest(u, tu) : op === 'accept' ? G.friendAccept(u, tu) : op === 'decline' ? (u.friendReq = (u.friendReq || []).filter(n => n !== tu.username), { ok: true }) : op === 'remove' ? G.friendRemove(u, tu) : { ok: false, err: 'op' };
      if (!r.ok) return sys(ws, 'Friends: ' + r.err);
      store.saveUsers(u.username.toLowerCase()); store.saveUsers(tu.username.toLowerCase());
      const tp = findPlayer(tu.username);
      if (r.pending) { sys(ws, 'Friend request sent to ' + tu.username); if (tp) { sys(tp[0], `👋 ${u.username} wants to be friends (open 👥)`, 'good'); sendFriends(tp[0], tu); } }
      if (r.accepted) { sys(ws, 'You and ' + tu.username + ' are now friends', 'good'); if (tp) { sys(tp[0], u.username + ' accepted your friend request', 'good'); sendFriends(tp[0], tu); } }
      return sendFriends(ws, u);
    }
    case 'pm': {
      const text = String(m.text || '').slice(0, 200).trim(); if (!text) return;
      if (Date.now() - (p.lastChat || 0) < 700) return; p.lastChat = Date.now();
      if (u.mutedUntil > Date.now()) return sys(ws, 'You are muted');
      const tp = findPlayer(m.name); if (!tp || tp[1] === p) return sys(ws, 'That player is offline');
      if ((tp[1].user.blocked || []).includes(u.username)) return sys(ws, 'Message not delivered');
      send(tp[0], { t: 'pm', from: u.username, role: u.role, text }); send(ws, { t: 'pm', to: tp[1].user.username, text });
      E.log('pm', { from: u.username, to: tp[1].user.username }); return;
    }
    case 'daily': { const r = X.claimDaily(u); if (!r.ok) return sys(ws, 'Daily reward already claimed. Come back tomorrow!'); sys(ws, `🎁 Day ${r.streak} reward: +${r.gems} gems` + (r.crate ? ' and a Mystery Crate!' : ''), 'good'); send(ws, { t: 'dailyok', ...r }); return touch(p); }
    case 'leaders': return send(ws, { t: 'leaders', ...X.leaders(users) });
    case 'tradelog': { if (!allow('tl:' + u.username, 20)) return; return send(ws, { t: 'tradelog', all: G.hasRole(u, 'owner'), list: X.tradeHistory(store.tradeLogs(G.hasRole(u, 'owner') ? 300 : 2000), u) }); }
    case 'admin': return adminCmd(ws, p, m.cmd, m.args);
    case 'logs': if (!G.hasRole(u, 'owner')) return sys(ws, 'Owner only'); return send(ws, { t: 'logs', logs: (m.filter ? E.recentLogs(150, String(m.filter).slice(0, 30)) : store.logs(150)) });
    case 'setprice': { const r = E.setMarketPrice(u, m.id | 0, +m.price); if (r.ok) send(ws, { t: 'prices', market: E.market }); return sys(ws, r.ok ? `Price of ${I.itemName(m.id | 0)} set to ${m.price | 0}` : 'Failed: ' + r.err); }
    case 'prices': if (!G.hasRole(u, 'owner')) return; return send(ws, { t: 'prices', market: E.market });
    case 'banlist': {
      if (!G.hasRole(u, 'mod')) return sys(ws, 'Staff only');
      const t = Date.now(), list = Object.values(users).filter(x => x.banned || x.bannedUntil > t || x.mutedUntil > t || x.role !== 'user')
        .map(x => ({ name: x.username, role: x.role, banned: !!x.banned, until: x.bannedUntil > t ? x.bannedUntil : 0, muted: x.mutedUntil > t ? x.mutedUntil : 0, online: !!findPlayer(x.username) }));
      return send(ws, { t: 'banlist', list, players: Object.keys(users).length, online: players.size });
    }
    case 'carnival': { const r = E.setCarnival(u, m.on === null ? null : !!m.on); if (r.ok) bcastAll({ t: 'chat', from: '', text: E.carnivalActive() ? '🎪 The Lantern Carnival is OPEN! Spin the wheel from the menu.' : 'The carnival has closed.', kind: 'broadcast' }); else sys(ws, 'Owner only'); return; }
    case 'spin': { const r = E.spinWheel(u); if (!r.ok) return sys(ws, r.err === 'closed' ? 'The carnival is closed right now' : 'Not enough gems'); E.addXp(u, 'carnival'); sys(ws, r.kind === 'gems' ? `Wheel: +${r.n} gems` : `Wheel: ${r.n}× ${I.itemName(r.item)} (${r.kind})!`, r.kind === 'legendary' ? 'broadcast' : 'good'); if (r.kind === 'legendary') bcastAll({ t: 'chat', from: '', text: `🌟 ${u.username} won a LEGENDARY ${I.itemName(r.item)}!`, kind: 'broadcast' }); return touch(p); }
    case 'shuffle': { const r = E.lanternShuffle(u, m.pick | 0); if (!r.ok) return sys(ws, r.err === 'closed' ? 'The carnival is closed right now' : r.err === 'gems' ? 'Not enough gems' : 'Bad pick'); send(ws, { t: 'carn', game: 'shuffle', ...r }); sys(ws, r.win ? '🏮 Found the star! +40 gems' + (r.item ? ' and ' + I.itemName(r.item) : '') : 'No star there… it was lantern ' + (r.star + 1), r.win ? 'good' : 'sys'); return touch(p); }
    case 'hl': {
      const r = m.dir === 'start' ? E.hlStart(u) : E.hlGuess(u, String(m.dir));
      if (!r.ok) return sys(ws, r.err === 'closed' ? 'The carnival is closed right now' : r.err === 'gems' ? 'Not enough gems' : 'High-Low: ' + r.err);
      send(ws, { t: 'carn', game: 'hl', ...r, state: u.hl || null });
      if (r.cashed) { sys(ws, `Cashed out ${r.cashed} gems` + (r.item ? ` and a LEGENDARY ${I.itemName(r.item)}!` : ''), 'good'); if (r.item) bcastAll({ t: 'chat', from: '', text: `🌟 ${u.username} won a LEGENDARY at High-Low!`, kind: 'broadcast' }); }
      if (r.right === false) sys(ws, `It was ${r.next}. Streak lost!`);
      return touch(p);
    }
    case 'crate': { const r = E.openCrate(u); if (!r.ok) return sys(ws, 'No Mystery Crate (buy in shop)'); sys(ws, 'Crate: ' + (r.item === 'gems' ? r.n + ' gems' : r.n + '× ' + I.itemName(r.item)), 'good'); return touch(p); }
    case 'convert': { const r = E.convertSeal(u, m.item | 0, m.dir); if (!r.ok) return sys(ws, 'Cannot convert: ' + r.err); return touch(p); }
    case 'quest': { const r = E.claimQuest(u, String(m.id)); if (!r.ok) return sys(ws, 'Quest not finished'); E.addXp(u, 'quest'); sys(ws, `Quest reward: +${r.gems} gems`, 'good'); return touch(p); }
    case 'clinic': {
      const r = m.tool ? E.clinicUse(u, String(m.tool)) : E.clinicStart(u);
      if (!r.ok) return sys(ws, r.err === 'needkit' ? 'You need a Mender Kit (shop)' : 'Clinic: ' + r.err);
      if (r.done) { if (r.success) { E.questEvent(u, 'clinic_win'); E.addXp(u, 'clinic_win'); } sys(ws, r.success ? `Patient healed! +${r.gems} gems` + (r.bonus ? ' and a Gemrock Seed' : '') : 'The patient left unhappy… try again', r.success ? 'good' : 'sys'); }
      send(ws, { t: 'clinic', state: E.clinicView(u) || null, last: r.correct }); return touch(p);
    }
    case 'vend_open': { if (!w) return; const f = E.vendAt(w, m.x | 0, m.y | 0); if (f) send(ws, { t: 'vend', x: m.x | 0, y: m.y | 0, v: f.v }); return; }
    case 'vend_stock': case 'vend_buy': case 'vend_collect': {
      if (!w) return; const x = m.x | 0, y = m.y | 0;
      if (!G.inReach({ x: Math.floor(p.x + 0.35), y: Math.floor(p.y + 0.45) }, x, y)) return sys(ws, 'Too far away');
      const f0 = E.vendAt(w, x, y), seller = f0 && users[f0.v.owner.toLowerCase()];
      const r = m.t === 'vend_stock' ? E.vendStock(w, u, x, y, m.item | 0, m.n | 0, m.price | 0) : m.t === 'vend_buy' ? E.vendBuy(w, u, x, y, m.n | 0, m.price | 0) : E.vendCollect(w, u, x, y);
      if (!r.ok) return sys(ws, 'Barter Box: ' + r.err);
      if (m.t === 'vend_buy') { E.questEvent(u, 'trade'); const sp = seller && findPlayer(seller.username); if (sp) sys(sp[0], `${u.username} bought ${r.qty}× ${I.itemName(r.item)} from your Barter Box`, 'good'); }
      store.saveWorld(p.world); bcastWorld(p.world, { t: 'vend', x, y, v: E.vendAt(w, x, y).v }); return touch(p);
    }
    case 'trade_req': {
      const tp = findPlayer(m.name); if (!tp || tp[1] === p || tp[1].world !== p.world) return sys(ws, 'Player must be in this world');
      if (p.trade || tp[1].trade) return sys(ws, 'Someone is already trading');
      tp[1].invite = p.id; send(tp[0], { t: 'tradeinvite', from: u.username }); return sys(ws, 'Trade request sent to ' + tp[1].user.username);
    }
    case 'trade_accept': {
      const tp = findPlayer(m.name); if (!tp || p.invite !== tp[1].id || tp[1].trade || p.trade || tp[1].world !== p.world) return sys(ws, 'Trade request expired');
      p.invite = null; const t = { id: nextTrade++, a: tp[1], b: p, offers: { a: { items: [], gems: 0 }, b: { items: [], gems: 0 } }, ready: { a: false, b: false }, confirm: { a: false, b: false } };
      trades.set(t.id, t); t.a.trade = t.b.trade = t.id; for (const q of [t.a, t.b]) send(q.ws, tradeView(t)); return;
    }
    case 'trade_offer': case 'trade_ready': case 'trade_confirm': case 'trade_cancel': {
      const t = p.trade && trades.get(p.trade); if (!t) return;
      if (m.t === 'trade_cancel') return cancelTrade(p, u.username + ' cancelled');
      const s = tradeSide(t, p);
      if (m.t === 'trade_offer') {
        const o = { items: Array.isArray(m.items) ? m.items.slice(0, 8).map(a => [a[0] | 0, a[1] | 0]) : [], gems: Math.max(0, m.gems | 0) };
        if (!G.validOffer(o)) return sys(ws, 'Bad offer');
        t.offers[s] = o; t.ready = { a: false, b: false }; t.confirm = { a: false, b: false }; // any change resets both sides
      } else if (m.t === 'trade_ready') t.ready[s] = true;
      else if (t.ready.a && t.ready.b) t.confirm[s] = true;
      if (t.confirm.a && t.confirm.b) {
        const r = G.executeTrade(t.a.user, t.b.user, t.offers.a, t.offers.b);
        E.log('trade', { a: t.a.user.username, b: t.b.user.username, offers: t.offers, ok: r.ok });
        if (r.ok) { for (const q of [t.a, t.b]) { E.questEvent(q.user, 'trade'); E.addXp(q.user, 'trade'); touch(q); } }
        trades.delete(t.id); t.a.trade = t.b.trade = null;
        for (const q of [t.a, t.b]) send(q.ws, { t: 'tradeend', why: r.ok ? 'Trade complete ✅' : 'Trade failed: items changed or no space' });
        store.flush(); return;
      }
      for (const q of [t.a, t.b]) send(q.ws, tradeView(t)); return;
    }
  }
}
const now = () => Date.now();

wss.on('connection', (ws, req) => {
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  const ip = req.socket.remoteAddress; let p = null, tokens = 60, last = Date.now();
  ws.on('message', raw => {
    const t = Date.now(); tokens = Math.min(60, tokens + (t - last) * 0.04); last = t; // ~40 msg/s sustained
    if (--tokens < 0) { if (tokens < -200) ws.close(); return; }
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    try {
      if (!p) {
        if (m.t !== 'auth') return;
        const name = store.getSession(m.token), u = name && users[name];
        if (!u) return send(ws, { t: 'autherr' });
        if (isBanned(u)) { send(ws, { t: 'autherr', err: 'banned' }); return ws.close(); }
        const old = findPlayer(u.username); if (old) { send(old[0], { t: 'bye', why: 'elsewhere' }); old[0].close(); }
        p = { id: nextPid++, ws, user: u, world: null, x: 0, y: 0 }; players.set(ws, p);
        send(ws, me(p)); sendFriends(ws, u); setTimeout(() => notifyFriends(u, true), 50); return joinWorld(ws, p, String(m.world || 'START'));
      }
      handle(ws, p, m);
    } catch (e) { console.error('handler error', e); }
  });
  ws.on('close', () => { if (p) { if (p.world) leaveWorld(ws, p); players.delete(ws); if (!findPlayer(p.user.username)) notifyFriends(p.user, false); } });
  ws.on('error', () => {});
});
// heartbeat: drop dead phone connections (and keep proxies from closing idle sockets)
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; try { ws.ping(); } catch {} } }, 25000).unref();
setInterval(() => { try { store.flush(); } catch (e) { console.error(e); } }, 3000).unref();
const shutdown = () => { try { store.flush(); } catch (e) { console.error(e); } process.exit(0); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
process.on('uncaughtException', e => console.error('uncaught', e));
server.on('error', e => { console.error(e.message); process.exit(1); });
server.listen(PORT, '0.0.0.0', () => console.log('Brickbloom running on http://localhost:' + PORT + (OWNER ? ' owner=' + OWNER : ' (set OWNER_USERNAME to create the owner)')));
