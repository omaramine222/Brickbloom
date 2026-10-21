const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3000', OUT = __dirname + '/../screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(kind, u, p = 'secret123') { const r = await fetch(BASE + '/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }); return r.json(); }
async function page(browser, user, vp, world) {
  const cx = await browser.createBrowserContext(); const pg = await cx.newPage(); await pg.setViewport(vp);
  pg.on('pageerror', e => console.log('PAGEERR', user, e.message));
  await pg.goto(BASE); await pg.$eval('#lu', e => e.value = ''); await pg.type('#lu', user); await pg.type('#lp', 'secret123');
  await pg.$eval('#lw', (e, w) => e.value = w, world);
  await pg.click('#bLogin'); await sleep(1500); return pg;
}
(async () => {
  for (const u of ['Omar', 'Rami', 'Lea']) { const r = await api('register', u); if (r.err && !/taken/.test(r.err)) console.log(u, r.err); }
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const desk = { width: 1280, height: 720 }, mob = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const omar = await page(browser, 'Omar', desk, 'BEIRUT');
  await omar.screenshot({ path: OUT + 'desktop-spawn.png' });
  // owner gives himself some goodies to show off
  const ev = (pg, m) => pg.evaluate(m => window.__bb.send(m), m);
  for (const [id, n] of [[19, 1], [13, 20], [15, 10], [9, 20], [7, 30], [42, 1], [46, 1], [25, 1], [1022, 3], [27, 2], [26, 3]]) await ev(omar, { t: 'admin', cmd: 'give', args: ['Omar', String(id), String(n)] });
  await ev(omar, { t: 'admin', cmd: 'gems', args: ['Omar', '5000'] }); await sleep(300);
  await ev(omar, { t: 'equip', item: 42 }); await ev(omar, { t: 'equip', item: 46 }); await sleep(300);
  // build: dig & place blocks around spawn
  const pos = await omar.evaluate(() => ({ x: Math.floor(window.__bb.pl.x + .35), y: Math.floor(window.__bb.pl.y + .45) }));
  const items = [7, 9, 13, 7, 9, 13];
  for (let k = 0; k < 6; k++) { await ev(omar, { t: 'place', x: pos.x - 3 + k, y: pos.y - 3, item: items[k] }); await sleep(130); }
  for (let k = 0; k < 3; k++) { await ev(omar, { t: 'place', x: pos.x + 3, y: pos.y - k, item: 15 }); await sleep(130); }
  for (let h = 0; h < 4; h++) { await ev(omar, { t: 'hit', x: pos.x - 2, y: pos.y + 1 }); await sleep(130); }
  await ev(omar, { t: 'place', x: pos.x - 4, y: pos.y, item: 19 }); await sleep(150);
  await ev(omar, { t: 'place', x: pos.x + 2, y: pos.y, item: 1022 }); await sleep(150);
  await ev(omar, { t: 'chat', text: 'Ahla w sahla ya shabab! 🎉' }); await sleep(800);
  await ev(omar, { t: 'chat', text: '/access Rami' }); await sleep(800);
  await omar.screenshot({ path: OUT + 'desktop-building.png' });
  await omar.evaluate(() => window.__bb.openModal('inv')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-inventory.png' });
  await omar.evaluate(() => window.__bb.openModal('owner')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-owner-panel.png' });
  await omar.evaluate(() => window.__bb.openModal('shop')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-shop.png' });
  await omar.evaluate(() => window.__bb.closeModal());
  await omar.evaluate(() => { window.__bb.pl.x -= 1.6; }); await sleep(300);
  const rami = await page(browser, 'Rami', mob, 'BEIRUT'); await rami.evaluate(() => { window.__bb.pl.x += 1.2; }); await sleep(800);
  await ev(rami, { t: 'chat', text: 'kifak Omar!' }); await sleep(800);
  await rami.screenshot({ path: OUT + 'mobile-two-players.png' }); await omar.screenshot({ path: OUT + 'desktop-two-players.png' });
  await rami.evaluate(() => window.__bb.openModal('inv')); await sleep(300); await rami.screenshot({ path: OUT + 'mobile-inventory.png' });
  await rami.evaluate(() => window.__bb.closeModal());
  // trade window
  await ev(omar, { t: 'trade_req', name: 'Rami' }); await sleep(300); await ev(rami, { t: 'trade_accept', name: 'Omar' }); await sleep(300);
  await ev(omar, { t: 'trade_offer', items: [[13, 3]], gems: 50 }); await sleep(400); await rami.screenshot({ path: OUT + 'mobile-trade.png' }); await ev(rami, { t: 'trade_cancel' });
  const lea = await page(browser, 'Lea', mob, 'START'); await sleep(500); await lea.screenshot({ path: OUT + 'mobile-spawn.png' });
  await ev(lea, { t: 'join', name: 'RUN' }); await sleep(1500); await lea.screenshot({ path: OUT + 'mobile-parkour.png' });
  await ev(omar, { t: 'clinic' }); await sleep(300); await omar.evaluate(() => window.__bb.openModal('clinic')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-clinic.png' });
  // v2 screens
  await omar.evaluate(() => window.__bb.closeModal());
  await omar.evaluate(() => { window.__forceDl = 0.1; }); await sleep(500); await omar.screenshot({ path: OUT + 'desktop-night.png' });
  await omar.evaluate(() => { window.__forceDl = undefined; });
  await omar.evaluate(() => window.__bb.openModal('legend')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-mythic-path.png' });
  await ev(omar, { t: 'carnival', on: true }); await sleep(200); await ev(omar, { t: 'hl', dir: 'start' }); await sleep(300);
  await omar.evaluate(() => window.__bb.openModal('carnival')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-carnival.png' });
  await ev(omar, { t: 'friend', op: 'add', name: 'Lea' }); await ev(lea, { t: 'friend', op: 'accept', name: 'Omar' }); await ev(omar, { t: 'friend', op: 'add', name: 'Rami' }); await sleep(800);
  await ev(lea, { t: 'pm', name: 'Omar', text: 'Omar, tale3 3al RUN2!' }); await sleep(400);
  await omar.evaluate(() => window.__bb.openModal('friends')); await sleep(300); await omar.screenshot({ path: OUT + 'desktop-friends-pm.png' });
  await ev(omar, { t: 'prices' }); await omar.evaluate(() => window.__bb.openModal('prices')); await sleep(400); await omar.screenshot({ path: OUT + 'desktop-price-editor.png' });
  await ev(omar, { t: 'admin', cmd: 'tempban', args: ['Rami', '30'] }); await ev(omar, { t: 'admin', cmd: 'setrole', args: ['Lea', 'mod'] }); await sleep(300);
  await ev(omar, { t: 'banlist' }); await omar.evaluate(() => window.__bb.openModal('bans')); await sleep(400); await omar.screenshot({ path: OUT + 'desktop-banlist.png' });
  await ev(omar, { t: 'admin', cmd: 'unban', args: ['Rami'] }); await ev(omar, { t: 'admin', cmd: 'setrole', args: ['Lea', 'user'] }); await ev(omar, { t: 'carnival', on: null });
  await ev(lea, { t: 'join', name: 'RUN2' }); await sleep(1500); await lea.screenshot({ path: OUT + 'mobile-course-bounce-canyon.png' });
  await lea.evaluate(() => window.__bb.openModal('worlds')); await sleep(300); await lea.screenshot({ path: OUT + 'mobile-travel-courses.png' });
  await lea.evaluate(() => window.__bb.openModal('friends')); await sleep(300); await lea.screenshot({ path: OUT + 'mobile-friends.png' });
  await browser.close(); console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
