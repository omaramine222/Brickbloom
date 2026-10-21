const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3000', OUT = __dirname + '/../screenshots/', P = process.env.PREFIX || 'v5-';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
async function page(b, user, vp, world) {
  const cx = await b.createBrowserContext(); const pg = await cx.newPage(); await pg.setViewport(vp);
  pg.on('pageerror', e => errs.push(user + ': ' + e.message)); pg.on('console', m => m.type() === 'error' && errs.push(user + ' console: ' + m.text()));
  await pg.goto(BASE); await sleep(600); if (!user) return pg;
  await pg.$eval('#lu', e => e.value = ''); await pg.type('#lu', user); await pg.type('#lp', 'secret123');
  await pg.$eval('#lw', (e, w) => e.value = w, world); await pg.click('#bLogin'); await sleep(2000); return pg;
}
const ev = (pg, m) => pg.evaluate(m => window.__bb.send(m), m);
(async () => {
  for (const u of ['Omar', 'Rami', 'Lea']) await fetch(BASE + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: 'secret123' }) });
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const port = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const land = { width: 844, height: 390, isMobile: true, hasTouch: true, isLandscape: true, deviceScaleFactor: 2 };
  const lg = await page(b, null, port); await lg.screenshot({ path: OUT + P + 'login.png' });
  const omar = await page(b, 'Omar', port, 'BEIRUT');
  for (const [id, n] of [[42, 1], [46, 1], [47, 1], [41, 1], [45, 1], [13, 10], [16, 5], [15, 5], [118, 20], [101, 20], [2, 20]]) await ev(omar, { t: 'admin', cmd: 'give', args: ['Omar', String(id), String(n)] });
  for (const [id, n] of [[41, 1], [45, 1]]) await ev(omar, { t: 'admin', cmd: 'give', args: ['Rami', String(id), String(n)] });
  await sleep(300); await ev(omar, { t: 'equip', item: 42 }); await ev(omar, { t: 'equip', item: 46 }); await ev(omar, { t: 'equip', item: 47 }); await sleep(300);
  const rami = await page(b, 'Rami', port, 'BEIRUT'); await ev(rami, { t: 'equip', item: 41 }); await ev(rami, { t: 'equip', item: 45 });
  await rami.evaluate(() => { window.__bb.pl.x += 1.5; }); await sleep(600);
  await ev(omar, { t: 'chat', text: 'Ahla ya Rami! 🎉' }); await sleep(800); await ev(rami, { t: 'chat', text: 'kifak Omar!' }); await sleep(1200);
  await omar.screenshot({ path: OUT + P + 'portrait.png' }); await rami.screenshot({ path: OUT + P + 'two-players.png' });
  await omar.evaluate(() => window.__bb.openModal('inv')); await sleep(400); await omar.screenshot({ path: OUT + P + 'inventory.png' }); await omar.evaluate(() => window.__bb.closeModal());
  await omar.evaluate(() => window.__bb.openModal('owner')); await sleep(400); await omar.screenshot({ path: OUT + P + 'owner-panel.png' }); await omar.evaluate(() => window.__bb.closeModal());
  const lea = await page(b, 'Lea', land, 'BEIRUT'); await sleep(800); await lea.screenshot({ path: OUT + P + 'landscape.png' });
  await omar.evaluate(() => { window.__forceDl = 0.1; }); await sleep(500); await omar.screenshot({ path: OUT + P + 'night.png' });
  const ex = process.env.EXTRA; if (ex) await require(ex)(b, { page, ev, omar, rami, lea, OUT, P, sleep, port, land });
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
  await b.close();
})();
