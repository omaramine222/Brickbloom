const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3000', OUT = __dirname + '/../screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(b, user, vp, world) {
  const cx = await b.createBrowserContext(); const pg = await cx.newPage(); await pg.setViewport(vp);
  pg.on('pageerror', e => console.log('PAGEERR', user, e.message));
  await pg.goto(BASE); await pg.$eval('#lu', e => e.value = ''); await pg.type('#lu', user); await pg.type('#lp', 'secret123');
  await pg.$eval('#lw', (e, w) => e.value = w, world); await pg.click('#bLogin'); await sleep(1800); return pg;
}
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const port = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const land = { width: 844, height: 390, isMobile: true, hasTouch: true, isLandscape: true, deviceScaleFactor: 2 };
  const small = { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const omar = await page(b, 'Omar', port, 'BEIRUT'); const rami = await page(b, 'Rami', port, 'BEIRUT');
  await omar.evaluate(() => window.__bb.send({ t: 'chat', text: 'Ahla ya Rami! v4 🎉' })); await sleep(800);
  await rami.evaluate(() => window.__bb.send({ t: 'chat', text: 'kifak Omar!' })); await sleep(800);
  await omar.screenshot({ path: OUT + 'v4-mobile-portrait-owner.png' });
  await rami.screenshot({ path: OUT + 'v4-mobile-portrait-friend.png' });
  // real touch: hold right + tap jump at the same time
  await rami.evaluate(() => { const ev = (id, t, pid) => document.getElementById(id).dispatchEvent(new PointerEvent(t, { pointerId: pid, pointerType: 'touch', bubbles: true })); ev('tR', 'pointerdown', 11); ev('tJ', 'pointerdown', 12); });
  await sleep(500); const t = await rami.evaluate(() => ({ ...window.__bb.touch }));
  await rami.evaluate(() => { const ev = (id, t, pid) => document.getElementById(id).dispatchEvent(new PointerEvent(t, { pointerId: pid, pointerType: 'touch', bubbles: true })); ev('tR', 'pointerup', 11); ev('tJ', 'pointerup', 12); });
  console.log('multitouch held', JSON.stringify(t));
  const lea = await page(b, 'Lea', land, 'BEIRUT'); await sleep(600); await lea.screenshot({ path: OUT + 'v4-mobile-landscape.png' });
  await lea.evaluate(() => window.__bb.openModal('inv')); await sleep(300); await lea.screenshot({ path: OUT + 'v4-mobile-landscape-inventory.png' });
  const sm = await page(b, 'Lea', small, 'START'); await sleep(600); await sm.screenshot({ path: OUT + 'v4-mobile-small-phone.png' });
  await sleep(500); await lea.screenshot({ path: OUT + 'v4-mobile-other-device-notice.png' });
  await omar.evaluate(() => window.__bb.openModal('owner')); await sleep(300); await omar.screenshot({ path: OUT + 'v4-mobile-owner-panel.png' });
  await b.close();
})();
