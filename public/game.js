'use strict';
(() => {
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
let INFO = null, ws = null, ME = null, WORLD = null, others = new Map(), cracks = {}, tex = {}, run = null;
let TS = 32, cam = { x: 0, y: 0 }, mode = 'break', sel = 0, hotbar = [0], vendOpen = null, trade = null, clinicState = null;
const pl = { x: 0, y: 0, vx: 0, vy: 0, ground: false, face: 1 };
const keys = {}, touch = { l: false, r: false, j: false };

// ---------- procedural pixel art (original) ----------
function rng(s) { return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return `rgb(${m(r)},${m(g)},${m(b)})`; }
function makeTex(id) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  const it = INFO.items[id]; const seed = id >= INFO.seedOffset && id < 9000;
  if (id == INFO.gemDrop) { g.fillStyle = '#3fe0b0'; g.beginPath(); [[4,2],[12,2],[15,8],[12,14],[4,14],[1,8]].forEach(([x,y],k)=>k?g.lineTo(x,y):g.moveTo(x,y)); g.fill(); g.fillStyle='#b6fff0'; g.fillRect(5,4,3,3); g.fillStyle='#1f8f72'; g.fillRect(4,11,8,2); return c; }
  if (seed) { const b = INFO.items[id - INFO.seedOffset]; g.fillStyle = shade(b.color, -0.35); g.beginPath(); g.ellipse(8, 9, 4.5, 5.5, 0, 0, 7); g.fill(); g.fillStyle = b.color; g.beginPath(); g.ellipse(7, 8, 3, 4, 0, 0, 7); g.fill(); g.fillStyle = '#fff8'; g.fillRect(6, 6, 2, 2); return c; }
  if (!it) return c;
  const r = rng(id * 7919 + 3), col = it.color;
  const noise = (dk, lt) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = r(); g.fillStyle = v < 0.15 ? shade(col, dk) : v > 0.88 ? shade(col, lt) : col; g.fillRect(x, y, 1, 1); } };
  const border = () => { g.fillStyle = shade(col, -0.4); g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.fillStyle = shade(col, 0.25); g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); };
  const form = it.form || ({ 7: 'brick', 8: 'tile', 11: 'plank', 17: 'brick' })[id] || it.kind;
  if (it.kind === 'skin') { g.fillStyle = col; if (it.slot === 'hat') { g.fillRect(3, 6, 10, 6); g.fillRect(1, 11, 14, 2); } else if (it.slot === 'shirt') { g.fillRect(3, 3, 10, 11); g.fillRect(0, 4, 3, 6); g.fillRect(13, 4, 3, 6); } else { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.stroke(); } g.fillStyle = '#fff6'; g.fillRect(4, 7, 2, 2); return c; }
  switch (id) {
    case 1: noise(-0.25, 0.15); g.fillStyle = '#5cb04a'; g.fillRect(0, 0, 16, 3); for (let x = 0; x < 16; x += 2) g.fillRect(x, 3, 1, 1 + (x % 3)); return c;
    case 3: for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (Math.sin(x * 0.8 + y * 0.5) > 0.3) ? '#ffd43b' : (r() < 0.5 ? '#ff5a1f' : '#e8590c'); g.fillRect(x, y, 1, 1); } return c;
    case 4: noise(-0.5, 0.2); g.fillStyle = '#000'; for (let k = 0; k < 6; k++) g.fillRect(r() * 14 | 0, r() * 14 | 0, 2, 1); return c;
    case 5: g.fillStyle = '#2b2433'; g.fillRect(2, 0, 12, 16); g.fillStyle = '#3fc1ff'; g.fillRect(4, 2, 8, 14); g.fillStyle = '#c3f0ff'; g.fillRect(5, 3, 2, 12); g.fillStyle = '#ffd43b'; g.fillRect(10, 9, 1, 2); return c;
    case 9: g.fillStyle = '#bfe9ff55'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#e7f8ff'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(3, 3, 1, 4); g.fillRect(4, 3, 3, 1); return c;
    case 14: g.fillStyle = '#f4f7ff'; [[5, 9, 5], [10, 8, 5], [8, 6, 4]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }); return c;
    case 16: g.fillStyle = '#2f9e44'; g.fillRect(7, 8, 2, 8); g.fillStyle = col; [[8, 3], [5, 6], [11, 6], [8, 9]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }); g.fillStyle = '#ffd43b'; g.fillRect(7, 5, 2, 2); return c;
    case 19: case 23: case 24: g.fillStyle = shade(col, -0.4); g.fillRect(2, 6, 12, 10); g.fillStyle = col; g.fillRect(3, 7, 10, 8); g.strokeStyle = shade(col, -0.3); g.lineWidth = 2; g.beginPath(); g.arc(8, 6, 4, Math.PI, 0); g.stroke(); g.fillStyle = '#000a'; g.fillRect(7, 10, 2, 3); return c;
    case 25: g.fillStyle = '#1b5e28'; g.fillRect(1, 0, 14, 16); g.fillStyle = col; g.fillRect(2, 1, 12, 14); g.fillStyle = '#bfe9ff'; g.fillRect(4, 3, 8, 6); g.fillStyle = '#ffd43b'; g.fillRect(5, 11, 6, 2); return c;
    case 26: g.fillStyle = '#fff'; g.fillRect(2, 4, 12, 10); g.fillStyle = col; g.fillRect(6, 6, 4, 6); g.fillRect(5, 7, 6, 4); g.fillStyle = '#555'; g.fillRect(6, 2, 4, 2); return c;
    case 27: g.fillStyle = '#5a2d91'; g.fillRect(1, 3, 14, 12); g.fillStyle = col; g.fillRect(2, 4, 12, 10); g.fillStyle = '#ffd43b'; g.fillRect(7, 3, 2, 12); g.font = 'bold 8px monospace'; g.fillStyle = '#fff'; g.fillText('?', 9.5, 12); return c;
    case 28: g.fillStyle = '#ddd'; g.fillRect(3, 1, 2, 15); g.fillStyle = col; g.beginPath(); g.moveTo(5, 2); g.lineTo(14, 5); g.lineTo(5, 8); g.fill(); return c;
    case 29: g.fillStyle = col; g.fillRect(1, 2, 3, 14); g.fillRect(12, 2, 3, 14); g.fillRect(1, 1, 14, 3); for (let x = 2; x < 14; x += 2) { g.fillStyle = x % 4 ? '#000' : '#fff'; g.fillRect(x, 1, 2, 2); } return c;
    case 30: noise(-0.2, 0.2); g.fillStyle = '#fff'; g.fillRect(3, 3, 10, 2); g.fillRect(5, 7, 6, 2); return c;
  }
  if (it.kind === 'bg') { noise(-0.2, 0.1); g.fillStyle = '#0005'; g.fillRect(0, 0, 16, 16); for (let y = 3; y < 16; y += 4) { g.fillStyle = '#0003'; g.fillRect(0, y, 16, 1); } return c; }
  if (form === 'brick') { g.fillStyle = shade(col, -0.35); g.fillRect(0, 0, 16, 16); for (let y = 0; y < 16; y += 4) for (let x = (y / 4 % 2) * 4 - 4; x < 16; x += 8) { g.fillStyle = r() < 0.5 ? col : shade(col, 0.1); g.fillRect(x + 1, y + 1, 7, 3); } return c; }
  if (form === 'tile' || form === 'mosaic') { noise(-0.1, 0.1); g.fillStyle = shade(col, -0.35); for (let k = 0; k < 16; k += form === 'tile' ? 8 : 4) { g.fillRect(k, 0, 1, 16); g.fillRect(0, k, 16, 1); } if (form === 'mosaic') for (let k = 0; k < 6; k++) { g.fillStyle = shade(col, r() - 0.5); g.fillRect((r() * 4 | 0) * 4 + 1, (r() * 4 | 0) * 4 + 1, 3, 3); } return c; }
  if (form === 'pillar') { g.fillStyle = shade(col, -0.3); g.fillRect(2, 0, 12, 16); g.fillStyle = col; g.fillRect(4, 0, 8, 16); g.fillStyle = shade(col, 0.3); g.fillRect(5, 0, 2, 16); g.fillStyle = shade(col, -0.4); g.fillRect(1, 0, 14, 2); g.fillRect(1, 14, 14, 2); return c; }
  if (form === 'plank') { for (let y = 0; y < 16; y += 4) { g.fillStyle = r() < 0.5 ? col : shade(col, -0.1); g.fillRect(0, y, 16, 4); g.fillStyle = shade(col, -0.4); g.fillRect(0, y + 3, 16, 1); g.fillRect((r() * 14) | 0, y, 1, 3); } return c; }
  if (form === 'lantern' || id === 15) { g.fillStyle = '#333'; g.fillRect(7, 0, 2, 3); g.fillStyle = shade(col, -0.3); g.fillRect(4, 3, 8, 11); g.fillStyle = col; g.fillRect(5, 4, 6, 9); g.fillStyle = '#fff9'; g.fillRect(6, 5, 2, 4); return c; }
  if (form === 'banner') { g.fillStyle = '#6b4826'; g.fillRect(2, 0, 12, 2); g.fillStyle = col; g.beginPath(); g.moveTo(3, 2); g.lineTo(13, 2); g.lineTo(13, 15); g.lineTo(8, 12); g.lineTo(3, 15); g.fill(); g.fillStyle = shade(col, 0.4); g.fillRect(7, 5, 2, 4); return c; }
  if (form === 'crystal' || id === 13) { if (id === 13) noise(-0.3, 0.3); g.fillStyle = shade(col, 0.2); g.beginPath(); g.moveTo(8, 1); g.lineTo(13, 8); g.lineTo(8, 15); g.lineTo(3, 8); g.fill(); g.fillStyle = shade(col, 0.6); g.fillRect(7, 4, 2, 5); return c; }
  if (id === 12 || id === 22) { noise(-0.2, 0.1); g.fillStyle = id === 22 ? '#7b7f8c' : '#5c5f6b'; g.fillRect(0, 0, 16, 16); for (let k = 0; k < 7; k++) { g.fillStyle = shade(col, r() * 0.5); g.fillRect(r() * 13 | 0, r() * 13 | 0, 3, 2); } border(); return c; }
  if (id === 10) { noise(-0.3, 0.2); g.fillStyle = '#7bd36b'; for (let k = 0; k < 10; k++) g.fillRect(r() * 15 | 0, r() * 15 | 0, 1, 2); return c; }
  if (id === 18) { noise(-0.1, 0.4); g.fillStyle = '#fff'; g.fillRect(3, 3, 1, 5); g.fillRect(1, 5, 5, 1); border(); return c; }
  noise(-0.2, 0.15); border(); return c;
}
const TV = (id, v) => tex[id + '_' + v] || (tex[id + '_' + v] = ART.ptex(+id, INFO, v));
const T = id => tex[id] || (tex[id] = ART.ptex(+id, INFO, 0));
function icon(id, size = 32) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(T(id), 0, 0, size, size); if (ART.SEAMLESS.has(+id)) { const e = size / 16; g.fillStyle = "#2a1d3d"; g.fillRect(0, 0, size, e); g.fillRect(0, size - e, size, e); g.fillRect(0, 0, e, size); g.fillRect(size - e, 0, e, size); g.fillStyle = "#ffffff40"; g.fillRect(e, e, size - 2 * e, e); } return c; }
const name = id => id >= INFO.seedOffset && id < 9000 ? INFO.items[id - INFO.seedOffset].name + ' Seed' : (INFO.items[id] || { name: '?' }).name;
const rarity = id => (INFO.items[id >= INFO.seedOffset ? id - INFO.seedOffset : id] || {}).rarity || 'common';

// ---------- login ----------
$('lu').value = localStorage.bbUser || ''; $('lw').value = localStorage.bbWorld || 'START';
const loader = { show(msg) { $('loader').classList.remove('hidden'); $('lmsg').textContent = msg || 'Loading…'; }, hide() { $('loader').classList.add('hidden'); } };
async function fetchWake(url, opt = {}, tries = 8) { // Render free servers sleep; keep trying while showing a friendly message
  for (let k = 0; k < tries; k++) { const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000), slow = setTimeout(() => loader.show('Server is waking up… this can take up to a minute ☕'), 2500);
    try { const r = await fetch(url, { ...opt, signal: ctl.signal }); clearTimeout(tm); clearTimeout(slow); if (r.status >= 502 && r.status <= 504) throw new Error('waking'); return r; }
    catch (e) { clearTimeout(tm); clearTimeout(slow); loader.show('Server is waking up… this can take up to a minute ☕'); await new Promise(r => setTimeout(r, 2500)); } }
  throw new Error('offline'); }
async function auth(kind) {
  $('lerr').textContent = '';
  try {
    loader.show('Connecting…'); const r = await fetchWake('/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: $('lu').value.trim(), password: $('lp').value }) });
    const j = await r.json(); if (!r.ok) { loader.hide(); return ($('lerr').textContent = j.err || 'Error'); }
    localStorage.bbUser = j.username; localStorage.bbTok = j.token; localStorage.bbWorld = ($('lw').value || 'START').toUpperCase(); start(j.token);
  } catch { loader.hide(); $('lerr').textContent = 'Cannot reach the server. Check your internet and try again.'; }
}
$('bLogin').onclick = () => auth('login'); $('bReg').onclick = () => auth('register');
if (localStorage.bbTok) start(localStorage.bbTok); else fetchWake('/healthz').then(() => loader.hide(), () => { loader.hide(); $('lerr').textContent = 'Server offline, try again soon.'; });
$('lp').onkeydown = e => { if (e.key === 'Enter') auth('login'); };

async function start(token) {
  loader.show('Loading world…');
  try { INFO = await (await fetchWake('/api/info')).json(); } catch { loader.hide(); $('lerr').textContent = 'Cannot reach the server. Try again.'; return; }
  $('login').classList.add('hidden'); $('hud').classList.remove('hidden'); setTimeout(() => loader.hide(), 8000); rotateHint();
  connect(token);
}
let retry = 0, stopReconnect = '', rTimer = 0;
function connect(token) {
  if (ws && ws.readyState <= 1) return;
  const me = ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => send({ t: 'auth', token, world: localStorage.bbWorld || 'START' });
  ws.onmessage = e => { retry = 0; const m = JSON.parse(e.data); if (m.t === 'bye') { stopReconnect = m.why === 'elsewhere' ? 'You logged in on another device. Reload to play here.' : m.why === 'banned' ? 'You were banned.' : 'You were kicked. Reload to rejoin.'; return; } onMsg(m); };
  ws.onclose = () => {
    if (me !== ws) return;
    if (stopReconnect) return say(stopReconnect, 'sys');
    retry = Math.min(retry + 1, 6); const d = 1000 * retry; say('Disconnected. Reconnecting…', 'sys'); clearTimeout(rTimer); rTimer = setTimeout(() => connect(token), d);
  };
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && ws && ws.readyState > 1 && !stopReconnect) { retry = 0; clearTimeout(rTimer); connect(localStorage.bbTok || ''); } });
const send = m => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
function say(text, kind = 'say', from = '', role) {
  const d = document.createElement('div'); d.className = kind;
  if (from) { const b = document.createElement('b'); b.className = 'tag-' + role; b.textContent = (role === 'owner' ? '👑 ' : role === 'admin' ? '🛡 ' : role === 'mod' ? '🔧 ' : '') + from + ': '; d.appendChild(b); }
  d.appendChild(document.createTextNode(text)); $('log').appendChild(d);
  while ($('log').children.length > 60) $('log').firstChild.remove(); $('log').scrollTop = 1e9;
}
function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = 0, 1800); }

function onMsg(m) {
  switch (m.t) {
    case 'autherr': localStorage.removeItem('bbTok'); location.reload(); break;
    case 'me': if (ME && m.gems > ME.gems) SFX.play('gem'); if (ME && m.level > ME.level) { SFX.play('good'); window.FX && FX.levelUp(); } ME = m; questPing = !!(m.daily && m.daily.canClaim); updPing(); $('gems').textContent = m.gems; $('lvl').textContent = 'Lv ' + m.level; $('bOwner').classList.toggle('hidden', !['owner', 'admin', 'mod'].includes(m.role)); refreshHotbar(); if (curPanel && !(curPanel === 'legend' && m.legend.quiz && B.querySelector('input[type=radio]:checked')) && !(curPanel === 'vend' && document.activeElement.tagName === 'INPUT')) panels[curPanel](); break;
    case 'world': loader.hide(); WORLD = m; others.clear(); cracks = {}; chunks.clear(); camInit = false; const now = performance.now();
      for (const t of Object.values(m.trees)) t.at = now - t.age;
      m.players.forEach(p => p.name !== ME.username && others.set(p.id, { ...p, rx: p.x, ry: p.y }));
      pl.x = m.spawn.x; pl.y = m.spawn.y; pl.vx = pl.vy = 0; run = null; $('timer').classList.add('hidden');
      $('wname').textContent = m.name + (m.owner ? ' 🔒' + m.owner : '') + (m.parkour ? ' 🏃' : ''); localStorage.bbWorld = m.name; break;
    case 'tile': { const i = m.y * WORLD.w + m.x; const was = WORLD.fg[i] || WORLD.bg[i]; SFX.play(m.fg || (m.bg && !was) ? 'place' : 'break'); if (window.FX) FX.burst(m.x, m.y, INFO.items[WORLD.fg[i] || WORLD.bg[i]] ? INFO.items[WORLD.fg[i] || WORLD.bg[i]].color : '#fff', m.fg ? 4 : 12); WORLD.fg[i] = m.fg; WORLD.bg[i] = m.bg; delete cracks[i]; invalidate(m.x, m.y); if (m.tree) WORLD.trees[i] = { at: performance.now(), grow: m.tree.grow }; else if (!(m.fg >= INFO.seedOffset)) delete WORLD.trees[i]; break; }
    case 'leaders': leaders = m; if (curPanel === 'stats') panels.stats(); break;
    case 'tradelog': tradelog = m; if (curPanel === 'stats') panels.stats(); break;
    case 'dailyok': SFX.play('good'); window.FX && FX.confetti(); toast(`🎁 +${m.gems} gems!`); break;
    case 'crack': cracks[m.y * WORLD.w + m.x] = { p: m.p, t: performance.now() }; SFX.play('hit'); break;
    case 'drop': WORLD.drops = WORLD.drops.filter(d => d.id !== m.id); if (m.d) WORLD.drops.push(m.d); break;
    case 'pjoin': if (m.p.name !== ME.username) { const o = others.get(m.p.id); others.set(m.p.id, { ...(o || {}), ...m.p, rx: o ? o.rx : m.p.x, ry: o ? o.ry : m.p.y }); } else ME.equip = m.p.equip; break;
    case 'pleave': others.delete(m.id); break;
    case 'pmove': { const o = others.get(m.id); if (o) { o.x = m.x; o.y = m.y; o.face = m.face; } break; }
    case 'pos': pl.x = m.x; pl.y = m.y; pl.vx = pl.vy = 0; break;
    case 'owner': WORLD.owner = m.owner; WORLD.access = m.access; $('wname').textContent = WORLD.name + (m.owner ? ' 🔒' + m.owner : ''); break;
    case 'chat': say(m.text, m.kind, m.from, m.role); SFX.play(m.kind === 'good' || m.kind === 'broadcast' ? 'good' : 'chat'); if (m.kind === 'broadcast') toast(m.text); break;
    case 'vend': WORLD.vends[m.y * WORLD.w + m.x] = m.v; if (vendOpen && vendOpen.x === m.x && vendOpen.y === m.y) panels.vend(); break;
    case 'tradeinvite': openModal('tradeinvite', m.from); break;
    case 'trade': trade = m; openModal('tradewin'); break;
    case 'tradeend': SFX.play(/complete/.test(m.why) ? 'good' : 'bad'); trade = null; toast(m.why); say(m.why, 'sys'); if (curPanel === 'tradewin') closeModal(); break;
    case 'clinic': clinicState = m.state; if (m.last === false) toast('Wrong tool!'); if (curPanel === 'clinic') panels.clinic(); break;
    case 'friends': FRIENDS = m; friendPing = m.requests.length > 0; updPing(); if (curPanel === 'friends') panels.friends(); break;
    case 'pm': say(m.from ? `(PM) ${m.text}` : `(PM to ${m.to}) ${m.text}`, 'pm', m.from || '', m.role); if (m.from) { lastPm = m.from; SFX.play('chat'); toast('💌 ' + m.from); } break;
    case 'carn': carn = m; if (m.win || m.right || m.cashed) { SFX.play('good'); window.FX && FX.confetti(); } else if (m.win === false || m.right === false) SFX.play('bad'); if (curPanel === 'carnival') panels.carnival(); break;
    case 'prices': MARKET = m.market; if (curPanel === 'prices') panels.prices(); break;
    case 'banlist': BANS = m; if (curPanel === 'bans') panels.bans(); break;
    case 'logs': logs = m.logs; if (curPanel === 'owner') panels.owner(); break;
    case 'run': run = { ...(run || {}), ...m }; if (m.start === 0) { run.t0 = performance.now(); run.cp = -1; run.done = null; }
      if (m.respawn) { run.respawn = m.respawn; toast('Checkpoint ' + (m.cp + 1) + '/' + m.cps); }
      if (m.done) toast('Finished in ' + (m.done / 1000).toFixed(2) + 's!'); $('timer').classList.remove('hidden'); break;
  }
}

// ---------- hotbar & modal panels ----------
function refreshHotbar() {
  const inv = ME.inv; hotbar = hotbar.filter(id => id === 0 || inv[id]);
  for (const id of Object.keys(inv).map(Number)) { if (hotbar.length >= 9) break; if (!hotbar.includes(id) && INFO.items[id >= INFO.seedOffset ? id - INFO.seedOffset : id] && !['tool', 'skin'].includes((INFO.items[id] || {}).kind)) hotbar.push(id); }
  if (!hotbar.includes(sel)) sel = 0;
  const hb = $('hotbar'); hb.innerHTML = '';
  hotbar.forEach((id, k) => {
    const s = document.createElement('div'); s.className = 'slot' + (id === sel ? ' sel' : '');
    if (id === 0) s.textContent = '✊'; else { s.appendChild(icon(id)); const b = document.createElement('b'); b.textContent = inv[id]; s.appendChild(b); }
    s.title = id ? name(id) : 'Fist'; s.onpointerdown = e => { e.stopPropagation(); sel = id; if (id && mode === 'break') setMode('place'); if (!id) setMode('break'); refreshHotbar(); };
    hb.appendChild(s);
  });
}
let carn = null, MARKET = {}, BANS = null, priceFilter = '';
let FRIENDS = { list: [], requests: [] }, lastPm = '';
let curPanel = null, logs = [], spliceA = 0, invPick = 0;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function openModal(p, arg) { SFX.play('open'); curPanel = p; $('modal').classList.remove('hidden'); panels[p](arg); }
function closeModal() { curPanel = null; vendOpen = null; $('modal').classList.add('hidden'); }
$('chatToggle').onclick = () => $('chat').classList.toggle('min');
$('close').onclick = () => { if (curPanel === 'tradewin') send({ t: 'trade_cancel' }); closeModal(); };
document.querySelectorAll('#menu button[data-p]').forEach(b => b.onclick = () => openModal(b.dataset.p));
function rotateHint() { const r = $('rotate'); const want = matchMedia('(pointer:coarse)').matches && innerHeight > innerWidth && !localStorage.bbNoRot; r.classList.toggle('hidden', !want); }
addEventListener('resize', () => { if (WORLD) rotateHint(); });
$('rotX').onclick = () => { localStorage.bbNoRot = 1; rotateHint(); };
$('rotGo').onclick = async () => { try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation.lock('landscape'); } catch { toast('Rotate your phone sideways ↻'); } localStorage.bbNoRot = 1; rotateHint(); };
let friendPing = false, questPing = false; function updPing() { $('bMore').classList.toggle('ping', friendPing || questPing); }
const B = $('mbody');
function itemGrid(filter, onPick, selId) {
  const g = document.createElement('div'); g.className = 'grid';
  Object.entries(ME.inv).filter(([id]) => filter(+id)).forEach(([id, n]) => {
    const s = document.createElement('div'); s.className = 'slot r-' + rarity(+id) + (+id === selId ? ' sel' : ''); s.title = name(+id);
    s.appendChild(icon(+id)); const b = document.createElement('b'); b.textContent = n; s.appendChild(b); s.onclick = () => onPick(+id); g.appendChild(s);
  }); return g;
}
const MORE = [['quests', '📜', 'Quests'], ['trade', '🤝', 'Trade'], ['friends', '👥', 'Friends'], ['stats', '🏆', 'Stats'], ['carnival', '🎪', 'Carnival'], ['clinic', '🩹', 'Surgery'], ['legend', '🌟', 'Mythic Path'], ['inv', '🎒', 'Backpack'], ['shop', '🛒', 'Shop'], ['worlds', '🌍', 'Worlds'], ['settings', '⚙️', 'Settings']];
let statsTab = 'leaders', leaders = null, tradelog = null;
const panels = {
  more() { B.innerHTML = '<h2>Menu</h2>'; const g = document.createElement('div'); g.className = 'moregrid'; MORE.forEach(([p, ic, l]) => { const b = document.createElement('button'); b.innerHTML = `<span>${ic}</span>${l}`; if ((p === 'quests' && questPing) || (p === 'friends' && friendPing)) b.classList.add('ping'); b.onclick = () => openModal(p); g.appendChild(b); }); B.appendChild(g); },
  inv() {
    const id = invPick, it = id && INFO.items[id >= INFO.seedOffset && id < 9000 ? id - INFO.seedOffset : id];
    B.innerHTML = `<h2>Inventory</h2><p>Tap an item for details. Seeds: pick two to splice.</p>`;
    B.appendChild(itemGrid(() => true, x => { invPick = x; panels.inv(); }, id));
    if (id && ME.inv[id]) {
      const d = document.createElement('div'); d.className = 'card r-' + rarity(id);
      const isSeed = id >= INFO.seedOffset;
      d.innerHTML = `<b>${esc(name(id))}</b> · ${rarity(id)} · value ${it ? it.value : 0}💎<br>` + (isSeed ? 'Plant on soil to grow a tree.' : it && it.kind === 'skin' ? 'Cosmetic (' + it.slot + ')' : '');
      const row = document.createElement('div'); row.className = 'row';
      const btn = (t, f, c) => { const b = document.createElement('button'); b.textContent = t; if (c) b.className = c; b.onclick = f; row.appendChild(b); };
      btn('Put in hotbar', () => { hotbar = hotbar.filter(h => h !== id); hotbar.splice(1, 0, id); hotbar = hotbar.slice(0, 9); sel = id; setMode('place'); refreshHotbar(); });
      btn('Drop 1', () => send({ t: 'drop', item: id, n: 1 }), 'red'); btn('Drop all', () => send({ t: 'drop', item: id, n: ME.inv[id] }), 'red');
      if (it && it.kind === 'skin') btn(Object.values(ME.equip || {}).includes(id) ? 'Unequip' : 'Wear', () => send({ t: 'equip', item: id }), 'alt');
      if (id === 27) btn('Open crate', () => send({ t: 'crate' }), 'alt');
      if ([19, 23, 24].includes(id)) { btn('Convert up ×100', () => send({ t: 'convert', item: id, dir: 'up' }), 'alt'); btn('Break down', () => send({ t: 'convert', item: id, dir: 'down' }), 'alt'); }
      if (isSeed) btn(spliceA && spliceA !== id ? 'Splice with ' + name(spliceA) : 'Select for splice', () => { if (spliceA && spliceA !== id) { send({ t: 'splice', a: spliceA, b: id }); spliceA = 0; } else spliceA = id; panels.inv(); }, 'alt');
      d.appendChild(row); B.appendChild(d);
    }
    const rec = document.createElement('details'); rec.innerHTML = '<summary>Known splice recipes (first 14)</summary>' + INFO.recipes.slice(0, 14).map(([a, b, r]) => `${esc(name(a))} + ${esc(name(b))} → ${esc(name(r))}`).join('<br>'); B.appendChild(rec);
  },
  shop() {
    B.innerHTML = `<h2>Gem Shop</h2><p>Only in-game gems. No real money, ever.</p>`;
    for (const [k, p] of Object.entries(INFO.shop)) { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<b>${esc(p.name)}</b> — ${p.price} 💎 `; const b = document.createElement('button'); b.textContent = 'Buy'; b.onclick = () => send({ t: 'buy', pack: k }); d.appendChild(b); B.appendChild(d); }
    B.insertAdjacentHTML('beforeend', '<h3>Mystery Crate drop rates</h3><table>' + INFO.crate.map(r => `<tr><td>${r.chance}</td><td>${r.count}× ${esc(r.item)}</td></tr>`).join('') + '</table>');
  },
  quests() {
    B.innerHTML = `<h2>Daily Quests</h2><p>Reset every day (UTC). Level ${ME.level} · ${ME.xp} XP</p>`;
    if (ME.daily) { const dv = ME.daily, d = document.createElement('div'); d.className = 'card daily';
      d.innerHTML = '<h3>🎁 Daily login reward</h3><div class="streak">' + dv.table.map((g, k) => `<span class="${k < (dv.canClaim ? dv.next - 1 : dv.streak) ? 'got' : ''} ${dv.canClaim && k === dv.next - 1 ? 'today' : ''}">Day ${k + 1}<b>${g}💎</b>${k === 6 ? '<i>+📦</i>' : ''}</span>`).join('') + '</div>';
      const b = document.createElement('button'); b.className = dv.canClaim ? 'gold' : ''; b.disabled = !dv.canClaim; b.textContent = dv.canClaim ? `Claim day ${dv.next}: ${dv.table[dv.next - 1]} gems` : 'Claimed today ✅ come back tomorrow'; b.onclick = () => send({ t: 'daily' }); d.appendChild(b); B.appendChild(d); }
    ME.quests.forEach(q => { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<b>${esc(q.text)}</b> — ${q.p}/${q.goal} · reward ${q.gems}💎 `; if (q.claimed) d.innerHTML += '✅'; else if (q.p >= q.goal) { const b = document.createElement('button'); b.textContent = 'Claim'; b.className = 'alt'; b.onclick = () => send({ t: 'quest', id: q.id }); d.appendChild(b); } B.appendChild(d); });
  },
  stats(tab = statsTab) {
    statsTab = tab; B.innerHTML = '<h2>📊 Brickbloom Stats</h2>'; const row = document.createElement('div'); row.className = 'row tabs';
    [['leaders', '🏆 Leaders'], ['prices', '💰 Prices'], ['trades', '🤝 Trades']].forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.className = k === tab ? 'gold' : ''; b.onclick = () => { if (k === 'leaders') send({ t: 'leaders' }); if (k === 'trades') send({ t: 'tradelog' }); panels.stats(k); }; row.appendChild(b); }); B.appendChild(row);
    if (tab === 'leaders') { if (!leaders) { send({ t: 'leaders' }); B.insertAdjacentHTML('beforeend', '<p>Loading…</p>'); return; }
      const medal = k => ['🥇', '🥈', '🥉'][k] || (k + 1) + '.';
      B.insertAdjacentHTML('beforeend', '<div class="two"><div class="card"><h3>⭐ Top levels</h3>' + leaders.level.map((x, k) => `<div class="lb">${medal(k)} <b>${esc(x.name)}</b><span>Lv ${x.level}</span></div>`).join('') + '</div><div class="card"><h3>💎 Richest players</h3>' + (leaders.rich.map((x, k) => `<div class="lb">${medal(k)} <b>${esc(x.name)}</b><span>${x.gems}💎</span></div>`).join('') || '<p>No players yet</p>') + '<small>Staff are not ranked here.</small></div></div>'); }
    if (tab === 'prices') { B.insertAdjacentHTML('beforeend', '<input id="pq" placeholder="Search items…">'); const g = document.createElement('div'); g.className = 'pricelist'; B.appendChild(g);
      const draw = () => { const q = ($('pq').value || '').toLowerCase(); g.innerHTML = ''; Object.entries(INFO.items).filter(([, it]) => it.kind !== 'gemdrop' && it.name.toLowerCase().includes(q)).sort((a, b) => b[1].value - a[1].value).slice(0, 120).forEach(([id, it]) => { const d = document.createElement('div'); d.className = 'pl r-' + it.rarity; d.appendChild(icon(+id)); d.insertAdjacentHTML('beforeend', `<b>${esc(it.name)}</b><i>${it.rarity}</i><span>${it.value}💎</span>`); g.appendChild(d); }); };
      $('pq').oninput = draw; draw(); }
    if (tab === 'trades') { if (!tradelog) { send({ t: 'tradelog' }); B.insertAdjacentHTML('beforeend', '<p>Loading…</p>'); return; }
      B.insertAdjacentHTML('beforeend', `<p>${tradelog.all ? '👑 Every trade and Barter Box sale in the game (owner view).' : 'Your trades and Barter Box sales.'}</p>`);
      const off = o => (o.items || []).map(([id, n]) => `${n}× ${esc(name(id))}`).concat(o.gems ? [o.gems + '💎'] : []).join(', ') || 'nothing';
      B.insertAdjacentHTML('beforeend', tradelog.list.length ? tradelog.list.map(r => `<div class="card tl"><small>${new Date(r.t).toLocaleString()}</small>` + (r.kind === 'trade' ? `<div>🤝 <b>${esc(r.a)}</b> gave ${off(r.offers.a)}</div><div>↔ <b>${esc(r.b)}</b> gave ${off(r.offers.b)}</div>` : `<div>🏪 <b>${esc(r.buyer)}</b> bought ${r.qty}× ${esc(name(r.item))} from <b>${esc(r.seller)}</b> for ${r.cost}💎 in ${esc(r.w)}</div>`) + '</div>').join('') : '<p>No trades yet.</p>'); }
  },
  worlds() {
    B.innerHTML = `<h2>Travel</h2><input id="wgo" maxlength="16" placeholder="WORLD NAME"><div class="row"><button id="bgo">Go</button><button id="brun" class="alt">🏃 Random RUN</button><button id="bstart">START</button><button id="bfarm" class="gold">🌱 My FARM</button></div>
    <p>Seal a world with a <b>Keystone Seal</b> (shop). Then <code>/access name</code> lets friends build.</p>`;
    $('bgo').onclick = () => { send({ t: 'join', name: $('wgo').value }); closeModal(); };
    const cr = document.createElement('div'); cr.className = 'row'; B.appendChild(cr);
    Object.entries(INFO.courses).forEach(([k, c]) => { const b = document.createElement('button'); b.className = 'alt'; b.textContent = `🏁 ${c.name} (${c.limit / 1000}s, +${c.prize}💎)`; b.onclick = () => { send({ t: 'join', name: k }); closeModal(); }; cr.appendChild(b); });
    $('brun').onclick = () => { send({ t: 'join', name: 'RUN' }); closeModal(); }; $('bstart').onclick = () => { send({ t: 'join', name: 'START' }); closeModal(); }; $('bfarm').onclick = () => { send({ t: 'join', name: ('FARM' + ME.username.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 16) }); closeModal(); };
    if (run && run.board) B.insertAdjacentHTML('beforeend', '<h3>Leaderboard</h3><table>' + run.board.map((e, k) => `<tr><td>${k + 1}</td><td>${esc(e.name)}</td><td>${(e.ms / 1000).toFixed(2)}s</td></tr>`).join('') + '</table><button onclick="">Restart run</button>');
    const rb = B.querySelector('button[onclick]'); if (rb) { rb.removeAttribute('onclick'); rb.onclick = () => { send({ t: 'restart' }); closeModal(); }; }
  },
  trade() {
    B.innerHTML = '<h2>Trade</h2><p>Players in this world:</p>';
    if (!others.size) B.innerHTML += '<p>Nobody else here yet.</p>';
    for (const o of others.values()) { const b = document.createElement('button'); b.textContent = 'Trade with ' + o.name; b.onclick = () => { send({ t: 'trade_req', name: o.name }); closeModal(); }; B.appendChild(b); B.appendChild(document.createTextNode(' ')); }
  },
  tradeinvite(from) { B.innerHTML = `<h2>Trade request</h2><p>${esc(from)} wants to trade.</p>`; const b = document.createElement('button'); b.textContent = 'Accept'; b.className = 'alt'; b.onclick = () => send({ t: 'trade_accept', name: from }); B.appendChild(b); },
  tradewin() {
    if (!trade) return closeModal(); const mine = trade.a === ME.username ? 'a' : 'b', their = mine === 'a' ? 'b' : 'a';
    const offerList = o => o.items.map(([id, n]) => `${n}× ${esc(name(id))}`).join(', ') + (o.gems ? ` + ${o.gems}💎` : '') || '(nothing)';
    B.innerHTML = `<h2>Trading with ${esc(trade[their])}</h2><div class="card"><b>You give:</b> ${offerList(trade.offers[mine])} ${trade.ready[mine] ? '✅' : ''}</div>
      <div class="card"><b>They give:</b> ${offerList(trade.offers[their])} ${trade.ready[their] ? '✅' : ''}</div>
      <p>Tap items to add 1. Gems: <input id="tg" type="number" min="0" style="width:120px" value="${trade.offers[mine].gems}"></p>`;
    const cur = trade.offers[mine];
    B.appendChild(itemGrid(id => true, id => { const items = cur.items.map(a => a.slice()); const e = items.find(a => a[0] === id); if (e) { if (e[1] < ME.inv[id]) e[1]++; } else if (items.length < 8) items.push([id, 1]); send({ t: 'trade_offer', items, gems: +$('tg').value || 0 }); }));
    const row = document.createElement('div'); row.className = 'row';
    const mk = (t, f, c) => { const b = document.createElement('button'); b.textContent = t; b.className = c || ''; b.onclick = f; row.appendChild(b); };
    mk('Set gems', () => send({ t: 'trade_offer', items: cur.items, gems: +$('tg').value || 0 })); mk('Clear', () => send({ t: 'trade_offer', items: [], gems: 0 }), 'red');
    if (trade.stage === 'offer') mk(trade.ready[mine] ? 'Waiting…' : 'Accept offer', () => send({ t: 'trade_ready' }), 'alt');
    else mk(trade.confirm[mine] ? 'Waiting for other…' : '✔ CONFIRM TRADE', () => send({ t: 'trade_confirm' }), 'alt');
    B.appendChild(row); if (trade.stage === 'confirm') B.insertAdjacentHTML('beforeend', '<p><b>Check carefully!</b> Both must confirm. Any change resets.</p>');
  },
  clinic() {
    B.innerHTML = '<h2>🩹 Patch-Up Clinic</h2><p>Each symptom needs exactly one tool. 2 mistakes and the patient leaves. Costs 1 Mender Kit (shop).</p>';
    if (!clinicState) { const b = document.createElement('button'); b.textContent = 'Treat a patient (' + (ME.inv[26] || 0) + ' kits)'; b.className = 'alt'; b.onclick = () => send({ t: 'clinic' }); B.appendChild(b); B.insertAdjacentHTML('beforeend', '<details><summary>Doctor\'s chart</summary>' + Object.entries(INFO.symptoms).map(([s, t]) => `${esc(s)} → ${esc(t)}`).join('<br>') + '</details>'); return; }
    const c = clinicState; B.insertAdjacentHTML('beforeend', `<div class="card"><b>${esc(c.ailment)}</b> · step ${c.step}/${c.of} · mistakes ${c.mistakes}/2<br><span style="font-size:22px">Symptom: <b>${esc(c.symptom)}</b></span></div>`);
    const row = document.createElement('div'); row.className = 'row';
    c.tools.forEach(t => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => send({ t: 'clinic', tool: t }); row.appendChild(b); }); B.appendChild(row);
  },
  prices() {
    B.innerHTML = `<h2>💲 Price editor</h2><p>Base value vs. market price (owner only). Changes save instantly and show in item details.</p><input id="pf" placeholder="search items…" value="${esc(priceFilter)}">`;
    const tb = document.createElement('table'); tb.innerHTML = '<tr><th></th><th>#</th><th>Item</th><th>Rarity</th><th>Base</th><th>Market</th><th></th></tr>';
    Object.entries(INFO.items).filter(([id, it]) => !priceFilter || it.name.toLowerCase().includes(priceFilter.toLowerCase()) || it.rarity === priceFilter).slice(0, 80).forEach(([id, it]) => {
      const tr = document.createElement('tr'); const base = it.base ?? it.value; it.base = base;
      tr.innerHTML = `<td></td><td>${id}</td><td>${esc(it.name)}</td><td class="tag-${it.rarity === 'legendary' ? 'owner' : ''}">${it.rarity}</td><td>${base}</td><td><input type="number" min="0" style="width:90px;padding:4px;margin:0" value="${MARKET[id] ?? base}"></td><td></td>`;
      tr.cells[0].appendChild(icon(+id, 20));
      const b = document.createElement('button'); b.textContent = 'Save'; b.style.padding = '4px 8px'; b.onclick = () => { const v = +tr.querySelector('input').value; send({ t: 'setprice', id: +id, price: v }); it.value = v; }; tr.cells[6].appendChild(b);
      tb.appendChild(tr);
    });
    B.appendChild(tb); const pf = $('pf'); pf.oninput = () => { priceFilter = pf.value; panels.prices(); const n = $('pf'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  },
  bans() {
    B.innerHTML = '<h2>🚫 Bans, mutes & staff</h2>'; if (!BANS) return B.insertAdjacentHTML('beforeend', '<p>Loading…</p>');
    B.insertAdjacentHTML('beforeend', `<p>${BANS.players} accounts · ${BANS.online} online</p>`);
    const tb = document.createElement('table'); tb.innerHTML = '<tr><th>Player</th><th>Role</th><th>Status</th><th></th></tr>';
    if (!BANS.list.length) B.insertAdjacentHTML('beforeend', '<p>Nobody is banned or muted. 🎉</p>');
    BANS.list.forEach(x => {
      const tr = document.createElement('tr'), st = [x.banned ? '⛔ banned' : '', x.until ? '⏳ until ' + new Date(x.until).toLocaleString() : '', x.muted ? '🔇 muted until ' + new Date(x.muted).toLocaleTimeString() : '', x.online ? '🟢' : ''].filter(Boolean).join(' · ');
      tr.innerHTML = `<td>${esc(x.name)}</td><td class="tag-${x.role}">${x.role}</td><td>${st || '-'}</td><td></td>`;
      const mk = (t, c) => { const b = document.createElement('button'); b.textContent = t; b.style.padding = '4px 8px'; b.onclick = () => { send({ t: 'admin', cmd: c, args: [x.name] }); setTimeout(() => send({ t: 'banlist' }), 300); }; tr.cells[3].appendChild(b); };
      if (x.banned || x.until) mk('Unban', 'unban'); if (x.muted) mk('Unmute', 'unmute'); if (ME.role === 'owner' && x.role !== 'owner' && x.role !== 'user') { const b = document.createElement('button'); b.textContent = 'Demote'; b.className = 'red'; b.style.padding = '4px 8px'; b.onclick = () => { send({ t: 'admin', cmd: 'setrole', args: [x.name, 'user'] }); setTimeout(() => send({ t: 'banlist' }), 300); }; tr.cells[3].appendChild(b); }
      tb.appendChild(tr);
    }); B.appendChild(tb);
  },
  friends() {
    B.innerHTML = '<h2>👥 Friends</h2><div class="row"><input id="fn" maxlength="16" placeholder="player name" style="flex:1"><button id="fadd" class="alt">Add friend</button></div>';
    $('fadd').onclick = () => send({ t: 'friend', op: 'add', name: $('fn').value.trim() });
    const mk = (row, t, f, c) => { const b = document.createElement('button'); b.textContent = t; b.className = c || ''; b.onclick = f; row.appendChild(b); };
    if (FRIENDS.requests.length) { B.insertAdjacentHTML('beforeend', '<h3>Requests</h3>'); FRIENDS.requests.forEach(n => { const d = document.createElement('div'); d.className = 'card row'; d.insertAdjacentHTML('beforeend', `<b style="flex:1">${esc(n)}</b>`); mk(d, 'Accept', () => send({ t: 'friend', op: 'accept', name: n }), 'alt'); mk(d, 'Decline', () => send({ t: 'friend', op: 'decline', name: n }), 'red'); B.appendChild(d); }); }
    B.insertAdjacentHTML('beforeend', `<h3>Friends (${FRIENDS.list.length})</h3>`);
    FRIENDS.list.sort((a, b) => b.online - a.online).forEach(f => {
      const d = document.createElement('div'); d.className = 'card row'; d.insertAdjacentHTML('beforeend', `<span style="flex:1">${f.online ? '🟢' : '⚫'} <b>${esc(f.name)}</b> ${f.world ? 'in ' + esc(f.world) : ''}</span>`);
      if (f.online) { mk(d, '💌 Message', () => { closeModal(); $('say').value = '/msg ' + f.name + ' '; $('say').focus(); }); if (f.world) mk(d, 'Join', () => { send({ t: 'join', name: f.world }); closeModal(); }, 'alt'); }
      mk(d, '✕', () => send({ t: 'friend', op: 'remove', name: f.name }), 'red'); B.appendChild(d);
    });
    if (lastPm) { const r = document.createElement('div'); r.className = 'row'; mk(r, 'Reply to ' + lastPm, () => { closeModal(); $('say').value = '/msg ' + lastPm + ' '; $('say').focus(); }, 'alt'); B.appendChild(r); }
  },
  settings() {
    B.innerHTML = '<h2>⚙ Settings</h2>'; const row = document.createElement('div'); row.className = 'row';
    const mk = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { f(); panels.settings(); }; row.appendChild(b); };
    mk('Music: ' + (SFX.musicOn ? 'ON 🎵' : 'OFF'), () => SFX.toggleMusic()); mk('Sounds: ' + (SFX.sfxOn ? 'ON 🔊' : 'OFF'), () => SFX.toggleSfx());
    mk('Log out', () => { localStorage.removeItem('bbTok'); location.reload(); }); B.appendChild(row);
    B.insertAdjacentHTML('beforeend', '<p>Tip: on your phone, use the browser menu → <b>Add to Home screen</b> to install Brickbloom like an app.</p>');
  },
  legend() {
    const L = ME.legend; B.innerHTML = `<h2>🌟 Mythic Path</h2><p>The only way to earn a legendary item for sure. Needs level <b>${L.need}</b> (you: ${L.level}). Completed ${L.done}×.</p>`;
    L.stages.forEach((st, k) => B.insertAdjacentHTML('beforeend', `<div class="card ${k < L.stage || (L.stage < 0 && L.done) ? 'r-uncommon' : k === L.stage ? 'r-legendary' : ''}">${k + 1}. ${esc(st.text)} ${k === L.stage ? `— ${L.p}/${st.goal}` : k < L.stage ? '✅' : ''}</div>`));
    const btn = (t, f, c) => { const b = document.createElement('button'); b.textContent = t; b.className = c || 'alt'; b.onclick = f; B.appendChild(b); };
    if (L.stage < 0) btn(L.level >= L.need ? 'Begin the Mythic Path' : `Reach level ${L.need} first`, () => send({ t: 'legend', op: 'start' }));
    else if (L.stage === 4 && !L.quiz) btn(L.cooldown ? `Quiz cooldown ${Math.ceil(L.cooldown / 60000)} min` : 'Take the quiz', () => send({ t: 'legend', op: 'quiz' }));
    if (L.quiz) {
      L.quiz.forEach((q, i) => B.insertAdjacentHTML('beforeend', `<div class="card"><b>${i + 1}. ${esc(q.q)}</b><br>${q.a.map((a, j) => `<label style="display:block;padding:4px"><input type="radio" name="q${i}" value="${j}" style="width:auto"> ${esc(a)}</label>`).join('')}</div>`));
      btn('Submit answers', () => send({ t: 'legend', op: 'answer', answers: L.quiz.map((_, i) => +((B.querySelector(`input[name=q${i}]:checked`) || {}).value ?? -1)) }));
    }
  },
  carnival() {
    B.innerHTML = `<h2>🎪 Lantern Carnival</h2><p>Open Fri & Sat 18:00–20:00 UTC (or when the owner starts it). Spin costs ${INFO.wheelCost}💎.</p>`;
    const row = document.createElement('div'); row.className = 'row'; B.appendChild(row);
    const mk = (t, f, c) => { const b = document.createElement('button'); b.textContent = t; b.className = c || 'alt'; b.onclick = f; row.appendChild(b); return b; };
    mk('🎡 Spin the Lantern Wheel', () => send({ t: 'spin' }));
    B.insertAdjacentHTML('beforeend', `<h3>🏮 Lantern Shuffle (${INFO.shuffleCost}💎)</h3><p>One lantern hides a star. Find it: +40💎 and a 3% rare item.</p>`);
    const r2 = document.createElement('div'); r2.className = 'row'; B.appendChild(r2);
    [0, 1, 2].forEach(k => { const b = document.createElement('button'); b.textContent = '🏮' + (carn && carn.game === 'shuffle' && carn.star === k ? '⭐' : ''); b.style.fontSize = '30px'; b.onclick = () => send({ t: 'shuffle', pick: k }); r2.appendChild(b); });
    B.insertAdjacentHTML('beforeend', `<h3>🃏 Higher or Lower (${INFO.hlCost}💎)</h3><p>Guess the next card (1-13). Each right guess doubles the pot. 5 in a row = 320💎 + 10% legendary roll.</p>`);
    const r3 = document.createElement('div'); r3.className = 'row'; B.appendChild(r3);
    const hl = ME.hl; const mk3 = (t, f, c) => { const b = document.createElement('button'); b.textContent = t; b.className = c || ''; b.onclick = f; r3.appendChild(b); };
    if (!hl) mk3('Deal a card', () => send({ t: 'hl', dir: 'start' }), 'alt');
    else { r3.insertAdjacentHTML('beforeend', `<div class="card" style="font-size:28px;padding:6px 16px">${hl.card}</div><span>streak ${hl.streak} · pot ${hl.streak ? INFO.hlCost * 2 ** hl.streak : 0}💎</span>`); mk3('⬆ Higher', () => send({ t: 'hl', dir: 'hi' })); mk3('⬇ Lower', () => send({ t: 'hl', dir: 'lo' })); mk3('💰 Cash out', () => send({ t: 'hl', dir: 'cash' }), 'alt'); }
    B.insertAdjacentHTML('beforeend', '<h3>Prize rates</h3><table>' + INFO.wheel.map(r => `<tr><td>${r.chance}</td><td>${esc(r.prize)}</td></tr>`).join('') + '</table>');
  },
  vend() {
    const v = WORLD.vends[vendOpen.y * WORLD.w + vendOpen.x]; if (!v) return closeModal();
    const mine = v.owner === ME.username;
    B.innerHTML = `<h2>Barter Box</h2><p>Owner: ${esc(v.owner)}</p><div class="card">${v.stock ? `${v.stock}× <b>${esc(name(v.item))}</b> at ${v.price}💎 each` : 'Empty'}</div>`;
    if (mine) {
      B.insertAdjacentHTML('beforeend', `<p>Earnings: ${v.earnings}💎</p><p>Pick an item, amount and price:</p>`);
      let pick = v.item || 0; B.appendChild(itemGrid(() => true, id => { pick = id; toast(name(id)); }));
      B.insertAdjacentHTML('beforeend', '<input id="vn" type="number" placeholder="amount" min="1"><input id="vp" type="number" placeholder="price each (gems)" min="1">');
      const row = document.createElement('div'); row.className = 'row';
      const s = document.createElement('button'); s.textContent = 'Stock'; s.className = 'alt'; s.onclick = () => send({ t: 'vend_stock', x: vendOpen.x, y: vendOpen.y, item: pick, n: +$('vn').value, price: +$('vp').value });
      const c = document.createElement('button'); c.textContent = 'Collect gems'; c.onclick = () => send({ t: 'vend_collect', x: vendOpen.x, y: vendOpen.y }); row.append(s, c); B.appendChild(row);
    } else if (v.stock) {
      B.insertAdjacentHTML('beforeend', '<input id="vq" type="number" value="1" min="1">');
      const b = document.createElement('button'); b.textContent = 'Buy'; b.className = 'alt'; b.onclick = () => send({ t: 'vend_buy', x: vendOpen.x, y: vendOpen.y, n: +$('vq').value, price: v.price }); B.appendChild(b);
    }
  },
  owner() {
    const r = ME.role, isO = r === 'owner';
    B.innerHTML = `<h2>${isO ? '👑 Owner' : '🛡 Staff'} Panel</h2><p>Role: <b class="tag-${r}">${r}</b></p>
      <input id="ot" placeholder="player name" maxlength="16"><input id="oa" placeholder="minutes / item id / role / message" maxlength="200"><input id="on" placeholder="count" type="number">`;
    const row = document.createElement('div'); row.className = 'row'; B.appendChild(row);
    const cmd = (label, c, need, argsF) => { if (!need.includes(r)) return; const b = document.createElement('button'); b.textContent = label; b.onclick = () => send({ t: 'admin', cmd: c, args: argsF() }); row.appendChild(b); };
    const T_ = () => $('ot').value.trim(), A_ = () => $('oa').value.trim(), N_ = () => $('on').value;
    const S = ['mod', 'admin', 'owner'], AD = ['admin', 'owner'], O = ['owner'];
    { const b = document.createElement('button'); b.textContent = '🚫 Ban & staff list'; b.className = 'alt'; b.onclick = () => { send({ t: 'banlist' }); openModal('bans'); }; row.appendChild(b); }
    cmd('Kick', 'kick', S, () => [T_()]); cmd('Mute', 'mute', S, () => [T_(), A_() || '10']); cmd('Unmute', 'unmute', S, () => [T_()]);
    cmd('Temp ban', 'tempban', S, () => [T_(), A_() || '60']); cmd('Go to', 'tp', S, () => [T_()]); cmd('Summon', 'summon', S, () => [T_()]);
    cmd('Unban', 'unban', AD, () => [T_()]); cmd('Broadcast', 'broadcast', AD, () => A_().split(' ')); cmd('Lock this world', 'lockworld', AD, () => [WORLD.name]); cmd('Unlock world', 'unlockworld', AD, () => [WORLD.name]);
    cmd('Perma ban', 'ban', O, () => [T_()]); cmd('Give item', 'give', O, () => [T_(), A_(), N_() || '1']); cmd('Give gems', 'gems', O, () => [T_(), N_() || A_()]);
    cmd('Set role', 'setrole', O, () => [T_(), A_()]);
    if (isO) {
      const sp = document.createElement('details'); sp.innerHTML = '<summary>Item spawner (tap to fill the item id)</summary>'; const g = document.createElement('div'); g.className = 'grid';
      Object.keys(INFO.items).forEach(id => { const s = document.createElement('div'); s.className = 'slot r-' + INFO.items[id].rarity; s.title = id + ' ' + INFO.items[id].name; s.appendChild(icon(+id)); s.onclick = () => { $('oa').value = id; toast(INFO.items[id].name + ' (#' + id + ')'); if (!$('ot').value) $('ot').value = ME.username; }; g.appendChild(s); });
      sp.appendChild(g); B.appendChild(sp);
      const r2 = document.createElement('div'); r2.className = 'row';
      const mk = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; r2.appendChild(b); };
      mk('🎪 Start carnival', () => send({ t: 'carnival', on: true })); mk('Stop carnival', () => send({ t: 'carnival', on: false })); mk('Carnival: schedule', () => send({ t: 'carnival', on: null }));
      mk('💲 Price editor', () => { send({ t: 'prices' }); openModal('prices'); }); mk('🤝 All trades', () => { tradelog = null; send({ t: 'tradelog' }); openModal('stats', 'trades'); }); mk('📒 Economy logs', () => send({ t: 'logs', filter: T_() }));
      B.appendChild(r2);
      if (logs.length) B.insertAdjacentHTML('beforeend', '<table>' + logs.slice().reverse().map(l => `<tr><td>${new Date(l.t).toLocaleTimeString()}</td><td>${esc(l.type)}</td><td>${esc(JSON.stringify(Object.fromEntries(Object.entries(l).filter(([k]) => !['t', 'type'].includes(k)))).slice(0, 120))}</td></tr>`).join('') + '</table>');
    }
  },
};

// ---------- input (Growtopia-style: tap a tile to punch / place, hold to repeat) ----------
function setMode() {} // legacy no-op: the selected hotbar item decides what a tap does
const hold = (id, k) => { const el = $(id); if (!el) return; el.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); touch[k] = true; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch {} if (navigator.vibrate) navigator.vibrate(6); };
  el.onpointerup = el.onpointercancel = el.onlostpointercapture = () => { touch[k] = false; el.classList.remove('on'); }; el.oncontextmenu = e => e.preventDefault(); };
addEventListener('blur', () => { touch.l = touch.r = touch.j = false; for (const k in keys) keys[k] = false; });
hold('tL', 'l'); hold('tR', 'r'); hold('tJ', 'j');
// slide between ◀ and ▶ without lifting the thumb (joystick-pad feel)
{ const pad = $('dpad'); if (pad) { const upd = e => { const r = pad.getBoundingClientRect(); const fx = (e.clientX - r.left) / r.width; touch.l = fx < 0.5; touch.r = fx >= 0.5; $('tL').classList.toggle('on', touch.l); $('tR').classList.toggle('on', touch.r); };
  pad.onpointerdown = e => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch {} upd(e); }; pad.onpointermove = e => { if (pad.hasPointerCapture && pad.hasPointerCapture(e.pointerId)) upd(e); };
  pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = () => { touch.l = touch.r = false; $('tL').classList.remove('on'); $('tR').classList.remove('on'); }; } }
addEventListener('keydown', e => { if (document.activeElement.tagName === 'INPUT') { if (e.key === 'Enter' && document.activeElement.id === 'say') { send({ t: 'chat', text: $('say').value }); $('say').value = ''; $('say').blur(); $('chat').classList.add('min'); } return; }
  keys[e.code] = true; if (e.key === 'Enter' || e.key === 't') { e.preventDefault(); $('chat').classList.remove('min'); $('say').focus(); }
  if (e.key === 'e' || e.key === 'i') curPanel ? closeModal() : openModal('inv'); if (e.key === 'Escape') closeModal();
  if (/^[1-9]$/.test(e.key) && hotbar[+e.key - 1] !== undefined) { sel = hotbar[+e.key - 1]; refreshHotbar(); } });
addEventListener('keyup', e => keys[e.code] = false);
['gesturestart', 'gesturechange', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (!e.target.closest('#modal,#log,.scroll')) e.preventDefault(); }, { passive: false });
let pointer = null;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { if (!WORLD) return; $('say').blur(); if (pointer && pointer.id !== e.pointerId && e.pointerType === 'touch') return; pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, btn: e.button, next: 0, first: true }; });
cv.addEventListener('pointermove', e => { if (pointer && pointer.id === e.pointerId) { pointer.x = e.clientX; pointer.y = e.clientY; } });
const release = e => { if (pointer && pointer.id === e.pointerId) pointer = null; };
addEventListener('pointerup', release); addEventListener('pointercancel', release);
function tileAt(sx, sy) { return { x: Math.floor((sx + cam.x) / TS), y: Math.floor((sy + cam.y) / TS) }; }
const REACH = 4; // tiles, same as the server
const inReachC = (x, y) => Math.abs(x - Math.floor(pl.x + 0.35)) <= REACH && Math.abs(y - Math.floor(pl.y + 0.45)) <= REACH;
let lastFar = 0;
function act(now) {
  if (!pointer || now < pointer.next) return;
  const { x, y } = tileAt(pointer.x, pointer.y); if (x < 0 || y < 0 || x >= WORLD.w || y >= WORLD.h) return;
  const i = y * WORLD.w + x, first = pointer.first; pointer.first = false;
  if (!inReachC(x, y)) { pointer.next = now + 250; if (first && now - lastFar > 800) { lastFar = now; toast('Too far away'); } return; }
  if (WORLD.vends[i] && (sel === 0 || first)) { if (first) { vendOpen = { x, y }; openModal('vend'); } pointer = null; return; }
  const filled = WORLD.fg[i] || WORLD.bg[i];
  const placeIt = sel && pointer.btn !== 1 && (!WORLD.fg[i] || pointer.btn === 2) && (ME.inv[sel] || 0) > 0;
  if (placeIt) { if (!WORLD.fg[i]) { send({ t: 'place', x, y, item: sel }); pl.punchAt = now; } pointer.next = now + 140; }
  else if (filled) { send({ t: 'hit', x, y }); pl.punchAt = now; pl.face = x + 0.5 < pl.x + 0.35 ? -1 : 1; pointer.next = now + 230; }
  else pointer.next = now + 120;
}

// ---------- physics: fixed 120 Hz step, Growtopia-like feel ----------
const solid = (x, y) => { if (x < 0 || x >= WORLD.w || y >= WORLD.h) return true; if (y < 0) return false; const i = y * WORLD.w + x, id = WORLD.fg[i]; const it = INFO.items[id]; return !!it && it.kind === 'fg' && !WORLD.trees[i]; };
const PW = 0.7, PH = 0.9;
function collide(nx, ny) { for (const cx of [nx + 0.05, nx + PW - 0.05]) for (const cy of [ny + 0.05, ny + PH / 2, ny + PH - 0.05]) if (solid(Math.floor(cx), Math.floor(cy))) return true; return false; }
const PHY = { run: 5.6, accG: 46, accA: 30, fric: 34, grav: 52, jump: 15.2, cut: 0.45, maxFall: 17, coyote: 0.09, buffer: 0.12 };
let lastSent = 0, lastSentX = 0, lastSentY = 0, acc = 0, jumpHeld = false, coyote = 0, jbuf = 0;
function step(dt) {
  const L = keys.KeyA || keys.ArrowLeft || touch.l, R = keys.KeyD || keys.ArrowRight || touch.r, J = keys.KeyW || keys.ArrowUp || keys.Space || touch.j;
  const dir = (R ? 1 : 0) - (L ? 1 : 0);
  if (dir) { const a = pl.ground ? PHY.accG : PHY.accA; pl.vx += dir * a * dt; if (Math.abs(pl.vx) > PHY.run) pl.vx = Math.sign(pl.vx) * PHY.run; pl.face = dir; }
  else { const f = (pl.ground ? PHY.fric : PHY.fric * 0.35) * dt; pl.vx = Math.abs(pl.vx) <= f ? 0 : pl.vx - Math.sign(pl.vx) * f; }
  coyote = pl.ground ? PHY.coyote : Math.max(0, coyote - dt);
  if (J && !jumpHeld) jbuf = PHY.buffer; else jbuf = Math.max(0, jbuf - dt);
  if (jbuf > 0 && coyote > 0) { pl.vy = -PHY.jump; pl.ground = false; coyote = 0; jbuf = 0; SFX.play('jump'); }
  if (!J && jumpHeld && pl.vy < -4) pl.vy *= PHY.cut; // short hop when released early
  jumpHeld = J;
  pl.vy = Math.min(PHY.maxFall, pl.vy + PHY.grav * dt);
  const nx = pl.x + pl.vx * dt; if (!collide(nx, pl.y)) pl.x = nx; else { pl.x = pl.vx > 0 ? Math.floor(nx + PW) - PW - 0.001 : Math.floor(nx) + 1 + 0.001; if (collide(pl.x, pl.y)) pl.x -= pl.vx * dt; pl.vx = 0; }
  const ny = pl.y + pl.vy * dt, wasAir = !pl.ground; pl.ground = false;
  if (!collide(pl.x, ny)) pl.y = ny; else {
    if (pl.vy > 0) { if (wasAir && pl.vy > 12) for (let k = 0; k < 5; k++) FX.dust(); pl.ground = true; const fy = Math.floor(ny + PH); const below = INFO.items[WORLD.fg[fy * WORLD.w + Math.floor(pl.x + 0.35)]]; pl.y = fy - PH - 0.001; if (below && below.name === 'Bounce Pad') { pl.vy = -24; pl.ground = false; } else pl.vy = 0; }
    else { pl.y = Math.floor(ny) + 1 + 0.001; pl.vy = 0; }
  }
  if (pl.ground && Math.abs(pl.vx) > 4 && Math.random() < 0.04) FX.dust();
  const ci = Math.floor(pl.y + 0.5) * WORLD.w + Math.floor(pl.x + 0.35), feet = Math.floor(pl.y + PH + 0.05) * WORLD.w + Math.floor(pl.x + 0.35);
  if (WORLD.fg[ci] === 3 || WORLD.fg[feet] === 3) { const r = run && run.respawn || WORLD.spawn; pl.x = r.x; pl.y = r.y; pl.vx = pl.vy = 0; toast('Ouch! Magma'); SFX.play('splash'); }
}
function physics(dt) {
  acc = Math.min(0.25, acc + dt); while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
  // network: only send when we actually moved, ~10 per second max (+ a keep-alive every 2 s)
  const t = performance.now(), moved = Math.abs(pl.x - lastSentX) > 0.02 || Math.abs(pl.y - lastSentY) > 0.02;
  if ((moved && t - lastSent > 95) || t - lastSent > 2000) { lastSent = t; lastSentX = pl.x; lastSentY = pl.y; send({ t: 'move', x: +pl.x.toFixed(3), y: +pl.y.toFixed(3), face: pl.face }); }
}

// ---------- particles & effects ----------
const parts = [];
window.FX = {
  burst(x, y, color, n = 10) { for (let k = 0; k < n; k++) parts.push({ x: x + 0.2 + Math.random() * 0.6, y: y + 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 7 - 2, life: 0.55 + Math.random() * 0.45, c: Math.random() < 0.3 ? ART.sh(color, 0.3) : Math.random() < 0.5 ? ART.sh(color, -0.25) : color, s: 3 + (Math.random() * 3 | 0), g: 22 }); for (let k = 0; k < 3; k++) parts.push({ x: x + Math.random(), y: y + Math.random(), vx: 0, vy: -1, life: 0.4, c: '#fff', s: 5, g: 0, spark: 1 }); },
  confetti() { for (let k = 0; k < 60; k++) parts.push({ x: pl.x + 0.35, y: pl.y, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, life: 1.4, c: `hsl(${Math.random() * 360},90%,60%)`, s: 3, g: 14 }); },
  levelUp() { FX.confetti(); ring = { t: 0 }; },
  dust() { parts.push({ x: pl.x + 0.35, y: pl.y + PH, vx: -pl.vx * 0.1 + (Math.random() - 0.5), vy: -Math.random(), life: 0.35, c: '#ffffffaa', s: 2, g: 0 }); },
};
let ring = null;
function drawParts(dt) {
  const k = TX; // one "texel" in css px
  for (let n = parts.length - 1; n >= 0; n--) { const p = parts[n]; p.life -= dt; if (p.life <= 0) { parts.splice(n, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const X = snap(p.x * TS - cam.x), Y = snap(p.y * TS - cam.y); if (p.spark) { ART.sparkle(ctx, X, Y, p.s * Math.min(1, p.life * 2), Math.min(1, p.life * 2)); continue; }
    const S = p.s * k * 1.5; ctx.globalAlpha = Math.min(1, p.life * 2); if (p.s > 2) { ctx.fillStyle = '#2a1d3d'; ctx.fillRect(X - S / 2 - k, Y - S / 2 - k, S + 2 * k, S + 2 * k); } ctx.fillStyle = p.c; ctx.fillRect(X - S / 2, Y - S / 2, S, S); }
  ctx.globalAlpha = 1; if (parts.length > 400) parts.splice(0, parts.length - 400);
  if (ring) { ring.t += dt; const r = ring.t * TS * 6; ctx.strokeStyle = `rgba(255,212,59,${Math.max(0, 1 - ring.t)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc((pl.x + 0.35) * TS - cam.x, (pl.y + 0.45) * TS - cam.y, r, 0, 7); ctx.stroke(); if (ring.t > 1) ring = null; }
}
function daylight(t) { if (window.__forceDl !== undefined) return window.__forceDl; const ph = (Date.now() / 60000 / 24) % 1; return Math.max(0, Math.min(1, 0.5 + Math.cos(ph * Math.PI * 2) * 0.9)); }
// night overlay rendered at 1/4 resolution then smoothly scaled (cheap on phones)
const night = document.createElement('canvas'), nctx = night.getContext('2d');
function drawNight(lightLevel, lights) {
  const dark = (1 - lightLevel) * 0.48; if (dark < 0.03) return; const q = 4;
  const w = Math.ceil(innerWidth / q), h = Math.ceil(innerHeight / q); if (night.width !== w || night.height !== h) { night.width = w; night.height = h; }
  nctx.globalCompositeOperation = 'source-over'; nctx.clearRect(0, 0, w, h); nctx.fillStyle = `rgba(8,6,32,${dark})`; nctx.fillRect(0, 0, w, h);
  nctx.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) { const X = x / q, Y = y / q, R = r / q; if (X < -R || Y < -R || X > w + R || Y > h + R) continue; const g = nctx.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); nctx.fillStyle = g; nctx.fillRect(X - R, Y - R, 2 * R, 2 * R); }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(night, 0, 0, w * q, h * q); ctx.imageSmoothingEnabled = false;
}

// ---------- rendering: integer pixel scaling + chunk cache ----------
let DPR = 1, K = 1, TX = 1; // K = device pixels per texel (integer), TX = css px per texel
const snap = v => Math.round(v * DPR) / DPR;
function resize() {
  DPR = Math.min(3, devicePixelRatio || 1); cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const short = Math.min(innerWidth, innerHeight), wantCss = short < 500 ? 46 : 44; // ~11 tiles across the short side, like Growtopia
  K = Math.max(1, Math.round(wantCss * DPR / 32)); TS = 32 * K / DPR; TX = K / DPR; ctx.imageSmoothingEnabled = false; chunks.clear();
}
const CH = 8, chunks = new Map();
const chunkKey = (cx, cy) => cx + ',' + cy;
function invalidate(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) chunks.delete(chunkKey(Math.floor((x + dx) / CH), Math.floor((y + dy) / CH))); }
const airAt = (xx, yy) => { if (xx < 0 || xx >= WORLD.w || yy < 0 || yy >= WORLD.h) return false; const id = WORLD.fg[yy * WORLD.w + xx], n = INFO.items[id]; return !n || n.kind !== 'fg' || id === 9 || !!WORLD.trees[yy * WORLD.w + xx]; };
function buildChunk(cx, cy) {
  const P = 32 * K, c = document.createElement('canvas'); c.width = c.height = CH * P; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const x = cx * CH + tx, y = cy * CH + ty; if (x >= WORLD.w || y >= WORLD.h) continue; const i = y * WORLD.w + x, b = WORLD.bg[i], f = WORLD.fg[i], X = tx * P, Y = ty * P;
    if (b) g.drawImage(T(b), X, Y, P, P);
    if (f && !WORLD.trees[i]) { g.drawImage(ART.SEAMLESS.has(f) ? TV(f, (x * 7 + y * 13 + (x * y) % 5) % 4) : T(f), X, Y, P, P);
      const it = INFO.items[f];
      if (it && it.kind === 'fg' && f !== 9) { const up = airAt(x, y - 1);
        if (ART.SEAMLESS.has(f)) { const e = 2 * K; g.fillStyle = '#2a1d3d'; if (up) g.fillRect(X, Y, P, e); if (airAt(x, y + 1)) g.fillRect(X, Y + P - e, P, e); if (airAt(x - 1, y)) g.fillRect(X, Y, e, P); if (airAt(x + 1, y)) g.fillRect(X + P - e, Y, e, P); }
        if (f === 1 && up && y > 0) g.drawImage(GRASS(), X, Y - 2 * K, P, 14 * K); } }
  }
  return c;
}
let grassPx = null; const GRASS = () => grassPx || (grassPx = ART.pixelize((() => { const c = document.createElement('canvas'); c.width = 32; c.height = 14; c.getContext('2d').drawImage(ART.grassCap, 0, 0); return c; })(), false));
function getChunk(cx, cy) { const k = chunkKey(cx, cy); let c = chunks.get(k); if (c) { chunks.delete(k); chunks.set(k, c); return c; } c = buildChunk(cx, cy); chunks.set(k, c); while (chunks.size > 28) chunks.delete(chunks.keys().next().value); return c; }
const roleColor = r => ({ owner: '#ffd43b', admin: '#ff8787', mod: '#74c0fc' })[r] || '#fff';
function poseFor(moving, air, vy, punch, t, idOff) {
  if (punch > 0) return 'punch:' + (punch > 0.5 ? 0 : 1);
  if (air) return vy < 0 ? 'jump:0' : 'fall:0';
  if (moving) return 'walk:' + (Math.floor(t / 110) % 4);
  const ph = (t + idOff * 977) % 4000; return 'idle:' + (ph < 130 ? 2 : (Math.floor(t / 600) % 2));
}
function drawPlayer(x, y, nm, role, face, eq, lv, t, moving, air, vy, punch) {
  const px = x * TS - cam.x, py = y * TS - cam.y, w = PW * TS, h = PH * TS;
  const fx = snap(px + w / 2), fy = snap(py + h);
  if (eq && eq.aura) { const ac = INFO.items[eq.aura].color; ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t / 300); ctx.fillStyle = ac; ctx.beginPath(); ctx.ellipse(fx, fy - h * 0.9, w * 1.1, h * 1.1, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    for (let k = 0; k < 4; k++) { const a = t / 400 + k * 1.57; ART.sparkle(ctx, fx + Math.cos(a) * w * 0.9, fy - h * 0.9 + Math.sin(a) * h * 0.8, 3, 0.8); } }
  if (!air) { ctx.fillStyle = '#0000002e'; ctx.fillRect(snap(fx - w * 0.45), fy - TX, snap(w * 0.9), 2 * TX); }
  const spr = ART.playerSprite(nm, eq, poseFor(moving, air, vy, punch, t, nm.length), INFO), sw = 40 * TX, sh = 72 * TX;
  ctx.save(); ctx.translate(fx, 0); if (face < 0) ctx.scale(-1, 1); ctx.drawImage(spr, -20 * TX, fy - 70 * TX, sw, sh); ctx.restore();
  const label = (role === 'owner' ? '👑 ' : role === 'admin' ? '🛡 ' : role === 'mod' ? '🔧 ' : '') + nm;
  ctx.font = '600 13px Fredoka, system-ui'; ctx.textAlign = 'center'; const tw = ctx.measureText(label).width + 28, lx = snap(fx - tw / 2), ly = snap(fy - 70 * TX - 6);
  ctx.fillStyle = '#2a1d3dd9'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, tw, 19, 9.5) : ctx.rect(lx, ly, tw, 19); ctx.fill();
  ctx.fillStyle = '#7c5cff'; ctx.beginPath(); ctx.arc(lx + tw - 10, ly + 9.5, 7.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 10px Fredoka, system-ui'; ctx.fillText(lv || 1, lx + tw - 10, ly + 13);
  ctx.font = '600 13px Fredoka, system-ui'; ctx.fillStyle = roleColor(role); ctx.fillText(label, lx + (tw - 14) / 2, ly + 14);
}
// pixel sky: drawn at texel resolution into a small buffer, scaled up crisply
const skyC = document.createElement('canvas'), skyX = skyC.getContext('2d');
function drawSky(t, dl, parkour, c) {
  const w = Math.ceil(cv.width / K), h = Math.ceil(cv.height / K); if (skyC.width !== w || skyC.height !== h) { skyC.width = w; skyC.height = h; }
  const sc = K / DPR; ART.sky(skyX, w, h, { x: c.x / sc, y: c.y / sc }, t, dl, parkour);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(skyC, 0, 0, w * sc, h * sc);
}
let lastFrame = 0, camInit = false;
function render(t) {
  const W_ = innerWidth, H_ = innerHeight, dt = Math.min(0.05, (t - (lastFrame || t)) / 1000); lastFrame = t;
  if (!WORLD) { drawSky(t, 1, false, { x: t * 0.05, y: 0 }); return; }
  const dl = WORLD.parkour ? 0.75 : daylight(t);
  // smooth camera with a little look-ahead, frame-rate independent
  const tx = (pl.x + 0.35) * TS - W_ / 2 + pl.vx * TS * 0.12, ty = (pl.y + 0.45) * TS - H_ * 0.55;
  if (!camInit) { cam.x = tx; cam.y = ty; camInit = true; }
  const a = 1 - Math.exp(-dt * 7); cam.x += (tx - cam.x) * a; cam.y += (ty - cam.y) * a;
  cam.x = Math.max(0, Math.min(WORLD.w * TS - W_, cam.x)); cam.y = Math.max(-TS * 4, Math.min(WORLD.h * TS - H_ + 120, cam.y));
  const cx0 = snap(cam.x), cy0 = snap(cam.y); const real = { x: cam.x, y: cam.y }; cam.x = cx0; cam.y = cy0;
  drawSky(t, dl, !!WORLD.parkour, cam);
  ctx.imageSmoothingEnabled = false;
  const CS = CH * TS, c0 = Math.max(0, Math.floor(cam.x / CS)), c1 = Math.floor((cam.x + W_) / CS), r0 = Math.max(0, Math.floor(cam.y / CS)), r1 = Math.floor((cam.y + H_) / CS);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { if (cx * CH >= WORLD.w || cy * CH >= WORLD.h) continue; ctx.drawImage(getChunk(cx, cy), snap(cx * CS - cam.x), snap(cy * CS - cam.y), CS, CS); }
  const nowp = performance.now(), lights = [], x0 = Math.floor(cam.x / TS) - 1, x1 = Math.ceil((cam.x + W_) / TS) + 1, y0 = Math.floor(cam.y / TS) - 1, y1 = Math.ceil((cam.y + H_) / TS) + 1;
  const vis = i => { const x = i % WORLD.w, y = (i / WORLD.w) | 0; return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
  for (const [k, tr] of Object.entries(WORLD.trees)) { const i = +k; if (!vis(i)) continue; const x = i % WORLD.w, y = (i / WORLD.w) | 0, sx = snap(x * TS - cam.x), sy = snap(y * TS - cam.y), f = WORLD.fg[i];
    const g = Math.min(1, (nowp - tr.at) / tr.grow), col = (INFO.items[f - INFO.seedOffset] || {}).color || '#ff6b6b'; ctx.drawImage(ART.treeSprite(g, col), sx, sy - 16 * TX, TS, 48 * TX);
    if (g < 1) { ctx.fillStyle = '#2a1d3dcc'; ctx.fillRect(sx + 3 * TX, sy + TS - 5 * TX, TS - 6 * TX, 4 * TX); ctx.fillStyle = '#8ce99a'; ctx.fillRect(sx + 4 * TX, sy + TS - 4 * TX, (TS - 8 * TX) * g, 2 * TX); }
    else if ((t / 900 + x) % 3 < 0.08) ART.sparkle(ctx, sx + TS * 0.8, sy + TS * 0.1, 4, 1); }
  for (let y = Math.max(0, y0); y < Math.min(WORLD.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(WORLD.w, x1); x++) { const f = WORLD.fg[y * WORLD.w + x]; if (!f) continue;
    if (f === 3) { const sx = snap(x * TS - cam.x), sy = snap(y * TS - cam.y); ctx.fillStyle = `rgba(255,220,80,${0.12 + 0.12 * Math.sin(t / 300 + x)})`; ctx.fillRect(sx, sy, TS, TS); lights.push([sx + TS / 2, sy + TS / 2, TS * 1.6]); }
    else { const it = INFO.items[f]; if (it && it.light) lights.push([x * TS - cam.x + TS / 2, y * TS - cam.y + TS / 2, TS * 3.2]); } }
  for (const [k, ck] of Object.entries(cracks)) { const i = +k; if (nowp - ck.t > 4000) { delete cracks[k]; continue; } if (!vis(i)) continue; const x = i % WORLD.w, y = (i / WORLD.w) | 0, sx = snap(x * TS - cam.x), sy = snap(y * TS - cam.y);
    const st = Math.min(4, Math.ceil(ck.p * 4)); ctx.fillStyle = `rgba(42,29,61,${0.1 + st * 0.06})`; ctx.fillRect(sx, sy, TS, TS); ctx.fillStyle = '#2a1d3d';
    const pts = [[16, 16, 6, 3], [10, 12, 3, 5], [20, 21, 7, 2], [8, 22, 2, 6], [23, 9, 3, 6], [14, 6, 5, 2], [26, 24, 2, 5], [5, 15, 5, 2]];
    for (let n = 0; n < st * 2; n++) { const [a, b, w, h] = pts[n]; ctx.fillRect(sx + a * TX, sy + b * TX, w * TX * 1.5, h * TX * 1.5); } }
  ctx.imageSmoothingEnabled = false;
  for (const d of WORLD.drops) { const bob = Math.round(Math.sin(t / 250 + d.id) * 2) * TX, dx = snap(d.x * TS - cam.x), dy = snap(d.y * TS - cam.y); ctx.fillStyle = '#0003'; ctx.fillRect(dx - TS * 0.2, dy + TS * 0.3, TS * 0.4, 2 * TX);
    if (d.item === INFO.gemDrop && Math.random() < 0.04) parts.push({ x: d.x + (Math.random() - .5) * .6, y: d.y + (Math.random() - .5) * .6, vx: 0, vy: -0.4, life: 0.6, c: '#fff', s: 6, g: 0, spark: 1 });
    const S = 20 * TX; ctx.drawImage(T(d.item), dx - S / 2, dy - S / 2 + bob, S, S); if (d.count > 1) { ctx.font = '700 12px Fredoka, system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#2a1d3d'; ctx.strokeText(d.count, dx + S * 0.45, dy + S * 0.55); ctx.fillStyle = '#fff'; ctx.fillText(d.count, dx + S * 0.45, dy + S * 0.55); } }
  const ia = 1 - Math.exp(-dt * 14);
  for (const o of others.values()) { const px = o.rx, py = o.ry; o.rx += (o.x - o.rx) * ia; o.ry += (o.y - o.ry) * ia; if (Math.abs(o.x - o.rx) > 6 || Math.abs(o.y - o.ry) > 6) { o.rx = o.x; o.ry = o.y; }
    const ovy = (o.ry - py) / Math.max(dt, 0.001); drawPlayer(o.rx, o.ry, o.name, o.role, o.face, o.equip, o.level, t, Math.abs(o.rx - px) > 0.002, Math.abs(ovy) > 0.6, ovy, 0); }
  if (ME) drawPlayer(pl.x, pl.y, ME.username, ME.role, pl.face, ME.equip, ME.level, t, Math.abs(pl.vx) > 0.5 && pl.ground, !pl.ground, pl.vy, Math.max(0, 1 - (t - (pl.punchAt || -1e9)) / 200));
  drawParts(dt);
  lights.push([(pl.x + 0.35) * TS - cam.x, (pl.y + 0.45) * TS - cam.y, TS * 4]); for (const o of others.values()) lights.push([(o.rx + 0.35) * TS - cam.x, (o.ry + 0.45) * TS - cam.y, TS * 2.5]);
  drawNight(dl, lights);
  // target highlight: white = in reach, red = too far
  const p = pointer || (matchMedia('(pointer:fine)').matches ? lastMouse : null);
  if (p) { const { x, y } = tileAt(p.x, p.y); const ok = inReachC(x, y), sx = snap(x * TS - cam.x), sy = snap(y * TS - cam.y), b = 2 * TX;
    ctx.fillStyle = ok ? '#ffffff30' : '#ff000022'; ctx.fillRect(sx, sy, TS, TS); ctx.fillStyle = ok ? '#fff' : '#ff6b6b';
    const L = TS * 0.32; for (const [ax, ay, sx2, sy2] of [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]]) { const X = sx + ax * TS, Y = sy + ay * TS; ctx.fillRect(sx2 > 0 ? X : X - L, sy2 > 0 ? Y : Y - b, L, b); ctx.fillRect(sx2 > 0 ? X : X - b, sy2 > 0 ? Y : Y - L, b, L); } }
  cam.x = real.x; cam.y = real.y;
  if (run && $('timer')) { if (run.done) $('timer').textContent = '🏁 ' + (run.done / 1000).toFixed(2) + 's'; else if (run.t0) { const left = Math.max(0, (run.limit - (performance.now() - run.t0)) / 1000); $('timer').textContent = `⏱ ${left.toFixed(1)}s · CP ${run.cp + 1}/${run.cps}`; } }
}
addEventListener('resize', resize); resize();
let lastMouse = null; addEventListener('mousemove', e => lastMouse = { x: e.clientX, y: e.clientY });
let lastT = performance.now(), fpsN = 0, fpsT = 0;
function loop(t) { const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; if (WORLD && INFO) { physics(dt); act(t); } render(t); fpsN++; if (t - fpsT > 1000) { window.__fps = fpsN; fpsN = 0; fpsT = t; } requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.__bb = { get pl() { return pl; }, send, openModal, closeModal, get WORLD() { return WORLD; }, keys, touch, get cam() { return cam; }, get TS() { return TS; }, get ME() { return ME; }, tileAt, chunks, PHY };
})();
