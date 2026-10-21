const test = require('node:test'), assert = require('node:assert/strict');
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 4200 + Math.floor(Math.random() * 90), BASE = 'http://localhost:' + PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms)); let srv;
test.before(async () => { srv = spawn('node', ['src/server.js'], { env: { ...process.env, PORT, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'bb6-')), OWNER_USERNAME: 'Omar' }, stdio: 'ignore' });
  for (let k = 0; k < 50; k++) { try { await fetch(BASE + '/healthz'); return; } catch { await sleep(100); } } });
test.after(() => srv.kill());
test('v6: healthz + /version report version 6', async () => {
  assert.equal((await (await fetch(BASE + '/healthz')).json()).version, 6); assert.equal((await (await fetch(BASE + '/version')).json()).version, 6);
});
test('v6: assets are gzip-compressed and cached; page + service worker are never stale', async () => {
  const js = await fetch(BASE + '/game.js?v=6', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(js.headers.get('content-encoding'), 'gzip'); assert.match(js.headers.get('cache-control'), /max-age=\d+/);
  assert.equal((await fetch(BASE + '/')).headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(BASE + '/sw.js')).headers.get('cache-control'), 'no-cache');
  assert.match((await fetch(BASE + '/fonts/fredoka-700.ttf')).headers.get('cache-control'), /max-age=604800/);
});
test('v6: page has loader, zoom lock, versioned assets and the new controls', async () => {
  const html = await (await fetch(BASE + '/')).text();
  for (const s of ['id="loader"', 'user-scalable=no', 'game.js?v=6', 'art.js?v=6', 'id="dpad"', 'id="tJ"', 'id="bMore"', 'id="rotate"']) assert.ok(html.includes(s), s);
  assert.ok(!html.includes('id="tMode"'), 'confusing break/place mode button removed');
});
test('v6: client physics constants stay inside the server anti-cheat limits', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8');
  const PHY = JSON.parse(src.match(/const PHY = (\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
  const srv = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8'); const maxSpeed = +srv.match(/const maxD = (\d+) \* dt/)[1], maxV = +srv.match(/Math.abs\(y - p.y\) > (\d+) \* dt/)[1];
  assert.ok(PHY.run < maxSpeed && PHY.jump < maxSpeed && PHY.maxFall < maxV && 24 < maxV);
  const jumpTiles = PHY.jump ** 2 / (2 * PHY.grav); assert.ok(jumpTiles > 1.8 && jumpTiles < 2.6, 'Growtopia-like ~2 tile jump, got ' + jumpTiles.toFixed(2));
  assert.match(src, /> 95\) \|\| t - lastSent > 2000/, 'movement sent at most ~10/s and only when moving');
});
test('v6: client reach never exceeds the server reach', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8'), g = require('../src/game');
  assert.ok(+src.match(/const REACH = (\d+)/)[1] <= g.REACH);
});
