'use strict';
// Hand-designed parkour courses. Legend: # slate  = dune brick  B bounce pad  ~ magma  C checkpoint  F finish  S spawn  X corebed  g glowjar
// Each row is <=98 chars; rows are placed at the bottom of a 100x60 world above a magma lake.
// Courses are authored as platforms [x0, x1, row, char?] + markers [char, x, row] so jumps stay fair
// (max gap 3 tiles, max rise 2; bounce pads allow rise 5). A test proves every course is completable.
const DEF = {
  RUN1: { name: 'Sunny Steps', limit: 120000, prize: 60, h: 15,
    plat: [[0,4,14,'#'],[7,9,13],[12,16,12],[20,22,11],[25,27,10],[30,33,9],[36,38,9],[41,46,8],[49,51,7],[54,56,6],[59,61,5],[64,66,4],[69,72,4],[75,77,3],[80,82,2],[85,97,1]],
    mark: [['S',1,13],['C',14,11],['C',44,7],['C',71,3],['g',89,0],['F',95,0]] },
  RUN2: { name: 'Bounce Canyon', limit: 150000, prize: 90, h: 14,
    plat: [[0,4,13,'#'],[7,9,13],[9,9,13,'B'],[10,13,8],[16,18,7],[21,22,6],[25,27,6],[27,27,6,'B'],[29,33,1],[37,39,3],[43,44,5],[47,49,7],[49,49,7,'B'],[52,55,2],[58,60,2],[63,66,3],[69,71,2],[74,75,1],[78,90,1]],
    mark: [['S',1,12],['C',12,7],['C',31,0],['C',65,2],['g',84,0],['F',88,0]] },
  RUN3: { name: 'Magma Sprint', limit: 100000, prize: 120, h: 12,
    plat: [[0,3,11,'#'],[6,7,10],[10,11,9],[14,15,8],[18,19,7],[22,27,7],[30,31,6],[34,35,5],[38,39,4],[42,43,4],[46,47,3],[50,57,3],[60,61,2],[64,65,2],[68,69,3],[72,73,2],[76,77,1],[80,92,1]],
    mark: [['S',1,10],['C',25,6],['C',54,2],['g',84,0],['F',90,0]] },
};
const COURSES = {};
for (const [k, d] of Object.entries(DEF)) {
  const rows = Array.from({ length: d.h }, () => Array(98).fill(' '));
  for (const [x0, x1, r, ch] of d.plat) for (let x = x0; x <= x1; x++) rows[r][x] = ch || '=';
  for (const [ch, x, r] of d.mark) rows[r][x] = ch;
  COURSES[k] = { name: d.name, limit: d.limit, prize: d.prize, rows: rows.map(r => r.join('')) };
}
const CH = { '#': 2, '=': 7, B: 30, '~': 3, X: 4, C: 28, F: 29, g: 15 };
function buildCourse(key, W = 100, H = 60) {
  const c = COURSES[key]; if (!c) return null;
  const fg = new Array(W * H).fill(0), bg = new Array(W * H).fill(20), cps = []; let spawn = null, finish = null;
  for (let x = 0; x < W; x++) for (let y = H - 3; y < H; y++) fg[y * W + x] = 4;
  for (let x = 0; x < W; x++) for (let y = H - 8; y < H - 3; y++) fg[y * W + x] = 3;
  for (let y = 0; y < H; y++) { fg[y * W] = 4; fg[y * W + W - 1] = 4; }
  const top = H - 8 - c.rows.length;
  c.rows.forEach((row, r) => [...row].forEach((ch, k) => {
    const x = k + 1, y = top + r; if (x >= W - 1) return;
    if (ch === 'S') spawn = { x, y }; else if (ch === 'C') { cps.push({ x, y }); fg[y * W + x] = 28; } else if (ch === 'F') { finish = { x, y }; fg[y * W + x] = 29; } else if (CH[ch]) fg[y * W + x] = CH[ch];
  }));
  cps.sort((a, b) => a.x - b.x);
  return { name: key, w: W, h: H, fg, bg, trees: {}, drops: [], owner: null, access: [], adminLocked: true, courseName: c.name,
    parkour: { checkpoints: cps, finish, limit: c.limit, prize: c.prize, board: [] }, spawn, nextDrop: 1, hits: {} };
}
module.exports = { COURSES, buildCourse };
