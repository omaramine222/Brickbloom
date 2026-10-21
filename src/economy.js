'use strict';
// Economy: vending, seal currency, Patch-Up Clinic minigame, Mystery Crates, daily quests, audit log.
const I = require('./items');
const G = require('./game');

// ---------- audit log (append-only JSONL, owner-viewable) ----------
const recent = []; let sink = null;
const setLogSink = f => { sink = f; };
function log(type, data) {
  const e = { t: Date.now(), type, ...data };
  recent.push(e); if (recent.length > 2000) recent.shift();
  if (sink) try { sink(e); } catch {}
  return e;
}
const recentLogs = (n = 100, filter = '') => recent.filter(e => !filter || JSON.stringify(e).toLowerCase().includes(filter.toLowerCase())).slice(-n);

// run fn on users; if it throws or returns ok:false, restore their snapshots (all-or-nothing)
function atomic(users, fn) {
  const snaps = users.map(u => JSON.stringify({ g: u.gems, i: u.inv }));
  let r; try { r = fn(); } catch (e) { r = { ok: false, err: 'error' }; }
  if (!r || !r.ok) users.forEach((u, k) => { const s = JSON.parse(snaps[k]); u.gems = s.g; u.inv = s.i; });
  else users.forEach(u => { if (u.gems < 0 || Object.values(u.inv).some(n => n < 0)) throw new Error('negative balance invariant'); });
  return r;
}

// ---------- seal currency: 100 Keystone = 1 Crown, 100 Crown = 1 Star ----------
const TIERS = [19, 23, 24];
function convertSeal(user, from, dir) {
  const k = TIERS.indexOf(from); if (k < 0) return { ok: false, err: 'notseal' };
  return atomic([user], () => {
    if (dir === 'up') { if (k === 2 || !G.invRemove(user, from, 100)) return { ok: false, err: 'need100' }; if (G.invAdd(user, TIERS[k + 1], 1) !== 1) return { ok: false, err: 'full' }; }
    else if (dir === 'down') { if (k === 0 || !G.invRemove(user, from, 1)) return { ok: false, err: 'noitem' }; if (G.invAdd(user, TIERS[k - 1], 100) !== 100) return { ok: false, err: 'full' }; }
    else return { ok: false, err: 'dir' };
    log('convert', { u: user.username, from, dir }); return { ok: true };
  });
}

// ---------- vending (Barter Box) ----------
function vendAt(w, x, y) { const i = G.idx(w, x, y); return w.vends && w.vends[i] ? { i, v: w.vends[i] } : null; }
function vendStock(w, user, x, y, item, n, price) {
  const f = vendAt(w, x, y); if (!f) return { ok: false, err: 'novend' };
  const v = f.v; if (v.owner !== user.username) return { ok: false, err: 'notyours' };
  n = Math.floor(n); price = Math.floor(price);
  if (!I.validItem(item) || !(n > 0) || !(price >= 1 && price <= 1e6)) return { ok: false, err: 'bad' };
  if (v.stock && v.item !== item) return { ok: false, err: 'emptyfirst' };
  return atomic([user], () => {
    if (!G.invRemove(user, item, n)) return { ok: false, err: 'noitem' };
    if (v.stock + n > 1000) return { ok: false, err: 'toomuch' };
    v.item = item; v.stock += n; v.price = price;
    log('vend_stock', { u: user.username, item, n, price, w: w.name }); return { ok: true, vend: v };
  });
}
function vendBuy(w, buyer, x, y, qty, expectPrice) {
  const f = vendAt(w, x, y); if (!f) return { ok: false, err: 'novend' };
  const v = f.v; qty = Math.floor(qty);
  if (v.owner === buyer.username) return { ok: false, err: 'own' };
  if (!(qty > 0) || qty > v.stock) return { ok: false, err: 'stock' };
  if (expectPrice !== undefined && expectPrice !== v.price) return { ok: false, err: 'pricechanged' }; // anti bait-and-switch
  const cost = qty * v.price;
  return atomic([buyer], () => {
    if (buyer.gems < cost) return { ok: false, err: 'gems' };
    if (G.invAdd(buyer, v.item, qty) !== qty) return { ok: false, err: 'full' };
    buyer.gems -= cost; v.stock -= qty; v.earnings += cost;
    log('vend_buy', { u: buyer.username, seller: v.owner, item: v.item, qty, cost, w: w.name }); return { ok: true, item: v.item, qty, cost };
  });
}
function vendCollect(w, user, x, y) {
  const f = vendAt(w, x, y); if (!f || f.v.owner !== user.username) return { ok: false, err: 'notyours' };
  const g = f.v.earnings; f.v.earnings = 0; user.gems += g;
  log('vend_collect', { u: user.username, gems: g, w: w.name }); return { ok: true, gems: g };
}

// ---------- Patch-Up Clinic (original surgery-style minigame) ----------
// Each symptom has exactly one correct tool. Learn the chart to profit.
const TOOLS = ['scanner', 'numbspray', 'stitcher', 'splint', 'salve', 'wrap'];
const SYMPTOMS = { 'hidden bruise': 'scanner', 'sharp pain': 'numbspray', 'open gash': 'stitcher', 'wobbly bone': 'splint', 'hot rash': 'salve', 'loose dressing': 'wrap' };
const AILMENTS = ['Sprocket Sprain', 'Bramble Burn', 'Pebble Knee', 'Glimmer Fever'];
function clinicStart(user, rnd = Math.random) {
  if (user.clinic) return { ok: false, err: 'busy' };
  if (!G.invRemove(user, 26, 1)) return { ok: false, err: 'needkit' };
  const keys = Object.keys(SYMPTOMS), len = 4 + Math.floor(rnd() * 3), steps = [];
  for (let k = 0; k < len; k++) steps.push(keys[Math.floor(rnd() * keys.length)]);
  user.clinic = { ailment: AILMENTS[Math.floor(rnd() * AILMENTS.length)], steps, at: 0, mistakes: 0 };
  log('clinic_start', { u: user.username });
  return { ok: true, state: clinicView(user) };
}
const clinicView = u => u.clinic && { ailment: u.clinic.ailment, step: u.clinic.at + 1, of: u.clinic.steps.length, symptom: u.clinic.steps[u.clinic.at], mistakes: u.clinic.mistakes, tools: TOOLS };
function clinicUse(user, tool, rnd = Math.random) {
  const c = user.clinic; if (!c) return { ok: false, err: 'nopatient' };
  if (!TOOLS.includes(tool)) return { ok: false, err: 'badtool' };
  if (SYMPTOMS[c.steps[c.at]] === tool) {
    c.at++;
    if (c.at >= c.steps.length) {
      const gems = 20 + c.steps.length * 10 - c.mistakes * 15; user.gems += gems;
      const bonus = rnd() < 0.2 ? 22 + I.SEED_OFFSET : null; if (bonus) G.invAdd(user, bonus, 1);
      delete user.clinic; log('clinic_win', { u: user.username, gems });
      return { ok: true, done: true, success: true, gems, bonus };
    }
    return { ok: true, correct: true, state: clinicView(user) };
  }
  c.mistakes++;
  if (c.mistakes >= 2) { delete user.clinic; log('clinic_fail', { u: user.username }); return { ok: true, done: true, success: false }; }
  return { ok: true, correct: false, state: clinicView(user) };
}

// ---------- Mystery Crate (gems only, rates public) ----------
const CRATE_TABLE = [ // [weight%, item, count] — weights sum to 100
  [40, 'gems', 60], [25, 1007, 3], [15, 15, 3], [10, 22, 5], [6, 25, 1], [3, 19, 1], [1, 23, 1],
];
function openCrate(user, rnd = Math.random) {
  return atomic([user], () => {
    if (!G.invRemove(user, 27, 1)) return { ok: false, err: 'nocrate' };
    let r = rnd() * 100, pick = CRATE_TABLE[CRATE_TABLE.length - 1];
    for (const e of CRATE_TABLE) { if ((r -= e[0]) < 0) { pick = e; break; } }
    const [, item, n] = pick;
    if (item === 'gems') user.gems += n; else if (G.invAdd(user, item, n) !== n) return { ok: false, err: 'full' };
    log('crate', { u: user.username, item, n }); return { ok: true, item, n };
  });
}
const crateRates = () => CRATE_TABLE.map(([p, item, n]) => ({ chance: p + '%', item: item === 'gems' ? 'Gems' : I.itemName(item), count: n }));

// ---------- daily quests ----------
const QUEST_POOL = [
  { id: 'break50', ev: 'break', goal: 50, gems: 40, text: 'Break 50 blocks' },
  { id: 'place30', ev: 'place', goal: 30, gems: 30, text: 'Place 30 blocks' },
  { id: 'harvest5', ev: 'harvest', goal: 5, gems: 50, text: 'Harvest 5 trees' },
  { id: 'splice1', ev: 'splice', goal: 1, gems: 25, text: 'Splice a new seed' },
  { id: 'clinic1', ev: 'clinic_win', goal: 1, gems: 60, text: 'Heal a patient at the Patch-Up Clinic' },
  { id: 'trade1', ev: 'trade', goal: 1, gems: 30, text: 'Complete a trade' },
  { id: 'gems100', ev: 'gems', goal: 100, gems: 50, text: 'Collect 100 gems' },
];
const day = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
function quests(user, now = Date.now()) {
  const d = day(now);
  if (!user.quests || user.quests.day !== d) {
    let h = 0; for (const c of user.username + d) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pool = QUEST_POOL.slice(), list = [];
    for (let k = 0; k < 3; k++) { const q = pool.splice(h % pool.length, 1)[0]; h = Math.floor(h / 7) + 13; list.push({ id: q.id, p: 0, claimed: false }); }
    user.quests = { day: d, list };
  }
  return user.quests.list.map(q => { const def = QUEST_POOL.find(x => x.id === q.id); return { ...q, goal: def.goal, gems: def.gems, text: def.text }; });
}
function questEvent(user, ev, n = 1, now) {
  quests(user, now); if (module.exports.legendEvent) module.exports.legendEvent(user, ev, n);
  for (const q of user.quests.list) { const def = QUEST_POOL.find(x => x.id === q.id); if (def.ev === ev) q.p = Math.min(def.goal, q.p + n); }
}
function claimQuest(user, id, now) {
  quests(user, now);
  const q = user.quests.list.find(x => x.id === id), def = QUEST_POOL.find(x => x.id === id);
  if (!q || q.claimed || q.p < def.goal) return { ok: false, err: 'notdone' };
  q.claimed = true; user.gems += def.gems; log('quest', { u: user.username, id, gems: def.gems });
  return { ok: true, gems: def.gems };
}

module.exports = { setLogSink, log, recentLogs, atomic, convertSeal, vendStock, vendBuy, vendCollect, vendAt, clinicStart, clinicUse, clinicView,
  SYMPTOMS, TOOLS, openCrate, crateRates, CRATE_TABLE, quests, questEvent, claimQuest, TIERS };

// ---------- XP & levels ----------
const XP = { break: 2, place: 1, harvest: 10, splice: 15, clinic_win: 40, trade: 5, quest: 25, carnival: 5 };
const levelFor = xp => Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
function addXp(user, ev, mult = 1) { const before = levelFor(user.xp); user.xp = (user.xp || 0) + (XP[ev] || 0) * mult; const after = levelFor(user.xp); return after > before ? after : 0; }

// ---------- market prices (owner adjustable, default = base value) ----------
const market = {}; let onMarket = null;
const onMarketChange = f => { onMarket = f; }; // id -> price override
const priceOf = id => market[id] !== undefined ? market[id] : (I.ITEMS[I.blockOf(id)] || {}).value || 0;
function setMarketPrice(actor, id, price) {
  if (!G.hasRole(actor, 'owner')) return { ok: false, err: 'perm' };
  price = Math.floor(price); if (!I.validItem(id) || !(price >= 0 && price <= 1e8)) return { ok: false, err: 'bad' };
  market[id] = price; if (onMarket) onMarket(market); log('market_price', { u: actor.username, id, price }); return { ok: true };
}

// ---------- Carnival event ----------
// Scheduled: Fri & Sat 18:00-20:00 UTC (20:00-22:00 Beirut winter). Owner can force on/off.
const carnival = { forced: null };
function carnivalActive(now = Date.now()) {
  if (carnival.forced !== null) return carnival.forced;
  const d = new Date(now), wd = d.getUTCDay(), h = d.getUTCHours();
  return (wd === 5 || wd === 6) && h >= 18 && h < 20;
}
function setCarnival(actor, on) { if (!G.hasRole(actor, 'owner')) return { ok: false, err: 'perm' }; carnival.forced = on === null ? null : !!on; log('carnival', { u: actor.username, on }); return { ok: true }; }
const legendaries = Object.keys(I.ITEMS).map(Number).filter(id => I.ITEMS[id].rarity === 'legendary' && I.ITEMS[id].gen);
const WHEEL = [[55, 'gems', 15], [25, 'common', 3], [12, 'uncommon', 2], [6, 'rare', 1], [1.5, 'epic', 1], [0.5, 'legendary', 1]];
const WHEEL_COST = 25;
function spinWheel(user, now = Date.now(), rnd = Math.random) {
  if (!carnivalActive(now)) return { ok: false, err: 'closed' };
  return atomic([user], () => {
    if (user.gems < WHEEL_COST) return { ok: false, err: 'gems' };
    user.gems -= WHEEL_COST;
    let r = rnd() * 100, pick = WHEEL[0];
    for (const e of WHEEL) { if ((r -= e[0]) < 0) { pick = e; break; } }
    const [, kind, n] = pick; let item = 'gems';
    if (kind === 'gems') user.gems += n;
    else {
      const pool = kind === 'legendary' ? legendaries : Object.keys(I.ITEMS).map(Number).filter(id => I.ITEMS[id].rarity === kind && I.ITEMS[id].gen);
      item = pool[Math.floor(rnd() * pool.length)];
      if (G.invAdd(user, item, n) !== n) return { ok: false, err: 'full' };
    }
    log('carnival_spin', { u: user.username, kind, item, n }); return { ok: true, kind, item, n };
  });
}
const wheelRates = () => WHEEL.map(([p, k, n]) => ({ chance: p + '%', prize: k === 'gems' ? n + ' gems' : n + ' random ' + k + ' item' }));
Object.assign(module.exports, { onMarketChange, addXp, levelFor, priceOf, setMarketPrice, market, carnivalActive, setCarnival, carnival, spinWheel, wheelRates, WHEEL_COST });

// ---------- Mythic Path: legendary quest chain + quiz ----------
const LEGEND_STAGES = [
  { ev: 'harvest', goal: 20, text: 'Harvest 20 grown trees' },
  { ev: 'clinic_win', goal: 3, text: 'Heal 3 patients at the Patch-Up Clinic' },
  { ev: 'parkour', goal: 1, text: 'Finish any parkour course (RUN worlds)' },
  { ev: 'gems', goal: 500, text: 'Collect 500 gems from the ground' },
  { ev: 'quiz', goal: 1, text: 'Pass the Brickbloom Quiz (4 of 5 right)' },
];
const QUIZ = [
  ['How many Keystone Seals make one Crown Seal?', ['10', '50', '100', '1000'], 2],
  ['Which tool treats an "open gash"?', ['salve', 'stitcher', 'wrap', 'scanner'], 1],
  ['What do you splice to make Dune Brick seeds?', ['Loam + Slatestone', 'Loam + Magma Pool', 'Slatestone + Magma Pool', 'Fuzzmoss + Loam'], 0],
  ['What happens if you touch Magma Pool?', ['You gain gems', 'You fly', 'You go back to spawn/checkpoint', 'Nothing'], 2],
  ['What can a moderator NOT do?', ['Kick', 'Mute', 'Give items', 'Teleport'], 2],
  ['Which block gives bonus gems when broken?', ['Gemrock', 'Puffcloud', 'Clearpane', 'Loam'], 0],
  ['How many mistakes end a Clinic operation?', ['1', '2', '3', '5'], 1],
  ['What does a Barter Box do?', ['Seals a world', 'Sells items for gems', 'Grows trees', 'Teleports you'], 1],
  ['What is needed to seal a world?', ['A Keystone Seal', 'A Mender Kit', 'A Bounce Pad', '100 gems'], 0],
  ['Which item makes you jump extra high?', ['Cloud Puff', 'Bounce Pad', 'Glowjar', 'Sunpetal'], 1],
  ['When is the Lantern Carnival scheduled?', ['Every morning', 'Fri & Sat evenings (UTC)', 'Never', 'Mondays'], 1],
  ['What resets every day?', ['Your inventory', 'Daily quests', 'Your level', 'World seals'], 1],
];
const legendLevel = u => 5 + 5 * ((u.legend && u.legend.done) || 0);
function legendView(u) {
  const L = u.legend || { stage: -1, p: 0, done: 0 };
  return { level: levelFor(u.xp), need: legendLevel(u), stage: L.stage, p: L.p, done: L.done || 0, stages: LEGEND_STAGES.map(s => ({ text: s.text, goal: s.goal })), quiz: L.quiz ? L.quiz.qs.map(k => ({ q: QUIZ[k][0], a: QUIZ[k][1] })) : null, cooldown: Math.max(0, (L.quizCooldown || 0) - Date.now()) };
}
function legendStart(u) {
  if (levelFor(u.xp) < legendLevel(u)) return { ok: false, err: 'level' };
  if (u.legend && u.legend.stage >= 0) return { ok: false, err: 'active' };
  u.legend = { stage: 0, p: 0, done: (u.legend && u.legend.done) || 0 }; log('legend_start', { u: u.username }); return { ok: true };
}
function legendEvent(u, ev, n = 1) {
  const L = u.legend; if (!L || L.stage < 0) return false;
  const st = LEGEND_STAGES[L.stage]; if (st.ev !== ev) return false;
  L.p = Math.min(st.goal, L.p + n);
  if (L.p >= st.goal && st.ev !== 'quiz') { L.stage++; L.p = 0; return true; }
  return false;
}
function quizStart(u, rnd = Math.random) {
  const L = u.legend; if (!L || LEGEND_STAGES[L.stage]?.ev !== 'quiz') return { ok: false, err: 'notyet' };
  if ((L.quizCooldown || 0) > Date.now()) return { ok: false, err: 'cooldown' };
  const pool = QUIZ.map((_, k) => k), qs = []; while (qs.length < 5) qs.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  L.quiz = { qs }; return { ok: true };
}
function quizAnswer(u, answers, rnd = Math.random) {
  const L = u.legend; if (!L || !L.quiz || !Array.isArray(answers) || answers.length !== 5) return { ok: false, err: 'noquiz' };
  const right = L.quiz.qs.filter((k, i) => answers[i] === QUIZ[k][2]).length; delete L.quiz;
  if (right < 4) { L.quizCooldown = Date.now() + 10 * 60000; log('quiz_fail', { u: u.username, right }); return { ok: true, passed: false, right }; }
  return atomic([u], () => {
    const item = legendaries[Math.floor(rnd() * legendaries.length)];
    if (G.invAdd(u, item, 1) !== 1) return { ok: false, err: 'full' };
    L.stage = -1; L.p = 0; L.done = (L.done || 0) + 1; u.title = 'Mythic';
    log('legend_win', { u: u.username, item }); return { ok: true, passed: true, right, item };
  });
}
Object.assign(module.exports, { LEGEND_STAGES, QUIZ, legendView, legendStart, legendEvent, quizStart, quizAnswer, legendLevel });

// ---------- more carnival games ----------
// Lantern Shuffle: pick 1 of 3 lanterns. Win = 40 gems (+3% rare item). Cost 15.
const SHUFFLE_COST = 15;
function lanternShuffle(user, pick, now = Date.now(), rnd = Math.random) {
  if (!carnivalActive(now)) return { ok: false, err: 'closed' };
  if (![0, 1, 2].includes(pick)) return { ok: false, err: 'bad' };
  return atomic([user], () => {
    if (user.gems < SHUFFLE_COST) return { ok: false, err: 'gems' };
    user.gems -= SHUFFLE_COST; const star = Math.floor(rnd() * 3), win = star === pick; let item = null;
    if (win) { user.gems += 40; if (rnd() < 0.03) { const pool = Object.keys(I.ITEMS).map(Number).filter(id => I.ITEMS[id].rarity === 'rare' && I.ITEMS[id].gen); item = pool[Math.floor(rnd() * pool.length)]; G.invAdd(user, item, 1); } }
    log('carnival_shuffle', { u: user.username, win, item }); return { ok: true, win, star, item };
  });
}
// Higher or Lower: server-held card streak. Cost 10 to start; cash out = 10 * 2^streak (max 5 -> legendary roll 10%).
const HL_COST = 10;
function hlStart(user, now = Date.now(), rnd = Math.random) {
  if (!carnivalActive(now)) return { ok: false, err: 'closed' };
  if (user.hl) return { ok: false, err: 'active' };
  if (user.gems < HL_COST) return { ok: false, err: 'gems' };
  user.gems -= HL_COST; user.hl = { card: 1 + Math.floor(rnd() * 13), streak: 0 }; log('carnival_hl_start', { u: user.username });
  return { ok: true, card: user.hl.card };
}
function hlGuess(user, dir, rnd = Math.random) {
  const h = user.hl; if (!h) return { ok: false, err: 'nogame' };
  if (dir === 'cash') {
    delete user.hl; if (!h.streak) return { ok: true, cashed: 0 };
    const gems = HL_COST * Math.pow(2, h.streak); user.gems += gems; let item = null;
    if (h.streak >= 5 && rnd() < 0.1) { item = legendaries[Math.floor(rnd() * legendaries.length)]; G.invAdd(user, item, 1); }
    log('carnival_hl_cash', { u: user.username, streak: h.streak, gems, item }); return { ok: true, cashed: gems, item };
  }
  if (dir !== 'hi' && dir !== 'lo') return { ok: false, err: 'bad' };
  let next; do { next = 1 + Math.floor(rnd() * 13); } while (next === h.card);
  const right = dir === 'hi' ? next > h.card : next < h.card;
  if (!right) { delete user.hl; log('carnival_hl_lose', { u: user.username, streak: h.streak }); return { ok: true, right: false, next }; }
  h.card = next; h.streak++;
  if (h.streak >= 5) return hlGuess(user, 'cash', rnd);
  return { ok: true, right: true, next, streak: h.streak };
}
Object.assign(module.exports, { lanternShuffle, SHUFFLE_COST, hlStart, hlGuess, HL_COST });
