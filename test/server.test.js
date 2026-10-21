const test = require('node:test'), assert = require('node:assert/strict');
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), WebSocket = require('ws');
const PORT = 3900 + Math.floor(Math.random() * 90), BASE = 'http://localhost:' + PORT;
let srv;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(kind, username, password = 'secret123') { const r = await fetch(BASE + '/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) }); return { status: r.status, ...(await r.json()) }; }
function client(token, world = 'ITEST') {
  return new Promise(res => { const ws = new WebSocket('ws://localhost:' + PORT); const c = { ws, msgs: [], send: m => ws.send(JSON.stringify(m)), last: t => [...c.msgs].reverse().find(m => m.t === t) };
    ws.on('message', d => c.msgs.push(JSON.parse(d))); ws.on('open', () => { c.send({ t: 'auth', token, world }); setTimeout(() => res(c), 300); }); });
}
test.before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-'));
  srv = spawn('node', ['src/server.js'], { env: { ...process.env, PORT, DATA_DIR: dir, OWNER_USERNAME: 'Omar' }, stdio: 'ignore' });
  for (let k = 0; k < 50; k++) { try { await fetch(BASE + '/api/info'); return; } catch { await sleep(100); } }
});
test.after(() => srv.kill());
test('accounts, owner role from env, staff permissions over the wire, fuzz', async () => {
  const o = await api('register', 'Omar'), a = await api('register', 'friend1'), b = await api('register', 'friend2');
  assert.ok(o.token && a.token && b.token);
  assert.equal((await api('register', 'Omar')).status, 409);
  assert.equal((await api('login', 'Omar', 'wrongpass')).status, 401);
  assert.equal((await api('register', 'x')).status, 400);
  const co = await client(o.token), ca = await client(a.token), cb = await client(b.token);
  assert.equal(co.last('me').role, 'owner'); assert.equal(ca.last('me').role, 'user');
  assert.equal(co.last('world').w, 100);
  // regular user cannot give
  ca.send({ t: 'admin', cmd: 'give', args: ['friend1', '13', '50'] }); await sleep(200);
  assert.ok(!ca.last('me').inv[13]);
  // owner promotes friend1 to admin, admin still cannot give/promote
  co.send({ t: 'admin', cmd: 'setrole', args: ['friend1', 'admin'] }); await sleep(250);
  assert.equal(ca.last('me').role, 'admin');
  ca.send({ t: 'admin', cmd: 'give', args: ['friend1', '13', '50'] }); ca.send({ t: 'chat', text: '/gems friend1 9999' });
  await sleep(800); ca.send({ t: 'admin', cmd: 'setrole', args: ['friend2', 'admin'] }); await sleep(300);
  assert.ok(!ca.last('me').inv[13]); assert.equal(ca.last('me').gems, 0); assert.equal(cb.last('me').role, 'user');
  // admin can mute a user
  ca.send({ t: 'admin', cmd: 'mute', args: ['friend2', '5'] }); await sleep(200);
  cb.send({ t: 'chat', text: 'hello' }); await sleep(200);
  assert.ok(cb.msgs.some(m => m.t === 'chat' && /muted/.test(m.text)));
  // owner can give
  co.send({ t: 'admin', cmd: 'give', args: ['friend2', '13', '5'] }); await sleep(250);
  assert.equal(cb.last('me').inv[13], 5);
  // multiplayer presence
  assert.ok(co.msgs.some(m => m.t === 'pjoin' && m.p.name === 'friend2'));
  // fuzz: garbage must not crash the server
  for (const g of ['{', 'null', '[]', '{"t":1}', JSON.stringify({ t: 'hit', x: 'a' }), JSON.stringify({ t: 'place', x: 1e9, y: -5, item: 'x' }), JSON.stringify({ t: 'trade_offer', items: 'x' }), JSON.stringify({ t: 'move', x: 1e9, y: NaN }), JSON.stringify({ t: 'join', name: '../../etc' }), JSON.stringify({ t: 'buy', pack: '__proto__' }), JSON.stringify({ t: 'vend_buy', x: {}, y: [] })]) cb.ws.send(g);
  await sleep(300);
  const info = await fetch(BASE + '/api/info'); assert.equal(info.status, 200);
  // teleport-hack move gets corrected
  cb.send({ t: 'move', x: 5, y: 2 }); await sleep(200); assert.ok(cb.last('pos'));
  // trade flow with confirm step
  co.send({ t: 'trade_req', name: 'friend2' }); await sleep(150); cb.send({ t: 'trade_accept', name: 'Omar' }); await sleep(150);
  cb.send({ t: 'trade_offer', items: [[13, 2]], gems: 0 }); await sleep(100);
  co.send({ t: 'trade_ready' }); cb.send({ t: 'trade_ready' }); await sleep(150);
  assert.equal(co.last('trade').stage, 'confirm');
  co.send({ t: 'trade_confirm' }); cb.send({ t: 'trade_confirm' }); await sleep(300);
  assert.equal(cb.last('me').inv[13], 3); assert.equal(co.last('me').inv[13], 2);
  // friends + private messages
  co.send({ t: 'friend', op: 'add', name: 'friend2' }); await sleep(150); assert.deepEqual(cb.last('friends').requests, ['Omar']);
  cb.send({ t: 'friend', op: 'accept', name: 'Omar' }); await sleep(150); assert.equal(co.last('friends').list[0].online, true);
  co.send({ t: 'chat', text: '/msg friend2 kifak?' }); await sleep(150);
  assert.equal(cb.last('pm').text, 'kifak?'); assert.ok(!ca.msgs.some(m => m.t === 'pm'));
  // owner tools: ban list visible to staff only, price editor owner only
  cb.send({ t: 'banlist' }); await sleep(150); assert.ok(!cb.last('banlist'));
  ca.send({ t: 'banlist' }); await sleep(150); assert.ok(ca.last('banlist').list.some(x => x.name === 'friend2' && x.muted));
  ca.send({ t: 'setprice', id: 13, price: 1 }); await sleep(150); assert.ok(!ca.last('prices'));
  co.send({ t: 'setprice', id: 13, price: 4321 }); await sleep(150); assert.equal(co.last('prices').market[13], 4321);
  [co, ca, cb].forEach(c => c.ws.close());
});
