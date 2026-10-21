// Owner + shop + worlds playtest on Pixel 7 landscape. BASE=url OWNER=Omar PASS=secret123 PREFIX=v6-
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:3000', OUT = __dirname + '/../screenshots/', P = process.env.PREFIX || 'v6-';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = [];
const VP = process.env.PORTRAIT ? { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } : { width: 915, height: 412, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: true };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const pg = await b.newPage(); await pg.setViewport(VP); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE); await pg.evaluate(() => { localStorage.bbNoRot = 1; });
  await pg.type('#lu', process.env.OWNER || 'Omar'); await pg.type('#lp', process.env.PASS || 'secret123'); await pg.tap('#bLogin'); await sleep(2500);
  await pg.evaluate(() => { window.__forceDl = 1; });
  const me = await pg.evaluate(() => window.__bb.ME && window.__bb.ME.role); console.log('role', me);
  await pg.tap('#bOwner'); await sleep(500); await pg.screenshot({ path: OUT + P + 'owner-panel.png' });
  await pg.type('#ot', process.env.OWNER || 'Omar'); await pg.type('#oa', '42'); await pg.type('#on', '1');
  const giveBtn = (await pg.$$('#mbody button')).find(async b => true); const clicked = await pg.evaluate(() => { const b = [...document.querySelectorAll('#mbody button')].find(x => x.textContent === 'Give item'); if (b) b.click(); return !!b; }); await sleep(500);
  console.log('give clicked', clicked, 'has crown', await pg.evaluate(() => !!window.__bb.ME.inv[42]));
  await pg.evaluate(() => window.__bb.send({ t: 'equip', item: 42 })); await pg.tap('#close'); await sleep(400);
  await pg.tap('#menu [data-p=shop]'); await sleep(400); await pg.screenshot({ path: OUT + P + 'shop.png' });
  const g0 = await pg.evaluate(() => window.__bb.ME.gems); await pg.evaluate(() => { const b = [...document.querySelectorAll('#mbody button')].find(x => x.textContent === 'Buy'); b && b.click(); }); await sleep(500);
  console.log('shop gems', g0, '->', await pg.evaluate(() => window.__bb.ME.gems)); await pg.tap('#close');
  await pg.tap('#menu [data-p=worlds]'); await sleep(400); await pg.screenshot({ path: OUT + P + 'worlds.png' });
  await pg.tap('#bfarm'); await sleep(1500); console.log('world', await pg.evaluate(() => window.__bb.WORLD.name)); await pg.screenshot({ path: OUT + P + 'farm.png' });
  await pg.tap('#chatToggle'); await sleep(200); await pg.type('#say', 'hello from the phone'); await pg.keyboard.press('Enter'); await sleep(500); await pg.screenshot({ path: OUT + P + 'chat.png' });
  await pg.tap('#bMore'); await sleep(300); await pg.evaluate(() => [...document.querySelectorAll('.moregrid button')].find(x => /Quests/.test(x.textContent)).click()); await sleep(400); await pg.screenshot({ path: OUT + P + 'quests.png' });
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors'); await b.close();
})();
