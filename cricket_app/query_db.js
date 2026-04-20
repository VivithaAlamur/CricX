const db = require('better-sqlite3')('server/cricket.sqlite');

const matches = db.prepare('SELECT * FROM matches').all();
const innings = db.prepare('SELECT * FROM innings').all();
const balls = db.prepare('SELECT match_id, innings_id, COUNT(*) as count FROM balls GROUP BY match_id, innings_id').all();

console.log("Matches:", matches);
console.log("Innings:", innings);
console.log("Balls:", balls);
