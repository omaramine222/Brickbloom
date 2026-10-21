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
const TV = (id, v) => tex[id + '_' + v] || (tex[id + '_' + v] = ART.tex(+id, INFO, v));
const T = id => tex[id] || (tex[id] = (window.ART ? ART.tex(+id, INFO) : makeTex(+id)));
function icon(id, size = 32) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(T(id), 0, 0, size, size); return c; }
const name = id => id >= INFO.seedOffset && id < 9000 ? INFO.items[id - INFO.seedOffset].name + ' Seed' : (INFO.items[id] || { name: '?' }).name;
const rarity = id => (INFO.items[id >= INFO.seedOffset ? id - INFO.seedOffset : id] || {}).rarity || 'common';

// ---------- login ----------
$('lu').value = localStorage.bbUser || ''; $('lw').value = localStorage.bbWorld || 'START';
async function auth(kind) {
  $('lerr').textContent = '';
  try {
    const r = await fetch('/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: $('lu').value.trim(), password: $('lp').value }) });
    const j = await r.json(); if (!r.ok) return ($('lerr').textContent = j.err || 'Error');
    localStorage.bbUser = j.username; localStorage.bbTok = j.token; localStorage.bbWorld = ($('lw').value || 'START').toUpperCase(); start(j.token);
  } catch { $('lerr').textContent = 'Cannot reach server'; }
}
$('bLogin').onclick = () => auth('login'); $('bReg').onclick = () => auth('register');
if (localStorage.bbTok) start(localStorage.bbTok);
$('lp').onkeydown = e => { if (e.key === 'Enter') auth('login'); };

async function start(token) {
  INFO = await (await fetch('/api/info')).json();
  $('login').classList.add('hidden'); $('hud').classList.remove('hidden');
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
    case 'me': if (ME && m.gems > ME.gems) SFX.play('gem'); if (ME && m.level > ME.level) { SFX.play('good'); window.FX && FX.levelUp(); } ME = m; $('gems').textContent = m.gems; $('lvl').textContent = 'Lv ' + m.level; $('bOwner').classList.toggle('hidden', !['owner', 'admin', 'mod'].includes(m.role)); refreshHotbar(); if (curPanel && !(curPanel === 'legend' && m.legend.quiz && B.querySelector('input[type=radio]:checked')) && !(curPanel === 'vend' && document.activeElement.tagName === 'INPUT')) panels[curPanel](); break;
    case 'world': WORLD = m; others.clear(); cracks = {}; const now = performance.now();
      for (const t of Object.values(m.trees)) t.at = now - t.age;
      m.players.forEach(p => p.name !== ME.username && others.set(p.id, { ...p, rx: p.x, ry: p.y }));
      pl.x = m.spawn.x; pl.y = m.spawn.y; pl.vx = pl.vy = 0; run = null; $('timer').classList.add('hidden');
      $('wname').textContent = m.name + (m.owner ? ' 🔒' + m.owner : '') + (m.parkour ? ' 🏃' : ''); localStorage.bbWorld = m.name; break;
    case 'tile': { const i = m.y * WORLD.w + m.x; const was = WORLD.fg[i] || WORLD.bg[i]; SFX.play(m.fg || (m.bg && !was) ? 'place' : 'break'); if (window.FX) FX.burst(m.x, m.y, INFO.items[WORLD.fg[i] || WORLD.bg[i]] ? INFO.items[WORLD.fg[i] || WORLD.bg[i]].color : '#fff', m.fg ? 4 : 12); WORLD.fg[i] = m.fg; WORLD.bg[i] = m.bg; delete cracks[i]; if (m.tree) WORLD.trees[i] = { at: performance.now(), grow: m.tree.grow }; else if (!(m.fg >= INFO.seedOffset)) delete WORLD.trees[i]; break; }
    case 'crack': cracks[m.y * WORLD.w + m.x] = { p: m.p, t: performance.now() }; SFX.play('hit'); break;
    case 'drop': WORLD.drops = WORLD.drops.filter(d => d.id !== m.id); if (m.d) WORLD.drops.push(m.d); break;
    case 'pjoin': if (m.p.name !== ME.username) others.set(m.p.id, { ...(others.get(m.p.id) || {}), ...m.p, rx: m.p.x, ry: m.p.y }); else ME.equip = m.p.equip; break;
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
    case 'friends': FRIENDS = m; $('bFriends').classList.toggle('ping', m.requests.length > 0); if (curPanel === 'friends') panels.friends(); break;
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
$('bSound').onclick = () => openModal('settings');
const B = $('mbody');
function itemGrid(filter, onPick, selId) {
  const g = document.createElement('div'); g.className = 'grid';
  Object.entries(ME.inv).filter(([id]) => filter(+id)).forEach(([id, n]) => {
    const s = document.createElement('div'); s.className = 'slot r-' + rarity(+id) + (+id === selId ? ' sel' : ''); s.title = name(+id);
    s.appendChild(icon(+id)); const b = document.createElement('b'); b.textContent = n; s.appendChild(b); s.onclick = () => onPick(+id); g.appendChild(s);
  }); return g;
}
const panels = {
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
    ME.quests.forEach(q => { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<b>${esc(q.text)}</b> — ${q.p}/${q.goal} · reward ${q.gems}💎 `; if (q.claimed) d.innerHTML += '✅'; else if (q.p >= q.goal) { const b = document.createElement('button'); b.textContent = 'Claim'; b.className = 'alt'; b.onclick = () => send({ t: 'quest', id: q.id }); d.appendChild(b); } B.appendChild(d); });
  },
  worlds() {
    B.innerHTML = `<h2>Travel</h2><input id="wgo" maxlength="16" placeholder="WORLD NAME"><div class="row"><button id="bgo">Go</button><button id="brun" class="alt">🏃 Random RUN</button><button id="bstart">START</button></div>
    <p>Seal a world with a <b>Keystone Seal</b> (shop). Then <code>/access name</code> lets friends build.</p>`;
    $('bgo').onclick = () => { send({ t: 'join', name: $('wgo').value }); closeModal(); };
    const cr = document.createElement('div'); cr.className = 'row'; B.appendChild(cr);
    Object.entries(INFO.courses).forEach(([k, c]) => { const b = document.createElement('button'); b.className = 'alt'; b.textContent = `🏁 ${c.name} (${c.limit / 1000}s, +${c.prize}💎)`; b.onclick = () => { send({ t: 'join', name: k }); closeModal(); }; cr.appendChild(b); });
    $('brun').onclick = () => { send({ t: 'join', name: 'RUN' }); closeModal(); }; $('bstart').onclick = () => { send({ t: 'join', name: 'START' }); closeModal(); };
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
      mk('💲 Price editor', () => { send({ t: 'prices' }); openModal('prices'); }); mk('📒 Economy logs', () => send({ t: 'logs', filter: T_() }));
      B.appendChild(r2);
      if (logs.length) B.insertAdjacentHTML('beforeend', '<table>' + logs.slice().reverse().map(l => `<tr><td>${new Date(l.t).toLocaleTimeString()}</td><td>${esc(l.type)}</td><td>${esc(JSON.stringify(Object.fromEntries(Object.entries(l).filter(([k]) => !['t', 'type'].includes(k)))).slice(0, 120))}</td></tr>`).join('') + '</table>');
    }
  },
};

// ---------- input ----------
function setMode(m) { mode = m; const b = $('tMode'); b.className = m === 'break' ? '' : m; b.textContent = m === 'break' ? '⛏' : m === 'place' ? '🧱' : '✋'; }
$('tMode').onpointerdown = e => { e.preventDefault(); setMode(mode === 'break' ? 'place' : mode === 'place' ? 'use' : 'break'); toast(mode.toUpperCase()); };
const hold = (id, k) => { const el = $(id); el.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); touch[k] = true; try { el.setPointerCapture(e.pointerId); } catch {} if (navigator.vibrate) navigator.vibrate(8); }; el.onpointerup = el.onpointercancel = el.onlostpointercapture = () => touch[k] = false; el.oncontextmenu = e => e.preventDefault(); };
addEventListener('blur', () => { touch.l = touch.r = touch.j = false; for (const k in keys) keys[k] = false; });
hold('tL', 'l'); hold('tR', 'r'); hold('tJ', 'j');
addEventListener('keydown', e => { if (document.activeElement.tagName === 'INPUT') { if (e.key === 'Enter' && document.activeElement.id === 'say') { send({ t: 'chat', text: $('say').value }); $('say').value = ''; $('say').blur(); } return; }
  keys[e.code] = true; if (e.key === 'Enter' || e.key === 't') { e.preventDefault(); $('say').focus(); }
  if (e.key === 'e' || e.key === 'i') curPanel ? closeModal() : openModal('inv'); if (e.key === 'Escape') closeModal();
  if (/^[1-9]$/.test(e.key) && hotbar[+e.key - 1] !== undefined) { sel = hotbar[+e.key - 1]; setMode(sel ? 'place' : 'break'); refreshHotbar(); } if (e.key === 'q') setMode(mode === 'use' ? 'break' : 'use'); });
addEventListener('keyup', e => keys[e.code] = false);
let pointer = null; // world-tap action with hold-to-repeat
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { if (!WORLD) return; $('say').blur(); if (pointer && pointer.id !== e.pointerId && e.pointerType === 'touch') return; pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, btn: e.button, next: 0 }; });
cv.addEventListener('pointermove', e => { if (pointer && pointer.id === e.pointerId) { pointer.x = e.clientX; pointer.y = e.clientY; } });
const release = e => { if (pointer && pointer.id === e.pointerId) pointer = null; };
addEventListener('pointerup', release); addEventListener('pointercancel', release);
function tileAt(sx, sy) { return { x: Math.floor((sx + cam.x) / TS), y: Math.floor((sy + cam.y) / TS) }; }
function act(now) {
  if (!pointer || now < pointer.next) return; pointer.next = now + 180;
  const { x, y } = tileAt(pointer.x, pointer.y), i = y * WORLD.w + x;
  const m = pointer.btn === 2 ? 'place' : mode;
  if (m === 'use' || (WORLD.vends[i] && m !== 'break')) { if (WORLD.vends[i]) { vendOpen = { x, y }; openModal('vend'); } pointer = null; return; }
  if (m === 'place' && sel) send({ t: 'place', x, y, item: sel }); else { send({ t: 'hit', x, y }); pl.punchAt = now; pl.face = x + 0.5 < pl.x + 0.35 ? -1 : 1; }
  if (m === 'place') pointer.next = now + 120;
}

// ---------- physics ----------
const solid = (x, y) => { if (x < 0 || x >= WORLD.w || y >= WORLD.h) return true; if (y < 0) return false; const i = y * WORLD.w + x, id = WORLD.fg[i]; const it = INFO.items[id]; return !!it && it.kind === 'fg' && !WORLD.trees[i]; };
const PW = 0.7, PH = 0.9;
function collide(nx, ny) { for (const cx of [nx + 0.05, nx + PW - 0.05]) for (const cy of [ny + 0.05, ny + PH - 0.05]) if (solid(Math.floor(cx), Math.floor(cy))) return true; return false; }
let lastSent = 0;
function physics(dt) {
  const L = keys.KeyA || keys.ArrowLeft || touch.l, R = keys.KeyD || keys.ArrowRight || touch.r, J = keys.KeyW || keys.ArrowUp || keys.Space || touch.j;
  const target = (R - L) * 6.5; pl.vx += (target - pl.vx) * Math.min(1, dt * (pl.ground ? 18 : 8));
  if (L !== R) pl.face = R ? 1 : -1;
  if (pl.ground && Math.abs(pl.vx) > 3 && Math.random() < 0.25) FX.dust();
  if (J && pl.ground) { pl.vy = -17.5; pl.ground = false; SFX.play('jump'); }
  pl.vy = Math.min(20, pl.vy + 45 * dt);
  let nx = pl.x + pl.vx * dt; if (!collide(nx, pl.y)) pl.x = nx; else pl.vx = 0;
  let ny = pl.y + pl.vy * dt; pl.ground = false;
  if (!collide(pl.x, ny)) pl.y = ny; else {
    if (pl.vy > 0) { if (pl.vy > 12) for (let k = 0; k < 5; k++) FX.dust(); pl.ground = true; const fy = Math.floor(ny + PH); const below = INFO.items[WORLD.fg[fy * WORLD.w + Math.floor(pl.x + 0.35)]]; pl.y = fy - PH - 0.001; if (below && below.name === 'Bounce Pad') { pl.vy = -24; pl.ground = false; } else pl.vy = 0; }
    else { pl.y = Math.floor(ny) + 1 + 0.001; pl.vy = 0; }
  }
  // magma hurts: back to spawn / checkpoint
  const ci = Math.floor(pl.y + 0.5) * WORLD.w + Math.floor(pl.x + 0.35), feet = Math.floor(pl.y + PH + 0.05) * WORLD.w + Math.floor(pl.x + 0.35);
  if (WORLD.fg[ci] === 3 || WORLD.fg[feet] === 3) { const r = run && run.respawn || WORLD.spawn; pl.x = r.x; pl.y = r.y; pl.vx = pl.vy = 0; toast('Ouch! Magma'); SFX.play('splash'); }
  const t = performance.now(); if (t - lastSent > 66) { lastSent = t; send({ t: 'move', x: +pl.x.toFixed(3), y: +pl.y.toFixed(3), face: pl.face }); }
}

// ---------- particles & effects ----------
const parts = [];
window.FX = {
  burst(x, y, color, n = 10) { for (let k = 0; k < n; k++) parts.push({ x: x + 0.2 + Math.random() * 0.6, y: y + 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 7 - 2, life: 0.55 + Math.random() * 0.45, c: Math.random() < 0.3 ? ART.sh(color, 0.3) : Math.random() < 0.5 ? ART.sh(color, -0.25) : color, s: 4 + Math.random() * 4, g: 22 }); for (let k = 0; k < 3; k++) parts.push({ x: x + Math.random(), y: y + Math.random(), vx: 0, vy: -1, life: 0.4, c: '#fff', s: 5, g: 0, spark: 1 }); },
  confetti() { for (let k = 0; k < 60; k++) parts.push({ x: pl.x + 0.35, y: pl.y, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, life: 1.4, c: `hsl(${Math.random() * 360},90%,60%)`, s: 4, g: 14 }); },
  levelUp() { FX.confetti(); ring = { t: 0 }; },
  dust() { parts.push({ x: pl.x + 0.35, y: pl.y + PH, vx: -pl.vx * 0.1 + (Math.random() - 0.5), vy: -Math.random(), life: 0.35, c: '#fff8', s: 3, g: 0 }); },
};
let ring = null;
function drawParts(dt) {
  for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.life -= dt; if (p.life <= 0) { parts.splice(k, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const X = p.x * TS - cam.x, Y = p.y * TS - cam.y; if (p.spark) { ART.sparkle(ctx, X, Y, p.s * Math.min(1, p.life * 2), Math.min(1, p.life * 2)); continue; }
    ctx.globalAlpha = Math.min(1, p.life * 2); if (p.s > 3.5) { ctx.fillStyle = '#2a1d3d'; ctx.fillRect(X - p.s / 2 - 1, Y - p.s / 2 - 1, p.s + 2, p.s + 2); } ctx.fillStyle = p.c; ctx.fillRect(X - p.s / 2, Y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1; if (parts.length > 600) parts.splice(0, parts.length - 600);
  if (ring) { ring.t += dt; const r = ring.t * TS * 6; ctx.strokeStyle = `rgba(255,212,59,${Math.max(0, 1 - ring.t)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc((pl.x + 0.35) * TS - cam.x, (pl.y + 0.45) * TS - cam.y, r, 0, 7); ctx.stroke(); if (ring.t > 1) ring = null; }
}
// day/night: one full day every 24 real minutes (dawn → day → dusk → night)
function daylight(t) { if (window.__forceDl !== undefined) return window.__forceDl; const ph = (Date.now() / 60000 / 24) % 1; return Math.max(0, Math.min(1, 0.5 + Math.cos(ph * Math.PI * 2) * 0.9)); }
const night = document.createElement('canvas'), nctx = night.getContext('2d');
function drawNight(lightLevel, lights) {
  const dark = (1 - lightLevel) * 0.72; if (dark < 0.03) return;
  if (night.width !== innerWidth || night.height !== innerHeight) { night.width = innerWidth; night.height = innerHeight; }
  nctx.globalCompositeOperation = 'source-over'; nctx.clearRect(0, 0, night.width, night.height);
  nctx.fillStyle = `rgba(8,6,32,${dark})`; nctx.fillRect(0, 0, night.width, night.height);
  nctx.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) { const g = nctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); nctx.fillStyle = g; nctx.beginPath(); nctx.arc(x, y, r, 0, 7); nctx.fill(); }
  ctx.drawImage(night, 0, 0, innerWidth, innerHeight);
}

// ---------- rendering ----------
function resize() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); TS = 32; }
addEventListener('resize', resize); resize();
const roleColor = r => ({ owner: '#ffd43b', admin: '#ff6b6b', mod: '#74c0fc' })[r] || '#fff';
function drawPlayer(x, y, nm, role, face, eq, lv, t, moving, air, vy, punch) {
  const px = x * TS - cam.x, py = y * TS - cam.y, w = PW * TS, h = PH * TS;
  ART.player(ctx, px, py - h * 0.62, w, h * 1.62, nm, eq, { face, t, moving, air, vy, punch }, INFO);
  const label = (role === 'owner' ? '👑 ' : role === 'admin' ? '🛡 ' : role === 'mod' ? '🔧 ' : '') + nm;
  ctx.font = '600 12px Fredoka, system-ui'; ctx.textAlign = 'center'; const tw = ctx.measureText(label).width + 26, lx = px + w / 2 - tw / 2, ly = py - h * 0.62 - 24;
  ctx.fillStyle = '#2a1d3dcc'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, tw, 18, 9) : ctx.rect(lx, ly, tw, 18); ctx.fill();
  ctx.fillStyle = '#7c5cff'; ctx.beginPath(); ctx.arc(lx + tw - 10, ly + 9, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 9px Fredoka, system-ui'; ctx.fillText(lv || 1, lx + tw - 10, ly + 12.5);
  ctx.font = '600 12px Fredoka, system-ui'; ctx.fillStyle = roleColor(role); ctx.fillText(label, lx + (tw - 14) / 2, ly + 13.5);
}
function render(t) {
  const W_ = innerWidth, H_ = innerHeight;
  const dl = WORLD && WORLD.parkour ? 0.75 : daylight(t), mix = (a, b) => { const A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16); return `rgb(${[16, 8, 0].map(sh => Math.round(((A >> sh) & 255) * dl + ((Bc >> sh) & 255) * (1 - dl))).join(',')})`; };
  if (!WORLD) { ART.sky(ctx, W_, H_, { x: t * 0.05, y: 0 }, t, 1, false); return; }
  cam.x += ((pl.x + 0.35) * TS - W_ / 2 - cam.x) * 0.15; cam.y += ((pl.y + 0.45) * TS - H_ / 2 - cam.y) * 0.15;
  cam.x = Math.max(0, Math.min(WORLD.w * TS - W_, cam.x)); cam.y = Math.max(-TS * 4, Math.min(WORLD.h * TS - H_ + 140, cam.y));
  ART.sky(ctx, W_, H_, cam, t, dl, !!WORLD.parkour);
  ctx.imageSmoothingEnabled = false;
  const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(WORLD.w, Math.ceil((cam.x + W_) / TS) + 1), y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(WORLD.h, Math.ceil((cam.y + H_) / TS) + 1);
  const nowp = performance.now(), lights = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * WORLD.w + x, sx = x * TS - cam.x, sy = y * TS - cam.y, b = WORLD.bg[i], f = WORLD.fg[i];
    if (b) ctx.drawImage(T(b), sx, sy, TS, TS);
    if (f) {
      const tr = WORLD.trees[i];
      if (tr) { const g = Math.min(1, (nowp - tr.at) / tr.grow), col = (INFO.items[f - INFO.seedOffset] || {}).color || '#ff6b6b';
        ART.tree(ctx, sx, sy, TS, g, col, t, x);
        if (g < 1) { ctx.fillStyle = '#2a1d3dcc'; ctx.fillRect(sx + 3, sy + TS - 5, TS - 6, 4); ctx.fillStyle = '#8ce99a'; ctx.fillRect(sx + 4, sy + TS - 4, (TS - 8) * g, 2); }
        else if ((t / 900 + x) % 3 < 0.08) ART.sparkle(ctx, sx + TS * 0.8, sy + TS * 0.1, 4, 1);
      } else { ctx.drawImage(ART.SEAMLESS.has(f) ? TV(f, (x * 7 + y * 13 + (x * y) % 5) % 4) : T(f), sx, sy, TS, TS);
        const itf = INFO.items[f];
        if (itf && itf.kind === 'fg' && f !== 9) { const so = (xx, yy) => { if (xx < 0 || xx >= WORLD.w || yy < 0 || yy >= WORLD.h) return false; const n = INFO.items[WORLD.fg[yy * WORLD.w + xx]]; return !n || n.kind !== 'fg' || WORLD.fg[yy * WORLD.w + xx] === 9; };
          const up = so(x, y - 1); if (ART.SEAMLESS.has(f)) ART.edges(ctx, sx, sy, TS, up, so(x, y + 1), so(x - 1, y), so(x + 1, y)); if (f === 1 && up) ctx.drawImage(ART.grassCap, sx, sy - 2, TS, TS * 14 / 32);
          else if (up && y > 0) { ctx.fillStyle = '#ffffff22'; ctx.fillRect(sx, sy, TS, 3); } }
        if (f === 3) { ctx.fillStyle = `rgba(255,220,80,${0.15 + 0.15 * Math.sin(t / 300 + x)})`; ctx.fillRect(sx, sy, TS, TS); } }
      const it = INFO.items[f]; if (it && (it.light || f === 3)) { lights.push([sx + TS / 2, sy + TS / 2, TS * (f === 3 ? 1.6 : 3.2)]); if (it.light) { ctx.fillStyle = '#ffe06622'; ctx.beginPath(); ctx.arc(sx + TS / 2, sy + TS / 2, TS * 1.3, 0, 7); ctx.fill(); } }
    }
    const ck = cracks[i]; if (ck) { if (nowp - ck.t > 4000) delete cracks[i]; else { ctx.fillStyle = `rgba(42,29,61,${ck.p * 0.25})`; ctx.fillRect(sx, sy, TS, TS); ctx.strokeStyle = '#2a1d3d'; ctx.lineWidth = 2.5; ctx.beginPath(); const n = Math.ceil(ck.p * 5); for (let k = 0; k < n; k++) { ctx.moveTo(sx + TS / 2, sy + TS / 2); ctx.lineTo(sx + TS * ((k * 37 % 10) / 10), sy + TS * ((k * 53 % 10) / 10)); } ctx.stroke(); } }
  }
  for (const d of WORLD.drops) { const bob = Math.sin(t / 250 + d.id) * 3; ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(d.x * TS - cam.x, d.y * TS - cam.y + TS * 0.38, TS * 0.22, TS * 0.07, 0, 0, 7); ctx.fill(); if (d.item === INFO.gemDrop && Math.random() < 0.04) parts.push({ x: d.x + (Math.random() - .5) * .6, y: d.y + (Math.random() - .5) * .6, vx: 0, vy: -0.4, life: 0.6, c: '#fff', s: 6, g: 0, spark: 1 }); ctx.imageSmoothingEnabled = true; ctx.drawImage(T(d.item), d.x * TS - cam.x - TS * 0.3, d.y * TS - cam.y - TS * 0.3 + bob, TS * 0.6, TS * 0.6); if (d.count > 1) { ctx.font = '700 11px Fredoka, system-ui'; ctx.lineWidth = 3; ctx.strokeStyle = '#2a1d3d'; ctx.strokeText(d.count, d.x * TS - cam.x + TS * 0.3, d.y * TS - cam.y + TS * 0.3); ctx.fillStyle = '#fff'; ctx.fillText(d.count, d.x * TS - cam.x + TS * 0.3, d.y * TS - cam.y + TS * 0.3); } } ctx.imageSmoothingEnabled = false;
  for (const o of others.values()) { o.rx += (o.x - o.rx) * 0.3; o.ry += (o.y - o.ry) * 0.3; const ovy = o.ry - (o.py ?? o.ry); o.py = o.ry; drawPlayer(o.rx, o.ry, o.name, o.role, o.face, o.equip, o.level, t, Math.abs(o.x - o.rx) > 0.01, Math.abs(ovy) > 0.004, ovy, 0); }
  if (ME) drawPlayer(pl.x, pl.y, ME.username, ME.role, pl.face, ME.equip, ME.level, t, Math.abs(pl.vx) > 0.5, !pl.ground, pl.vy, Math.max(0, 1 - (t - (pl.punchAt || -1e9)) / 220));
  drawParts(Math.min(0.05, (t - (render.lt || t)) / 1000)); render.lt = t;
  lights.push([(pl.x + 0.35) * TS - cam.x, (pl.y + 0.45) * TS - cam.y, TS * 4]); for (const o of others.values()) lights.push([(o.rx + 0.35) * TS - cam.x, (o.ry + 0.45) * TS - cam.y, TS * 2.5]);
  drawNight(dl, lights);
  // reach / target highlight
  if (pointer || matchMedia('(pointer:fine)').matches) { const p = pointer || lastMouse; if (p) { const { x, y } = tileAt(p.x, p.y); const ok = Math.abs(x - Math.floor(pl.x + 0.35)) <= 5 && Math.abs(y - Math.floor(pl.y + 0.45)) <= 5; ctx.strokeStyle = ok ? '#fff' : '#f005'; ctx.lineWidth = 2; ctx.strokeRect(x * TS - cam.x + 1, y * TS - cam.y + 1, TS - 2, TS - 2); } }
  if (run && $('timer')) { if (run.done) $('timer').textContent = '🏁 ' + (run.done / 1000).toFixed(2) + 's'; else if (run.t0) { const left = Math.max(0, (run.limit - (performance.now() - run.t0)) / 1000); $('timer').textContent = `⏱ ${left.toFixed(1)}s · CP ${run.cp + 1}/${run.cps}`; } }
}
let lastMouse = null; addEventListener('mousemove', e => lastMouse = { x: e.clientX, y: e.clientY });
let lastT = performance.now();
function loop(t) { const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; if (WORLD && INFO) { physics(dt); act(t); } render(t); requestAnimationFrame(loop); }
requestAnimationFrame(loop); setMode('break');
window.__bb = { get pl() { return pl; }, send, openModal, closeModal, get WORLD() { return WORLD; }, keys, touch };
})();
