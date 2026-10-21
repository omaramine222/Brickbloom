const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
test('SQLite store survives a restart (users, worlds, sessions, logs)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbdb-'));
  const run = code => execFileSync('node', ['-e', code], { env: { ...process.env, DATA_DIR: dir }, cwd: path.join(__dirname, '..') }).toString().trim();
  run(`const s=require('./src/store'),G=require('./src/game');s.users.bob=G.newUser('bob','h');s.users.bob.gems=77;s.saveUsers('bob');
       const w=s.getWorld('PERSIST',G.generateWorld);w.fg[5]=13;s.saveWorld('PERSIST');s.saveSession('tok123','bob');s.log({t:1,type:'x',a:1});s.flush();`);
  const out = JSON.parse(run(`const s=require('./src/store'),G=require('./src/game');console.log(JSON.stringify({g:s.users.bob.gems,f:s.getWorld('PERSIST',G.generateWorld).fg[5],k:s.getSession('tok123'),bad:s.getSession('nope')||null,l:s.logs(5).length}))`));
  assert.deepEqual(out, { g: 77, f: 13, k: 'bob', bad: null, l: 1 });
});
