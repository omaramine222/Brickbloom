'use strict';
// Brickbloom original procedural art (v5). Everything here is drawn by code — no external or copied assets.
(() => {
const S = 32; // texture resolution
function rng(s) { return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function sh(hex, f) { const [r, g, b] = rgb(hex); const m = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return `rgb(${m(r)},${m(g)},${m(b)})`; }
const OUT = '#2a1d3d';
const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); return [c, g]; };
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
// base block: shaded, textured, beveled, outlined
function block(g, col, seed, opt = {}) {
  const r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, sh(col, 0.08)); grd.addColorStop(1, sh(col, -0.16));
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const n = opt.noise ?? 34;
  for (let k = 0; k < n; k++) { const x = r() * 28 + 2 | 0, y = r() * 28 + 2 | 0, s = r() < 0.3 ? 3 : 2; px(g, x, y, s, s, r() < 0.55 ? sh(col, -0.22) : sh(col, 0.18)); }
  bevel(g, col);
}
function bevel(g, col, a = 1) {
  g.globalAlpha = a;
  px(g, 2, 2, S - 4, 2, sh(col, 0.38)); px(g, 2, 2, 2, S - 4, sh(col, 0.25));
  px(g, 2, S - 4, S - 4, 2, sh(col, -0.35)); px(g, S - 4, 2, 2, S - 4, sh(col, -0.28));
  px(g, 4, 4, 3, 2, '#ffffff88'); px(g, 4, 4, 2, 3, '#ffffff66');
  g.globalAlpha = 1;
  g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
}
function gem(g, cx, cy, s, col) {
  g.fillStyle = OUT; g.beginPath(); g.moveTo(cx - s - 1.5, cy - s * .35); g.lineTo(cx - s * .5, cy - s - 1.5); g.lineTo(cx + s * .5, cy - s - 1.5); g.lineTo(cx + s + 1.5, cy - s * .35); g.lineTo(cx, cy + s + 2); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(cx - s, cy - s * .35); g.lineTo(cx - s * .5, cy - s); g.lineTo(cx + s * .5, cy - s); g.lineTo(cx + s, cy - s * .35); g.lineTo(cx, cy + s); g.fill();
  g.fillStyle = sh(col, 0.55); g.beginPath(); g.moveTo(cx - s, cy - s * .35); g.lineTo(cx - s * .5, cy - s); g.lineTo(cx, cy - s * .35); g.fill();
  g.fillStyle = sh(col, -0.3); g.beginPath(); g.moveTo(cx, cy - s * .35); g.lineTo(cx + s, cy - s * .35); g.lineTo(cx, cy + s); g.fill();
  g.fillStyle = '#fff'; g.fillRect(cx - s * .55, cy - s * .55, 2, 2);
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function outlined(g, draw, fill, lw = 2.5) { draw(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); g.fillStyle = fill; g.fill(); }

function tex(id, INFO, v = 0) {
  const [c, g] = mk(); const it = INFO.items[id]; const off = INFO.seedOffset;
  if (id == INFO.gemDrop) { gem(g, 16, 16, 11, '#3fe0b0'); return c; }
  if (id >= off && id < 9000) { // seed: plump bean in the parent's colour
    const b = INFO.items[id - off]; const col = b ? b.color : '#8a5a33';
    outlined(g, () => { g.beginPath(); g.ellipse(16, 18, 9, 11, 0.35, 0, 7); }, col);
    g.fillStyle = sh(col, -0.3); g.beginPath(); g.ellipse(18, 21, 5, 7, 0.35, 0, 7); g.fill();
    g.fillStyle = sh(col, 0.5); g.beginPath(); g.ellipse(13, 13, 2.5, 4, 0.35, 0, 7); g.fill();
    g.strokeStyle = sh(col, -0.45); g.lineWidth = 1.5; g.beginPath(); g.moveTo(12, 10); g.quadraticCurveTo(19, 18, 19, 27); g.stroke();
    return c;
  }
  if (!it) return c;
  const col = it.color, r = rng(id * 7919 + 3 + v * 104729);
  const form = it.form || ({ 7: 'brick', 8: 'tile', 11: 'plank', 17: 'brick' })[id] || it.kind;
  if (it.kind === 'skin') return skinIcon(g, c, it, id);
  switch (id) {
    case 1: { // loam (dirt)
      px(g, 0, 0, S, S, '#8d5c35');
      for (let k = 0; k < 8; k++) { const x = (r() * 26 + 3) | 0, y = (r() * 26 + 3) | 0, w = 2 + (r() * 2 | 0); px(g, x, y, w, 2, r() < .6 ? '#74482a' : '#a06c3e'); }
      if (r() < 0.6) { const x = (r() * 22 + 5) | 0, y = (r() * 22 + 5) | 0; px(g, x, y, 3, 2, '#a59d93'); px(g, x, y + 2, 3, 1, '#6e665e'); }
      return c; }
    case 2: case 4: { // slatestone / corebed: cobble rocks
      const base = id === 4 ? '#2b2433' : '#7b7f8c'; px(g, 0, 0, S, S, sh(base, -0.35));
      const rocks = [[8, 8, 7, 6], [22, 7, 8, 6], [7, 22, 7, 7], [21, 22, 9, 7], [15, 15, 5, 4]];
      for (const [x, y, w, h] of rocks) { g.fillStyle = sh(base, (r() - .5) * .2); g.beginPath(); g.ellipse(x, y, w, h, r(), 0, 7); g.fill(); g.fillStyle = sh(base, .3); g.beginPath(); g.ellipse(x - 2, y - 2, w * .45, h * .35, 0, 0, 7); g.fill(); }
      if (id === 4) for (let k = 0; k < 5; k++) px(g, r() * 26 + 3, r() * 26 + 3, 2, 2, '#ff5a1f');
      return c; }
    case 3: { // magma
      const grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, '#ffd43b'); grd.addColorStop(.4, '#ff8a1f'); grd.addColorStop(1, '#d9480f'); g.fillStyle = grd; g.fillRect(0, 0, S, S);
      for (let k = 0; k < 7; k++) { g.fillStyle = r() < .5 ? '#fff3bf' : '#ffa94d'; g.beginPath(); g.arc(r() * S, r() * S, 1.5 + r() * 3, 0, 7); g.fill(); }
      g.fillStyle = '#c92a2a66'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(r() * S, r() * S, 5, 2, 0, 0, 7); g.fill(); } return c; }
    case 5: { // spawn gate
      px(g, 0, 0, S, S, '#00000000'); outlined(g, () => rr(g, 5, 2, 22, 29, [11, 11, 2, 2]), '#6b4826');
      const gg = g.createLinearGradient(0, 4, 0, 30); gg.addColorStop(0, '#a5f3ff'); gg.addColorStop(1, '#3fc1ff'); g.fillStyle = gg; rr(g, 9, 6, 14, 24, [7, 7, 0, 0]); g.fill();
      g.fillStyle = '#ffffffaa'; g.beginPath(); g.arc(16, 15, 4, 0, 7); g.fill(); px(g, 11, 9, 2, 6, '#fff'); return c; }
    case 9: { g.fillStyle = '#bfe9ff44'; g.fillRect(0, 0, S, S); g.strokeStyle = '#e7f8ff'; g.lineWidth = 2; g.strokeRect(2, 2, S - 4, S - 4); g.fillStyle = '#ffffffcc'; g.save(); g.translate(16, 16); g.rotate(-.7); g.fillRect(-12, -6, 24, 3); g.fillRect(-8, 2, 16, 2); g.restore(); g.strokeStyle = '#7fb8d4'; g.lineWidth = 1; g.strokeRect(1, 1, S - 2, S - 2); return c; }
    case 10: { px(g, 0, 0, S, S, '#4fa64a'); for (let k = 0; k < 18; k++) { const x = r() * 26 + 3, y = r() * 26 + 3; g.fillStyle = r() < .5 ? '#7bd36b' : '#2f7a2b'; g.beginPath(); g.arc(x, y, 2 + r() * 2, 0, 7); g.fill(); } return c; }
    case 12: case 22: case 13: { // ores
      block(g, '#6b6f7c', id, { noise: 18 }); const oc = id === 12 ? '#e8833a' : id === 22 ? '#3fe0b0' : '#b46cff';
      if (id === 12) for (let k = 0; k < 6; k++) { const x = r() * 20 + 6, y = r() * 20 + 6; outlined(g, () => { g.beginPath(); g.ellipse(x, y, 3, 2.3, r() * 3, 0, 7); }, oc, 1.5); px(g, x - 1, y - 1, 1, 1, '#ffe0c0'); }
      else { gem(g, 11, 12, 5, oc); gem(g, 21, 20, 6, oc); gem(g, 10, 23, 3, oc); }
      return c; }
    case 14: { g.fillStyle = '#fff'; g.strokeStyle = '#b8c7e8'; g.lineWidth = 2; g.beginPath(); [[10, 19, 8], [21, 18, 9], [16, 12, 8]].forEach(([x, y, rr_]) => { g.moveTo(x + rr_, y); g.arc(x, y, rr_, 0, 7); }); g.stroke(); g.fill(); g.fillStyle = '#e4ebfb'; g.fillRect(4, 20, 25, 6); return c; }
    case 16: { g.strokeStyle = '#2f9e44'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 31); g.quadraticCurveTo(14, 22, 16, 15); g.stroke(); g.fillStyle = '#51cf66'; g.beginPath(); g.ellipse(11, 24, 5, 2.5, -.5, 0, 7); g.fill();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; outlined(g, () => { g.beginPath(); g.ellipse(16 + Math.cos(a) * 6, 11 + Math.sin(a) * 6, 4.5, 3.2, a, 0, 7); }, col, 1.5); }
      outlined(g, () => { g.beginPath(); g.arc(16, 11, 4, 0, 7); }, '#ffd43b', 1.5); return c; }
    case 15: form === 'x'; break;
    case 19: case 23: case 24: { // seals (world locks)
      g.strokeStyle = OUT; g.lineWidth = 7; g.beginPath(); g.arc(16, 13, 7, Math.PI, 0); g.stroke(); g.strokeStyle = '#c9ced6'; g.lineWidth = 3.5; g.stroke();
      outlined(g, () => rr(g, 5, 12, 22, 17, 4), col);
      g.fillStyle = sh(col, .45); g.fillRect(8, 15, 16, 3); g.fillStyle = sh(col, -.3); g.fillRect(7, 24, 18, 3);
      if (id === 23) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(11, 22); g.lineTo(12, 18); g.lineTo(14, 20); g.lineTo(16, 17); g.lineTo(18, 20); g.lineTo(20, 18); g.lineTo(21, 22); g.fill(); }
      else if (id === 24) star(g, 16, 20.5, 5, '#ffd43b');
      else { g.fillStyle = OUT; g.beginPath(); g.arc(16, 19.5, 2.5, 0, 7); g.fill(); g.fillRect(15, 20, 2, 5); }
      return c; }
    case 25: { outlined(g, () => rr(g, 3, 2, 26, 29, 4), col); g.fillStyle = '#bfe9ff'; rr(g, 7, 6, 18, 12, 2); g.fill(); g.fillStyle = '#ffffffaa'; g.fillRect(8, 7, 4, 10);
      for (let k = 0; k < 3; k++) { g.fillStyle = ['#ff6b6b', '#ffd43b', '#b46cff'][k]; g.beginPath(); g.arc(11 + k * 5, 14, 2, 0, 7); g.fill(); }
      g.fillStyle = '#1b5e28'; g.fillRect(7, 21, 18, 6); g.fillStyle = '#ffd43b'; g.fillRect(9, 23, 6, 2); return c; }
    case 26: { outlined(g, () => rr(g, 4, 8, 24, 20, 4), '#fff'); g.fillStyle = col; g.fillRect(14, 11, 4, 14); g.fillRect(9, 16, 14, 4); outlined(g, () => rr(g, 11, 4, 10, 5, 2), '#adb5bd', 2); return c; }
    case 27: { outlined(g, () => rr(g, 3, 6, 26, 23, 3), col); g.fillStyle = sh(col, .3); g.fillRect(5, 8, 22, 4); g.fillStyle = '#ffd43b'; g.fillRect(14, 6, 4, 23); g.fillStyle = OUT; g.font = 'bold 14px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('?', 16, 25); g.fillStyle = '#fff'; g.fillText('?', 15, 24); star(g, 25, 6, 3.5, '#fff'); return c; }
    case 28: { px(g, 7, 3, 3, 28, OUT); px(g, 8, 3, 1, 28, '#eee'); outlined(g, () => { g.beginPath(); g.moveTo(10, 4); g.quadraticCurveTo(20, 2, 28, 8); g.quadraticCurveTo(20, 12, 10, 14); g.closePath(); }, col, 2); return c; }
    case 29: { outlined(g, () => rr(g, 2, 4, 6, 27, 2), col, 2); outlined(g, () => rr(g, 24, 4, 6, 27, 2), col, 2); outlined(g, () => rr(g, 1, 2, 30, 8, 3), '#fff', 2); for (let x = 2; x < 30; x += 4) px(g, x, x % 8 === 2 ? 3 : 6, 4, 3, OUT); return c; }
    case 30: { outlined(g, () => rr(g, 2, 14, 28, 16, 4), '#5c5f6b'); outlined(g, () => rr(g, 4, 8, 24, 8, 4), col); g.fillStyle = '#ffffffaa'; g.fillRect(7, 10, 10, 2); g.strokeStyle = '#ffd43b'; g.lineWidth = 2; g.beginPath(); for (let x = 6; x < 28; x += 4) { g.lineTo(x, 20); g.lineTo(x + 2, 26); } g.stroke(); return c; }
  }
  if (it.kind === 'bg') { // dimmer, recessed backdrop
    const base = sh(col, -0.35); px(g, 0, 0, S, S, base);
    for (let y = 0; y < S; y += 8) for (let x = (y / 8 % 2) * 8; x < S; x += 16) { g.fillStyle = sh(col, -.25 + r() * .1); rr(g, x + 1, y + 1, 14, 6, 2); g.fill(); }
    g.fillStyle = '#0003'; g.fillRect(0, 0, S, S); return c; }
  if (form === 'brick') { px(g, 0, 0, S, S, sh(col, -0.45)); for (let y = 0; y < S; y += 8) for (let x = ((y / 8) % 2) * 8 - 8; x < S; x += 16) { const cc = sh(col, (r() - .5) * .15); g.fillStyle = cc; g.fillRect(x + 1, y + 1, 14, 6); px(g, x + 1, y + 1, 14, 1, sh(col, .35)); px(g, x + 1, y + 6, 14, 1, sh(col, -.25)); } g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2); return c; }
  if (form === 'tile' || form === 'mosaic') { const n = form === 'tile' ? 2 : 4, s = S / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const cc = form === 'mosaic' ? sh(col, (r() - .5) * .6) : sh(col, (x + y) % 2 ? -.08 : .06); g.fillStyle = cc; g.fillRect(x * s, y * s, s, s); px(g, x * s + 1, y * s + 1, s - 2, 2, sh(col, .4)); px(g, x * s, y * s + s - 1, s, 1, sh(col, -.45)); px(g, x * s + s - 1, y * s, 1, s, sh(col, -.45)); } g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2); return c; }
  if (form === 'plank') { for (let y = 0; y < S; y += 8) { px(g, 0, y, S, 8, sh(col, (r() - .5) * .14)); px(g, 0, y, S, 1, sh(col, .3)); px(g, 0, y + 7, S, 1, sh(col, -.45)); const kx = r() * 26 | 0; px(g, kx, y + 1, 1, 6, sh(col, -.45)); g.fillStyle = sh(col, -.25); g.fillRect(r() * 24 + 2, y + 3, 5, 1); px(g, (kx + 13) % 28 + 2, y + 3, 2, 2, sh(col, -.35)); } g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2); return c; }
  if (form === 'pillar') { outlined(g, () => rr(g, 6, 0, 20, 32, 0), col); px(g, 9, 0, 3, 32, sh(col, .4)); px(g, 20, 0, 3, 32, sh(col, -.3)); outlined(g, () => rr(g, 3, 0, 26, 5, 1), sh(col, -.1), 2); outlined(g, () => rr(g, 3, 27, 26, 5, 1), sh(col, -.1), 2); return c; }
  if (form === 'lantern' || id === 15) { const lc = id === 15 ? '#ffe066' : col; px(g, 15, 0, 2, 5, OUT); outlined(g, () => rr(g, 8, 4, 16, 4, 2), '#5c5f6b', 2); outlined(g, () => rr(g, 9, 7, 14, 19, 4), lc); const gl = g.createRadialGradient(16, 16, 1, 16, 16, 9); gl.addColorStop(0, '#fffbe6'); gl.addColorStop(1, sh(lc, 0)); g.fillStyle = gl; rr(g, 11, 9, 10, 15, 3); g.fill(); outlined(g, () => rr(g, 8, 25, 16, 4, 2), '#5c5f6b', 2); return c; }
  if (form === 'banner') { px(g, 3, 1, 26, 3, '#6b4826'); outlined(g, () => { g.beginPath(); g.moveTo(6, 4); g.lineTo(26, 4); g.lineTo(26, 30); g.lineTo(16, 24); g.lineTo(6, 30); g.closePath(); }, col); star(g, 16, 13, 5, sh(col, .6)); px(g, 8, 6, 2, 18, sh(col, .3)); return c; }
  if (form === 'crystal') { gem(g, 16, 17, 12, col); gem(g, 7, 25, 4, sh(col, .2)); return c; }
  if (form === 'block' && id >= 100) { block(g, col, id); if (r() < 0.5) { px(g, 10, 10, 12, 2, sh(col, -.2)); } return c; }
  if (id === 7) { block(g, col, 7); return c; }
  if (id === 17 || id === 18) { block(g, col, id); return c; }
  block(g, col, id); return c;
}
function star(g, cx, cy, r, col) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr_ = k % 2 ? r * .45 : r; g.lineTo(cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_); } g.closePath(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = col; g.fill(); }
function skinIcon(g, c, it, id) {
  g.save(); g.translate(16, it.slot === 'hat' ? (id === 43 ? 4 : 27) : 18); if (it.slot === 'hat') drawHat(g, id, it.color, id === 43 ? 16 : 13); if (it.slot === 'shirt') drawShirtIcon(g, it.color, id); if (it.slot === 'aura') { for (let k = 0; k < 3; k++) { g.strokeStyle = sh(it.color, k * .2); g.lineWidth = 3 - k; g.beginPath(); g.arc(0, -2, 13 - k * 4, 0, 7); g.stroke(); } star(g, 0, -2, 4, '#fff'); } g.restore(); return c;
}
function drawShirtIcon(g, col) { outlined(g, () => { g.beginPath(); g.moveTo(-8, -12); g.lineTo(-14, -6); g.lineTo(-10, -1); g.lineTo(-8, -3); g.lineTo(-8, 11); g.lineTo(8, 11); g.lineTo(8, -3); g.lineTo(10, -1); g.lineTo(14, -6); g.lineTo(8, -12); g.lineTo(3, -12); g.quadraticCurveTo(0, -8, -3, -12); g.closePath(); }, col); g.fillStyle = sh(col, .35); g.fillRect(-6, -9, 3, 18); }
// hats drawn around (0,0)=top of head centre; u = head radius
function drawHat(g, id, col, u) {
  const k = u / 14;
  g.save(); g.scale(k, k);
  if (id === 40) { outlined(g, () => { g.beginPath(); g.moveTo(-9, -4); g.lineTo(-7, -17); g.lineTo(7, -17); g.lineTo(9, -4); g.closePath(); }, col); px(g, -9, -7, 18, 3, sh(col, -.3)); g.strokeStyle = '#ffd43b'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -17); g.quadraticCurveTo(8, -16, 9, -8); g.stroke(); g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(9, -7, 2.2, 0, 7); g.fill(); }
  else if (id === 41) { outlined(g, () => { g.beginPath(); g.arc(0, -3, 13, Math.PI, 0); g.closePath(); }, col); for (let x = -12; x < 12; x += 5) px(g, x, -6, 3, 3, sh(col, .3)); outlined(g, () => { g.beginPath(); g.ellipse(3, -18, 6, 3, -.6, 0, 7); }, '#69db7c', 1.5); }
  else if (id === 42) { outlined(g, () => { g.beginPath(); g.moveTo(-11, -3); g.lineTo(-12, -16); g.lineTo(-6, -9); g.lineTo(0, -19); g.lineTo(6, -9); g.lineTo(12, -16); g.lineTo(11, -3); g.closePath(); }, col); gem(g, 0, -7, 2.5, '#ff6b6b'); gem(g, -7, -6, 1.8, '#4dabf7'); gem(g, 7, -6, 1.8, '#3fe0b0'); }
  else if (id === 43) { g.translate(0, 13); g.scale(.8, .8); outlined(g, () => rr(g, -13, -4, 11, 7, 2), '#111', 2); outlined(g, () => rr(g, 2, -4, 11, 7, 2), '#111', 2); px(g, -2, -2, 4, 2, '#111'); px(g, -11, -3, 4, 2, '#ffffff88'); px(g, 4, -3, 4, 2, '#ffffff88'); }
  g.restore();
}
// ---------- player ----------
function skinTone(name) { const h = name.split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7); const tones = ['#ffd8b8', '#f5c49c', '#e0a878', '#c68a5e', '#a86c46', '#ffe3c8']; const hair = ['#3b2a1a', '#6b3e1f', '#f2c14e', '#1d1d2b', '#c2410c', '#7c5cff', '#e64980'][Math.abs(h >> 3) % 7]; return { skin: tones[Math.abs(h) % tones.length], hair, body: `hsl(${Math.abs(h >> 5) % 360},65%,60%)` }; }
// x,y = screen top-left of hitbox, w,h hitbox size. st: {face, t, moving, air, vy, punch}
function player(ctx, X, Y, W, H, nm, eq, st, INFO) {
  const P = skinTone(nm), t = st.t, u = H / 30; eq = eq || {};
  const walk = st.walk !== undefined ? st.walk : st.moving && !st.air ? Math.sin(t / 75) : 0, bob = st.bob !== undefined ? st.bob * u : st.moving && !st.air ? Math.abs(Math.cos(t / 75)) * 1.6 * u : Math.sin(t / 450) * .6 * u;
  ctx.save(); ctx.translate(X + W / 2, Y + H); ctx.scale(st.face < 0 ? -1 : 1, 1);
  // shadow
  if (!st.air) { ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(0, 0, W * .5, 3 * u, 0, 0, 7); ctx.fill(); }
  if (eq.aura && !st.noAura) { const ac = INFO.items[eq.aura].color; const gr = ctx.createRadialGradient(0, -H * .55, 2, 0, -H * .55, H * .85); gr.addColorStop(0, ac + 'aa'); gr.addColorStop(1, ac + '00'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -H * .55, H * .85, 0, 7); ctx.fill();
    for (let k = 0; k < 4; k++) { const a = t / 400 + k * 1.57; ctx.fillStyle = '#fff'; ctx.globalAlpha = .7; ctx.fillRect(Math.cos(a) * H * .5, -H * .55 + Math.sin(a) * H * .45, 2 * u, 2 * u); } ctx.globalAlpha = 1; }
  ctx.lineJoin = 'round'; ctx.lineWidth = 1.7 * u; ctx.strokeStyle = OUT;
  const shirt = eq.shirt ? INFO.items[eq.shirt].color : P.body;
  // legs
  const legY = -7 * u, sq = st.air ? (st.vy < 0 ? 1.08 : .96) : 1;
  for (const s of [-1, 1]) { const sw = st.air ? (s * 2.5 * u) : walk * s * 3.2 * u; ctx.beginPath(); rr(ctx, s * 3.4 * u - 2.6 * u + sw, legY, 5.2 * u, 7 * u - (st.air && s > 0 ? 2 * u : 0), 1.8 * u); ctx.fillStyle = '#4c4380'; ctx.fill(); ctx.stroke(); }
  ctx.translate(0, -bob); ctx.scale(1 / sq, sq);
  // body
  ctx.beginPath(); rr(ctx, -7.5 * u, -16 * u, 15 * u, 10.5 * u, 4 * u); ctx.fillStyle = shirt; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff40'; ctx.fillRect(-5 * u, -14 * u, 3 * u, 7 * u);
  if (eq.shirt === 46) star(ctx, 1 * u, -10.5 * u, 2.6 * u, '#ffd43b');
  if (eq.shirt === 49) { ctx.fillStyle = '#ffd43b'; ctx.save(); ctx.rotate(-.5); ctx.fillRect(-7 * u, -11 * u, 14 * u, 2.2 * u); ctx.restore(); }
  if (eq.shirt === 45) { ctx.fillStyle = '#fff'; ctx.fillRect(-.6 * u, -15 * u, 1.2 * u, 9 * u); }
  // back arm
  const arm = (front, punch) => { ctx.save(); ctx.translate((front ? 4 : -4) * u, -13 * u); const a = punch > 0 ? -1.45 + (1 - punch) * .4 : st.air ? -2.4 : walk * (front ? -.7 : .7); ctx.rotate(a); ctx.beginPath(); rr(ctx, -1.8 * u, 0, 3.6 * u, (punch > 0 ? 8.5 : 6.5) * u, 1.8 * u); ctx.fillStyle = shirt; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, (punch > 0 ? 8.5 : 6.5) * u, 2.1 * u, 0, 7); ctx.fillStyle = P.skin; ctx.fill(); ctx.stroke(); ctx.restore(); };
  arm(false, 0);
  // head (big chibi)
  const hy = -24 * u, hr = 9.5 * u;
  ctx.beginPath(); rr(ctx, -hr * 1.05, hy - hr, hr * 2.1, hr * 1.95, hr * .8); ctx.fillStyle = P.skin; ctx.fill(); ctx.stroke();
  // hair
  if (!eq.hat || eq.hat === 43) { ctx.beginPath(); ctx.moveTo(-hr * 1.05, hy - hr * .05); ctx.quadraticCurveTo(-hr * 1.1, hy - hr * 1.15, 0, hy - hr * 1.05); ctx.quadraticCurveTo(hr * 1.15, hy - hr * 1.1, hr * 1.05, hy - hr * .1); ctx.quadraticCurveTo(hr * .5, hy - hr * .55, -hr * .1, hy - hr * .45); ctx.quadraticCurveTo(-hr * .6, hy - hr * .35, -hr * 1.05, hy - hr * .05); ctx.fillStyle = P.hair; ctx.fill(); ctx.stroke(); }
  // eyes
  const blink = st.blink !== undefined ? st.blink : (t % 3800) < 120; const ex = hr * .28;
  for (const s of [0, 1]) { const x = ex + (s ? hr * .5 : -hr * .25) - hr * .1, y = hy + hr * .05;
    if (blink) { ctx.fillStyle = OUT; ctx.fillRect(x - 2 * u, y, 4 * u, 1.2 * u); continue; }
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(x, y, 2.1 * u, 2.9 * u, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + .6 * u, y - 1.1 * u, .95 * u, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ff8fa3aa'; ctx.beginPath(); ctx.ellipse(hr * .78, hy + hr * .45, 1.8 * u, 1.1 * u, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-hr * .35, hy + hr * .45, 1.6 * u, 1 * u, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.3 * u; ctx.beginPath(); if (st.punch > 0) ctx.arc(hr * .25, hy + hr * .5, 1.3 * u, 0, 7); else ctx.arc(hr * .25, hy + hr * .35, 1.6 * u, .3, Math.PI - .3); ctx.stroke(); ctx.lineWidth = 1.7 * u;
  if (eq.hat) { ctx.save(); ctx.translate(0, hy - hr * .55); drawHat(ctx, eq.hat, INFO.items[eq.hat].color, hr * 1.35); ctx.restore(); }
  arm(true, st.punch || 0);
  ctx.restore();
}
// ---------- background ----------
function cloudSprite(seed) { const c = document.createElement('canvas'); c.width = 270; c.height = 100; const g = c.getContext('2d'), r = rng(seed);
  const blobs = []; for (let k = 0; k < 6; k++) blobs.push([40 + k * 28 + r() * 10, 55 - Math.sin(k / 5 * Math.PI) * 18 - r() * 6, 22 + r() * 14]);
  g.fillStyle = '#c9dcff'; for (const [x, y, rr_] of blobs) { g.beginPath(); g.arc(x + 3, y + 6, rr_, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; for (const [x, y, rr_] of blobs) { g.beginPath(); g.arc(x, y, rr_, 0, 7); g.fill(); }
  g.fillRect(40, 55, 150, 20); return c; }
const SEAMLESS = new Set([1, 2, 4, 10]);
const clouds = [cloudSprite(1), cloudSprite(7), cloudSprite(13)];
function hillLayer(seed, col, top, amp, w = 1600) { const c = document.createElement('canvas'); c.width = w; c.height = 400; const g = c.getContext('2d'), r = rng(seed);
  const fs = [r() * 3 + 2, r() * 5 + 4, r() * 9 + 9], ph = [r() * 6, r() * 6, r() * 6];
  const yAt = x => top + amp * (Math.sin(x / w * Math.PI * 2 * Math.round(fs[0]) + ph[0]) * .55 + Math.sin(x / w * Math.PI * 2 * Math.round(fs[1]) + ph[1]) * .3 + Math.sin(x / w * Math.PI * 2 * Math.round(fs[2]) + ph[2]) * .15);
  g.beginPath(); g.moveTo(0, 400); for (let x = 0; x <= w; x += 8) g.lineTo(x, yAt(x)); g.lineTo(w, 400); g.closePath();
  const gr = g.createLinearGradient(0, top - amp, 0, 400); gr.addColorStop(0, col); gr.addColorStop(1, sh(col, -.35)); g.fillStyle = gr; g.fill();
  g.strokeStyle = sh(col, .25); g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, yAt(x) + 2); g.stroke();
  // little trees on the hills
  for (let k = 0; k < 14; k++) { const x = r() * w, y = yAt(x); g.fillStyle = sh(col, -.25); g.fillRect(x - 2, y - 6, 4, 10); g.beginPath(); g.arc(x, y - 10, 7 + r() * 4, 0, 7); g.fill(); }
  return c; }
const hills = [hillLayer(3, '#9ad6a0', 150, 60), hillLayer(9, '#5fb36b', 230, 70)];
const nightHills = [hillLayer(3, '#3d3a7a', 150, 60), hillLayer(9, '#2b2860', 230, 70)];
function sky(ctx, W, H, cam, t, dl, parkour) {
  const mix = (a, b) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v * dl + B[i] * (1 - dl))).join(',')})`; };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (parkour) { g.addColorStop(0, '#3b1d7a'); g.addColorStop(.6, '#c2569b'); g.addColorStop(1, '#ffb38a'); }
  else { g.addColorStop(0, mix('#4fb3ff', '#0b0b2e')); g.addColorStop(.65, mix('#a6e1ff', '#2b2560')); g.addColorStop(1, mix('#fff1c9', '#4a3a7e')); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (dl < .5 && !parkour) { ctx.fillStyle = '#fff'; for (let k = 0; k < 80; k++) { const tw = .5 + .5 * Math.sin(t / 500 + k); ctx.globalAlpha = (.5 - dl) * 2 * tw; const sx = (k * 137.5 + 40) % W, sy = (k * 71.3) % (H * .6), s = k % 9 ? 1.5 : 3; ctx.fillRect(sx, sy, s, s); } ctx.globalAlpha = 1; }
  // sun / moon with glow
  const ph = (Date.now() / 60000 / 24) % 1, ang = ph * Math.PI * 2; const bx = parkour ? W * .78 : W / 2 - Math.sin(ang) * W * .4, by = parkour ? H * .25 : H * .55 - Math.cos(ang) * H * .45;
  const day = parkour || dl > .4; const gl = ctx.createRadialGradient(bx, by, 10, bx, by, 90); gl.addColorStop(0, day ? '#fff6b0aa' : '#dfe7ff66'); gl.addColorStop(1, '#fff0'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, by, 90, 0, 7); ctx.fill();
  ctx.fillStyle = day ? '#ffe066' : '#eef1ff'; ctx.beginPath(); ctx.arc(bx, by, 24, 0, 7); ctx.fill(); ctx.fillStyle = day ? '#fff3bf' : '#c9cfe8'; ctx.beginPath(); ctx.arc(bx - 6, by - 6, day ? 12 : 5, 0, 7); ctx.fill(); if (!day) { ctx.beginPath(); ctx.arc(bx + 8, by + 5, 4, 0, 7); ctx.fill(); }
  // parallax clouds
  ctx.globalAlpha = parkour ? .5 : .55 + dl * .4;
  for (let k = 0; k < 7; k++) { const sp = .12 + (k % 3) * .06, span = W + 260; const cx = ((k * 310 - cam.x * sp + t * (0.006 + k * .002)) % span + span) % span - 230; const cy = 30 + (k * 53) % (H * .35) - cam.y * .05; const cs = clouds[k % 3], sc = .55 + (k % 3) * .2; ctx.drawImage(cs, cx, cy, cs.width * sc, cs.height * sc); }
  ctx.globalAlpha = 1;
  // parallax hills
  const set = dl > .45 || parkour ? hills : nightHills;
  set.forEach((h, k) => { const sp = .15 + k * .15, base = H - 330 + k * 30 - Math.max(-60, Math.min(160, cam.y * (.08 + k * .05) - 40)); const ox = -((cam.x * sp) % h.width); for (let x = ox; x < W; x += h.width) ctx.drawImage(h, x, base); });
}
// ---------- trees (growth stages) ----------
function tree(ctx, sx, sy, TS, g, col, t, x) {
  const u = TS / 32; ctx.save(); ctx.translate(sx + TS / 2, sy + TS); ctx.lineWidth = 2 * u; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  const sway = Math.sin(t / 700 + x) * .04; ctx.rotate(sway);
  if (g < .25) { // sprout
    ctx.fillStyle = '#6b4826'; ctx.beginPath(); ctx.ellipse(0, -2 * u, 9 * u, 3 * u, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.moveTo(0, -3 * u); ctx.lineTo(0, -10 * u); ctx.stroke(); ctx.lineWidth = 1.5 * u; ctx.strokeStyle = OUT;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 4 * u, -11 * u, 4.5 * u, 2.5 * u, s * -.5, 0, 7); ctx.fillStyle = '#69db7c'; ctx.fill(); ctx.stroke(); }
  } else {
    const h = (10 + g * 16) * u, cr = (5 + g * 9) * u;
    ctx.beginPath(); rr(ctx, -2.5 * u - g * 1.5 * u, -h, 5 * u + g * 3 * u, h, 2 * u); ctx.fillStyle = '#8b5a2b'; ctx.fill(); ctx.stroke();
    const leaf = g >= 1 ? '#40c057' : '#69db7c';
    for (const [dx, dy, r] of [[-.55, .1, .75], [.55, .1, .75], [0, -.35, .95], [0, .2, .8]]) { ctx.beginPath(); ctx.arc(dx * cr, -h + dy * cr, r * cr, 0, 7); ctx.fillStyle = leaf; ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = leaf; for (const [dx, dy, r] of [[-.55, .1, .75], [.55, .1, .75], [0, -.35, .95], [0, .2, .8]]) { ctx.beginPath(); ctx.arc(dx * cr, -h + dy * cr, r * cr - 1.2 * u, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.arc(-.3 * cr, -h - .55 * cr, .3 * cr, 0, 7); ctx.fill();
    if (g >= 1) for (const [dx, dy] of [[-.5, -.1], [.45, -.25], [0, .35], [.1, -.75]]) { const bb = Math.sin(t / 300 + dx * 9) * u; ctx.beginPath(); ctx.arc(dx * cr, -h + dy * cr + bb, 3.2 * u, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff9'; ctx.fillRect(dx * cr - 1.5 * u, -h + dy * cr + bb - 1.8 * u, 1.4 * u, 1.4 * u); }
  }
  ctx.restore();
}
// grass cap for loam with air above
const grassCap = (() => { const c = document.createElement('canvas'); c.width = S; c.height = 14; const g = c.getContext('2d'), r = rng(42);
  g.fillStyle = OUT; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, 9); for (let x = S; x >= 0; x -= 4) g.lineTo(x, 9 + (x % 8 ? 3 : 0) + r() * 2); g.closePath(); g.fill();
  g.fillStyle = '#5cc84a'; g.beginPath(); g.moveTo(1, 1); g.lineTo(S - 1, 1); g.lineTo(S - 1, 7); for (let x = S - 1; x >= 1; x -= 4) g.lineTo(x, 7 + (x % 8 > 3 ? 3 : 0)); g.closePath(); g.fill();
  g.fillStyle = '#9be36d'; g.fillRect(1, 1, S - 2, 3); g.fillStyle = '#d8f5a2'; g.fillRect(3, 2, 6, 1); g.fillRect(17, 2, 4, 1);
  g.fillStyle = '#3c9a33'; for (let x = 3; x < S; x += 6) g.fillRect(x, 5, 2, 2); return c; })();
// rounded soft shadow edge where a solid tile meets air (adds depth)
function edges(ctx, sx, sy, TS, airUp, airDown, airL, airR) {
  ctx.fillStyle = 'rgba(42,29,61,.95)'; const e = Math.max(2, TS / 14);
  if (airUp) ctx.fillRect(sx, sy, TS, e); if (airDown) ctx.fillRect(sx, sy + TS - e, TS, e); if (airL) ctx.fillRect(sx, sy, e, TS); if (airR) ctx.fillRect(sx + TS - e, sy, e, TS);
}
// sparkle shape
function sparkle(ctx, x, y, s, a) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .25, y - s * .25); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .25, y + s * .25); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .25, y + s * .25); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .25, y - s * .25); ctx.fill(); ctx.globalAlpha = 1; }
// ---------- v6: cohesive palette + crisp pixelization ----------
const PAL = (() => {
  const h2r = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); };
  const out = [[42, 29, 61], [255, 255, 255], [255, 248, 231]];
  const L = [.14, .24, .34, .45, .56, .67, .78, .88];
  const shift = (h, k) => { const toward = k < 3.5 ? 255 : 55; const amt = Math.abs(k - 3.5) * 5; let d = ((toward - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
  for (const h of [0, 12, 22, 29, 36, 44, 54, 70, 95, 125, 150, 170, 188, 202, 216, 232, 255, 278, 300, 322, 342])
    L.forEach((l, k) => { const hs = shift(h, k); out.push(h2r(hs, [.5, .6, .7, .75, .75, .75, .72, .7][k], l)); out.push(h2r(hs, [.38, .44, .48, .5, .5, .5, .52, .55][k], l)); out.push(h2r(hs, [.22, .26, .28, .3, .3, .3, .34, .4][k], l)); });
  for (const l of [.1, .2, .32, .44, .56, .68, .8, .92]) out.push(h2r(250, .12, l));
  return out;
})();
const NC = new Map();
function nearest(r, g, b) { const key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2); let v = NC.get(key); if (v) return v; let best = 1e9; for (const c of PAL) { const dr = r - c[0], dg = g - c[1], db = b - c[2], d = dr * dr * .3 + dg * dg * .59 + db * db * .11; if (d < best) { best = d; v = c; } } NC.set(key, v); return v; }
function pixelize(c, outline) {
  const g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 120) { d[i + 3] = 0; continue; } const a = d[i + 3] / 255, n = nearest(d[i] / a | 0, d[i + 1] / a | 0, d[i + 2] / a | 0); d[i] = n[0]; d[i + 1] = n[1]; d[i + 2] = n[2]; d[i + 3] = 255; }
  if (outline) { const src = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) src[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (src[i]) continue; if ((x > 0 && src[i - 1]) || (x < W - 1 && src[i + 1]) || (y > 0 && src[i - W]) || (y < H - 1 && src[i + W])) { d[i * 4] = 42; d[i * 4 + 1] = 29; d[i * 4 + 2] = 61; d[i * 4 + 3] = 255; } } }
  g.putImageData(im, 0, 0); return c;
}
function ptex(id, INFO, v) { const c = tex(id, INFO, v), it = INFO.items[id]; const sprite = !it || !['fg', 'bg'].includes(it.kind) || id === 9; return pixelize(c, sprite && id !== 9); }
// cached player sprites (pixelized), 40x72 texels; feet at (20, 70)
const PS = new Map();
function playerSprite(nm, eq, pose, INFO) {
  eq = eq || {}; const key = nm + '|' + (eq.hat || 0) + '|' + (eq.shirt || 0) + '|' + pose; let c = PS.get(key); if (c) return c;
  c = document.createElement("canvas"); c.width = 40; c.height = 72; const g = c.getContext('2d');
  const [kind, f] = pose.split(':'), fr = +f || 0;
  const st = { face: 1, t: 1000, moving: kind === 'walk', air: kind === 'jump' || kind === 'fall', vy: kind === 'jump' ? -1 : 1, punch: kind === 'punch' ? 1 - fr * .5 : 0, noAura: true,
    walk: kind === 'walk' ? Math.sin(fr / 4 * Math.PI * 2) : 0, bob: kind === 'walk' ? Math.abs(Math.cos(fr / 4 * Math.PI * 2)) * 1.4 : kind === 'idle' ? fr * .7 : 0, blink: kind === 'idle' && fr === 2 };
  player(g, 20 - 11, 70 - 46, 22, 46, nm, eq, st, INFO); pixelize(c, false);
  if (PS.size > 400) PS.delete(PS.keys().next().value); PS.set(key, c); return c;
}
const TRS = new Map();
function treeSprite(g, col) { const st = g >= 1 ? 3 : g >= 0.6 ? 2 : g >= 0.25 ? 1 : 0, key = st + col; let c = TRS.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = 32; c.height = 48; const x = c.getContext('2d'); tree(x, 0, 16, 32, [0.1, 0.4, 0.8, 1][st], col, 0, 0); pixelize(c, true); TRS.set(key, c); return c; }
window.ART = { treeSprite, PAL, pixelize, ptex, playerSprite, SEAMLESS, tex, player, sky, tree, grassCap, edges, sparkle, star, gem, OUT, sh };
})();
