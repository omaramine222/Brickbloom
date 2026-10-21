'use strict';
// SQLite persistence (WAL). Game state lives in memory and is flushed in a single transaction every few seconds.
const fs = require('fs'), path = require('path'), Database = require('better-sqlite3');
// DB_PATH = full path to the .db file (wins); otherwise DATA_DIR/brickbloom.db
const DB_PATH = process.env.DB_PATH || path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'brickbloom.db');
const DIR = path.dirname(DB_PATH);
fs.mkdirSync(DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); db.pragma('synchronous = NORMAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (k TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS worlds (name TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, k TEXT NOT NULL, created INTEGER);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, type TEXT, data TEXT);
CREATE INDEX IF NOT EXISTS logs_t ON logs(t);`);
const users = {};
for (const r of db.prepare('SELECT k, data FROM users').all()) users[r.k] = JSON.parse(r.data);
// one-time migration from v1 JSON files
const oldUsers = path.join(DIR, 'users.json');
if (fs.existsSync(oldUsers) && !Object.keys(users).length) {
  Object.assign(users, JSON.parse(fs.readFileSync(oldUsers, 'utf8')));
  const wd = path.join(DIR, 'worlds');
  if (fs.existsSync(wd)) for (const f of fs.readdirSync(wd)) if (f.endsWith('.json')) db.prepare('INSERT OR REPLACE INTO worlds VALUES (?,?,?)').run(f.slice(0, -5), fs.readFileSync(path.join(wd, f), 'utf8'), Date.now());
  fs.renameSync(oldUsers, oldUsers + '.migrated');
}
const q = {
  putUser: db.prepare('INSERT OR REPLACE INTO users VALUES (?,?)'),
  getWorld: db.prepare('SELECT data FROM worlds WHERE name=?'),
  putWorld: db.prepare('INSERT OR REPLACE INTO worlds VALUES (?,?,?)'),
  putSess: db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?,?)'),
  getSess: db.prepare('SELECT k FROM sessions WHERE token=? AND created>?'),
  getKv: db.prepare('SELECT v FROM kv WHERE k=?'), putKv: db.prepare('INSERT OR REPLACE INTO kv VALUES (?,?)'),
  log: db.prepare('INSERT INTO logs (t,type,data) VALUES (?,?,?)'),
  logs: db.prepare('SELECT t,type,data FROM logs ORDER BY id DESC LIMIT ?'),
  logsType: db.prepare("SELECT t,type,data FROM logs WHERE type IN ('trade','vend_buy') ORDER BY id DESC LIMIT ?"),
};
const dirtyUsers = new Set(), worlds = new Map(), dirtyWorlds = new Set();
const SESSION_MS = 30 * 86400000;
const flushTx = db.transaction(() => {
  for (const k of dirtyUsers) if (users[k]) { const { clinic, ...u } = users[k]; q.putUser.run(k, JSON.stringify({ ...u, clinic })); }
  for (const n of dirtyWorlds) { const w = worlds.get(n); if (w) { const { hits, ...rest } = w; q.putWorld.run(n, JSON.stringify(rest), Date.now()); } }
});
module.exports = {
  db, users, DB_PATH,
  saveUsers(k) { if (k) dirtyUsers.add(k); else for (const key of Object.keys(users)) dirtyUsers.add(key); },
  getWorld(name, gen) {
    if (worlds.has(name)) return worlds.get(name);
    const r = q.getWorld.get(name); let w = r ? JSON.parse(r.data) : null;
    if (!w) { w = gen(name); dirtyWorlds.add(name); }
    w.hits = {}; worlds.set(name, w); return w;
  },
  saveWorld(name) { dirtyWorlds.add(name); },
  flush() { if (!dirtyUsers.size && !dirtyWorlds.size) return; flushTx(); dirtyUsers.clear(); dirtyWorlds.clear(); },
  saveSession(token, k) { q.putSess.run(token, k, Date.now()); },
  getSession(token) { const r = q.getSess.get(String(token), Date.now() - SESSION_MS); return r && r.k; },
  kvGet(k, d) { const r = q.getKv.get(k); return r ? JSON.parse(r.v) : d; },
  kvSet(k, v) { q.putKv.run(k, JSON.stringify(v)); },
  log(e) { const { t, type, ...rest } = e; q.log.run(t, type, JSON.stringify(rest)); },
  tradeLogs(n) { return q.logsType.all(n).map(r => ({ t: r.t, type: r.type, ...JSON.parse(r.data) })).reverse(); },
  logs(n) { return q.logs.all(n).map(r => ({ t: r.t, type: r.type, ...JSON.parse(r.data) })).reverse(); },
};
