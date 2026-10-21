// Brickbloom — original item definitions. All names/art are original.
'use strict';
const SEED_OFFSET = 1000;
// kind: 'fg' solid block, 'bg' background wall, 'door', 'lock', 'deco' (non-solid fg)
// hard = hits to break (0 = unbreakable), tier controls tree grow time and rarity
const ITEMS = {
  1:  { name: 'Loam',          kind: 'fg', hard: 3, tier: 1, color: '#8a5a33' },
  2:  { name: 'Slatestone',    kind: 'fg', hard: 5, tier: 1, color: '#7b7f8c' },
  3:  { name: 'Magma Pool',    kind: 'fg', hard: 4, tier: 2, color: '#ff5a1f', hazard: true },
  4:  { name: 'Corebed',       kind: 'fg', hard: 0, tier: 9, color: '#2b2433' },
  5:  { name: 'Spawn Gate',    kind: 'door', hard: 0, tier: 9, color: '#3fc1ff' },
  6:  { name: 'Loam Backdrop', kind: 'bg', hard: 2, tier: 1, color: '#4a2f1c' },
  7:  { name: 'Dune Brick',    kind: 'fg', hard: 4, tier: 2, color: '#e3c27a' },
  8:  { name: 'Kiln Tile',     kind: 'fg', hard: 4, tier: 2, color: '#c0573e' },
  9:  { name: 'Clearpane',     kind: 'fg', hard: 2, tier: 3, color: '#bfe9ff', clear: true },
  10: { name: 'Fuzzmoss',      kind: 'fg', hard: 3, tier: 3, color: '#4fa64a' },
  11: { name: 'Cedar Slab',    kind: 'fg', hard: 4, tier: 3, color: '#b07a3e' },
  12: { name: 'Rustvein',      kind: 'fg', hard: 6, tier: 3, color: '#c9782f' },
  13: { name: 'Shardcore',     kind: 'fg', hard: 6, tier: 4, color: '#b46cff' },
  14: { name: 'Puffcloud',     kind: 'deco', hard: 1, tier: 4, color: '#f4f7ff' },
  15: { name: 'Glowjar',       kind: 'deco', hard: 2, tier: 4, color: '#ffe066', light: true },
  16: { name: 'Sunpetal',      kind: 'deco', hard: 1, tier: 4, color: '#ff7ab8' },
  17: { name: 'Cinder Block',  kind: 'fg', hard: 7, tier: 4, color: '#5a1e1e' },
  18: { name: 'Rimefrost',     kind: 'fg', hard: 5, tier: 5, color: '#9fe8ff' },
  19: { name: 'Keystone Seal', kind: 'lock', hard: 10, tier: 9, color: '#ffd23f', noSeed: true },
  20: { name: 'Slate Backdrop',kind: 'bg', hard: 3, tier: 2, color: '#3d4150' },
  21: { name: 'Cedar Backdrop',kind: 'bg', hard: 3, tier: 3, color: '#6b4826' },
  22: { name: 'Gemrock',       kind: 'fg', hard: 6, tier: 3, color: '#3fe0b0', gemBonus: [5, 15] },
  23: { name: 'Crown Seal',    kind: 'lock', hard: 10, tier: 9, color: '#ff9f1c', noSeed: true, value: 100 },
  24: { name: 'Star Seal',     kind: 'lock', hard: 10, tier: 9, color: '#e0f0ff', noSeed: true, value: 10000 },
  25: { name: 'Barter Box',    kind: 'vend', hard: 4, tier: 9, color: '#2f9e44', noSeed: true },
  26: { name: 'Mender Kit',    kind: 'tool', hard: 0, tier: 9, color: '#ff4d6d', noSeed: true },
  28: { name: 'Checkpoint Flag', kind: 'deco', hard: 0, tier: 9, color: '#4dabf7', noSeed: true },
  29: { name: 'Finish Arch',   kind: 'deco', hard: 0, tier: 9, color: '#ffd43b', noSeed: true },
  30: { name: 'Bounce Pad',    kind: 'fg', hard: 3, tier: 3, color: '#ff66d4', bounce: true },
  // cosmetics (slot: hat / shirt / aura)
  40: { name: 'Fez of Firsts',     kind: 'skin', slot: 'hat', hard: 0, tier: 2, color: '#c92a2a', noSeed: true },
  41: { name: 'Leafy Beanie',      kind: 'skin', slot: 'hat', hard: 0, tier: 2, color: '#2f9e44', noSeed: true },
  42: { name: 'Comet Crown',       kind: 'skin', slot: 'hat', hard: 0, tier: 4, color: '#ffd43b', noSeed: true },
  43: { name: 'Pixel Shades',      kind: 'skin', slot: 'hat', hard: 0, tier: 3, color: '#111111', noSeed: true },
  44: { name: 'Cedar Hoodie',      kind: 'skin', slot: 'shirt', hard: 0, tier: 2, color: '#a0522d', noSeed: true },
  45: { name: 'Neon Jacket',       kind: 'skin', slot: 'shirt', hard: 0, tier: 3, color: '#20c997', noSeed: true },
  46: { name: 'Starweave Robe',    kind: 'skin', slot: 'shirt', hard: 0, tier: 4, color: '#5f3dc4', noSeed: true },
  47: { name: 'Ember Aura',        kind: 'skin', slot: 'aura', hard: 0, tier: 4, color: '#ff6b00', noSeed: true },
  48: { name: 'Frostlight Aura',   kind: 'skin', slot: 'aura', hard: 0, tier: 5, color: '#74c0fc', noSeed: true },
  49: { name: 'Runner Sash',       kind: 'skin', slot: 'shirt', hard: 0, tier: 4, color: '#f76707', noSeed: true },
  27: { name: 'Mystery Crate', kind: 'tool', hard: 0, tier: 9, color: '#9b5de5', noSeed: true },
};
// seed + seed => new seed (order-insensitive)
const RECIPES = [
  [1, 2, 7], [1, 3, 8], [7, 3, 9], [1, 8, 10], [10, 6, 11], [2, 3, 12],
  [12, 9, 13], [9, 10, 14], [13, 3, 15], [10, 14, 16], [8, 2, 17], [13, 14, 18],
  [6, 2, 20], [11, 6, 21], [12, 13, 22],
];
// ---------- procedurally generated catalogue (all original names) ----------
const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const MATERIALS = [ // [name, color, tier 1..5]
  ['Coral', '#ff7f6e', 1], ['Basalt', '#3b3b45', 1], ['Pinewood', '#9c6b3c', 1], ['Chalk', '#efeadf', 1],
  ['Saffron', '#f4b400', 2], ['Jade', '#3dbb7e', 2], ['Cobalt', '#2f5fd0', 2], ['Rosequartz', '#f5a3c7', 2],
  ['Obsidian', '#1b1024', 3], ['Amberglass', '#ffb347', 3], ['Thornvine', '#2e6b2e', 3], ['Seaglass', '#7fe3d4', 3],
  ['Nebula', '#6a4cff', 4], ['Sunforge', '#ff6b00', 4], ['Moonsilk', '#d8e2ff', 4],
  ['Aurora', '#66ffcc', 5], ['Voidheart', '#0b0014', 5], ['Phoenixfire', '#ff2e2e', 5],
];
const FORMS = [ // [name, kind, hardAdd]
  ['Block', 'fg', 0], ['Brick', 'fg', 1], ['Tile', 'fg', 0], ['Backdrop', 'bg', -1], ['Pillar', 'fg', 1],
  ['Lantern', 'deco', -2], ['Banner', 'deco', -2], ['Crystal', 'deco', 0], ['Mosaic', 'fg', 1],
];
let nextId = 100;
for (const [m, color, tier] of MATERIALS) for (const [f, kind, ha] of FORMS) {
  ITEMS[nextId++] = { name: m + ' ' + f, kind, hard: Math.max(1, 2 + tier + ha), tier, color, form: f.toLowerCase(), light: f === 'Lantern', gen: true };
}
// rarity + base value for every item
for (const [id, it] of Object.entries(ITEMS)) {
  const t = it.tier >= 9 ? 3 : it.tier;
  it.rarity = it.rarity || RARITY[Math.max(0, Math.min(4, t - 1))];
  it.value = it.value || Math.round(5 * Math.pow(3.2, RARITY.indexOf(it.rarity)) * (it.kind === 'deco' ? 1.5 : 1));
}
ITEMS[19].value = 200; ITEMS[23].value = 20000; ITEMS[24].value = 2000000;
// generated recipes: every generated non-legendary item gets a unique seed pair from base seeds
(() => {
  const base = Object.keys(ITEMS).map(Number).filter(id => id < 100 && !ITEMS[id].noSeed && ITEMS[id].hard > 0);
  const used = new Set(RECIPES.map(([a, b]) => Math.min(a, b) + ':' + Math.max(a, b)));
  const pairs = []; for (let a = 0; a < base.length; a++) for (let b = a + 1; b < base.length; b++) { const k = base[a] + ':' + base[b]; if (!used.has(k)) pairs.push([base[a], base[b]]); }
  let p = 0;
  for (const id of Object.keys(ITEMS).map(Number)) if (ITEMS[id].gen && ITEMS[id].rarity !== 'legendary' && p < pairs.length) RECIPES.push([...pairs[p++], id]);
})();
const SHOP = {
  starter:  { name: 'Builder Bundle', price: 50,  give: [[7, 10], [8, 10], [9, 5]] },
  seeds:    { name: 'Seed Sack',      price: 30,  give: 'randomSeeds' },
  keystone: { name: 'Keystone Seal',  price: 200, give: [[19, 1]] },
  barter:   { name: 'Barter Box',     price: 150, give: [[25, 1]] },
  mender:   { name: 'Mender Kit x3',  price: 60,  give: [[26, 3]] },
  crate:    { name: 'Mystery Crate',  price: 100, give: [[27, 1]] },
  style:    { name: 'Style Pack',     price: 250, give: 'randomSkin' },
  glow:     { name: 'Glow Kit',       price: 120, give: [[15, 5], [16, 5]] },
};
const GEM_DROP = 9000; // pseudo-item for gems lying on the ground
const isSeed = id => id > SEED_OFFSET && !!ITEMS[id - SEED_OFFSET] && !ITEMS[id - SEED_OFFSET].noSeed;
const blockOf = id => isSeed(id) ? id - SEED_OFFSET : id;
const itemName = id => isSeed(id) ? ITEMS[id - SEED_OFFSET].name + ' Seed' : (ITEMS[id] ? ITEMS[id].name : '?');
const validItem = id => Number.isInteger(id) && (!!ITEMS[id] || isSeed(id));
const growMs = blockId => 30000 * (ITEMS[blockId] ? Math.min(ITEMS[blockId].tier, 5) : 1);
function recipe(a, b) {
  a = blockOf(a); b = blockOf(b);
  for (const [x, y, r] of RECIPES) if ((x === a && y === b) || (x === b && y === a)) return r + SEED_OFFSET;
  return null;
}
module.exports = { RARITY, GEM_DROP, ITEMS, RECIPES, SHOP, SEED_OFFSET, isSeed, blockOf, itemName, validItem, growMs, recipe };
