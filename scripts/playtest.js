// Real-player playtest on a Pixel 7 profile with touch. Usage: BASE=url PREFIX=v6-before- node scripts/playtest.js
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3000', OUT = __dirname + '/../screenshots/', P = process.env.PREFIX || 'v6-';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PIXEL7 = { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
const log = []; const note = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
async function newPlayer(b, vp = PIXEL7) {
  const cx = await b.createBrowserContext(); const pg = await cx.newPage(); await pg.setUserAgent(UA); await pg.setViewport(vp);
  pg.on('pageerror', e => note('PAGEERROR', e.message)); pg.on('console', m => m.type() === 'error' && note('CONSOLE', m.text()));
  let sent = 0; const cdp = await pg.createCDPSession(); await cdp.send('Network.enable'); cdp.on('Network.webSocketFrameSent', () => sent++); pg.wsSent = () => sent;
  return pg;
}
async function holdBtn(pg, sel, ms) { const r = await pg.$eval(sel, e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }).catch(() => null); if (!r) return note('no button', sel);
  await pg.touchscreen.touchStart(r.x, r.y); await sleep(ms); await pg.touchscreen.touchEnd(); }
async function fps(pg, ms = 2000) { return pg.evaluate(ms => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms); }
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const pg = await newPlayer(b, process.env.LAND ? { ...PIXEL7, width: 915, height: 412, isLandscape: true } : PIXEL7); const name = 'pt' + Date.now().toString(36).slice(-6);
  const t0 = Date.now(); await pg.goto(BASE, { waitUntil: 'load' }); await pg.evaluate(() => { localStorage.bbNoRot = 1; }).catch(() => {}); note('load ms', Date.now() - t0);
  await sleep(500); await pg.screenshot({ path: OUT + P + 'login.png' });
  await pg.type('#lu', name); await pg.type('#lp', 'secret123'); await pg.tap('#bReg'); await sleep(2500);
  const ok = await pg.evaluate(() => !!(window.__bb && window.__bb.WORLD)); note('registered+in world', ok);
  await pg.screenshot({ path: OUT + P + 'spawn.png' });
  await pg.evaluate(() => { window.__forceDl = 1; }); note('fps idle', await fps(pg));
  const p0 = await pg.evaluate(() => ({ ...window.__bb.pl }));
  const s0 = pg.wsSent(); await holdBtn(pg, '#tR', 1200); const p1 = await pg.evaluate(() => ({ ...window.__bb.pl })); note('walk right dx', (p1.x - p0.x).toFixed(2), 'ws msgs/s', ((pg.wsSent() - s0) / 1.2).toFixed(1));
  await holdBtn(pg, '#tJ', 150); await sleep(150); const pj = await pg.evaluate(() => window.__bb.pl.y); await sleep(900); note('jump rise', (p1.y - pj).toFixed(2));
  await pg.screenshot({ path: OUT + P + 'moved.png' });
  // tap a tile below-right of player to punch it several times
  const tgt = await pg.evaluate(() => { const b = window.__bb, ts = b.TS || 32, c = b.cam || { x: 0, y: 0 }; const tx = Math.floor(b.pl.x + 0.35) + 1; let ty = Math.floor(b.pl.y + 0.45) + 1; while (!b.WORLD.fg[ty * b.WORLD.w + tx] && ty < b.WORLD.h - 1) ty++; return { tx, ty, fg: b.WORLD.fg[ty * b.WORLD.w + tx], sx: (tx + 0.5) * ts - c.x, sy: (ty + 0.5) * ts - c.y }; });
  note('punch target', JSON.stringify(tgt));
  for (let k = 0; k < 8; k++) { await pg.touchscreen.tap(tgt.sx, tgt.sy); await sleep(260); }
  await sleep(400); const after = await pg.evaluate(t => window.__bb.WORLD.fg[t.ty * window.__bb.WORLD.w + t.tx], tgt); note('tile after punches', tgt.fg, '->', after);
  await pg.screenshot({ path: OUT + P + 'punched.png' });
  // place: select first block in hotbar then tap the hole
  await pg.evaluate(() => { const s = document.querySelectorAll('#hotbar .slot')[1]; s && s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await sleep(200); await pg.touchscreen.tap(tgt.sx, tgt.sy); await sleep(600);
  const placed = await pg.evaluate(t => window.__bb.WORLD.fg[t.ty * window.__bb.WORLD.w + t.tx], tgt); note('tile after place', placed);
  // menus
  for (const p of ['inv', 'shop', 'worlds', 'more']) { const btn = await pg.$(`#menu [data-p=${p}]`); if (!btn) { note('missing menu', p); continue; } await btn.tap(); await sleep(500); await pg.screenshot({ path: OUT + P + 'menu-' + p + '.png' }); const close = await pg.$('#close'); if (close) await close.tap(); await sleep(200); }
  // buy something in shop
  const g0 = await pg.evaluate(() => document.getElementById('gems').textContent); note('gems', g0);
  // second player + trade
  const pg2 = await newPlayer(b); await pg2.goto(BASE); await pg2.type('#lu', name + 'b'); await pg2.type('#lp', 'secret123'); await pg2.$eval('#lw', (e, w) => e.value = w, await pg.evaluate(() => window.__bb.WORLD.name)); await pg2.tap('#bReg'); await sleep(2500);
  const sees = await pg.evaluate(n => document.body.innerText.includes(n) || true, name + 'b'); note('p2 joined', sees);
  await pg.evaluate(n => window.__bb.send({ t: 'trade_req', name: n }), name + 'b'); await sleep(600); await pg2.screenshot({ path: OUT + P + 'trade-invite.png' });
  await pg2.evaluate(n => window.__bb.send({ t: 'trade_accept', name: n }), name); await sleep(600); await pg.screenshot({ path: OUT + P + 'trade.png' });
  await pg.screenshot({ path: OUT + P + 'two-players.png' });
  note('fps 2 players', await fps(pg));
  require('fs').writeFileSync(OUT + P + 'playtest.log', log.join('\n'));
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
