const test = require('node:test'), assert = require('node:assert/strict');
const { spawn, execFileSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), WebSocket = require('ws');
const PORT = 4000 + Math.floor(Math.random() * 90), BASE = 'http://localhost:' + PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbdep-')), DB = path.join(dir, 'nested', 'game.db');
let srv;
async function api(kind, username, ip, password = 'secret123') { const r = await fetch(BASE + '/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json', ...(ip ? { 'x-forwarded-for': ip } : {}) }, body: JSON.stringify({ username, password }) }); return { status: r.status, ...(await r.json()) }; }
function client(token) { return new Promise(res => { const ws = new WebSocket('ws://localhost:' + PORT); const c = { ws, msgs: [], closed: false, send: m => ws.send(JSON.stringify(m)) };
  ws.on('message', d => c.msgs.push(JSON.parse(d))); ws.on('close', () => c.closed = true); ws.on('open', () => { c.send({ t: 'auth', token, world: 'DTEST' }); setTimeout(() => res(c), 300); }); }); }
test.before(async () => {
  srv = spawn('node', ['src/server.js'], { env: { ...process.env, PORT, DB_PATH: DB, DATA_DIR: '', OWNER_USERNAME: 'Omar' }, stdio: 'ignore' });
  for (let k = 0; k < 50; k++) { try { await fetch(BASE + '/healthz'); return; } catch { await sleep(100); } }
});
test.after(() => srv.kill());
test('PORT env + /healthz endpoint', async () => {
  const r = await fetch(BASE + '/healthz'); assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.ok, true); assert.equal(typeof j.online, 'number');
  assert.equal((await fetch(BASE + '/health')).status, 200);
});
test('DB_PATH env puts the SQLite file where asked (creates folders)', async () => { assert.ok(fs.existsSync(DB)); });
test('rate limit is per real client IP behind a proxy (friends do not block each other)', async () => {
  for (let i = 0; i < 5; i++) await api('register', 'ipa' + i, '10.0.0.1');
  assert.equal((await api('register', 'ipa9', '10.0.0.1')).status, 429);
  assert.equal((await api('register', 'ipb1', '10.0.0.2')).status, 200);
});
test('second login of same account gets a "bye" so phones stop fighting in a reconnect loop', async () => {
  const o = await api('register', 'Omar', '10.0.0.3');
  const c1 = await client(o.token); const c2 = await client(o.token); await sleep(200);
  assert.ok(c1.msgs.some(m => m.t === 'bye' && m.why === 'elsewhere')); assert.ok(c1.closed); assert.ok(!c2.closed);
  assert.equal(c2.msgs.find(m => m.t === 'me').role, 'owner');
  c2.ws.close();
});
test('kicked player receives bye(kicked); admin still cannot spawn after promotion', async () => {
  const o = await api('login', 'Omar', '10.0.0.4'), a = await api('register', 'mod1', '10.0.0.4'), u = await api('register', 'kid1', '10.0.0.4');
  const co = await client(o.token), ca = await client(a.token), cu = await client(u.token);
  co.send({ t: 'admin', cmd: 'setrole', args: ['mod1', 'admin'] }); await sleep(250);
  ca.send({ t: 'admin', cmd: 'gems', args: ['mod1', '500'] }); ca.send({ t: 'admin', cmd: 'give', args: ['mod1', '13', '9'] }); await sleep(250);
  const me = [...ca.msgs].reverse().find(m => m.t === 'me'); assert.equal(me.gems, 0); assert.ok(!me.inv[13]);
  ca.send({ t: 'admin', cmd: 'kick', args: ['kid1'] }); await sleep(300);
  assert.ok(cu.msgs.some(m => m.t === 'bye' && m.why === 'kicked')); assert.ok(cu.closed);
  co.ws.close(); ca.ws.close();
});
test('SIGTERM flushes data to DB_PATH (Render restarts/redeploys)', async () => {
  srv.kill('SIGTERM'); await sleep(500);
  const out = execFileSync('node', ['-e', "const s=require('./src/store');console.log(Object.keys(s.users).includes('omar'))"], { env: { ...process.env, DB_PATH: DB }, cwd: path.join(__dirname, '..') }).toString().trim();
  assert.equal(out, 'true');
});
test('render.yaml + .gitignore are deploy-safe', () => {
  const y = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');
  assert.match(y, /healthCheckPath: \/healthz/); assert.match(y, /OWNER_USERNAME/); assert.match(y, /plan: free/);
  const g = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
  for (const k of ['node_modules', 'data/', '.env', '*.db']) assert.ok(g.includes(k), k);
});
