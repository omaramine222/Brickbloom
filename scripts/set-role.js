// Usage: node scripts/set-role.js <username> <owner|mod|user>   (stop the server first)
const store = require('../src/store');
const [name, role] = process.argv.slice(2);
if (!name || !['owner', 'mod', 'user'].includes(role)) { console.log('usage: node scripts/set-role.js <username> <owner|mod|user>'); process.exit(1); }
const u = store.users[name.toLowerCase()];
if (!u) { console.log('no such user (register in game first)'); process.exit(1); }
u.role = role; store.saveUsers(); store.flush(); console.log(name, '->', role);
