const db = require('better-sqlite3')('cricket.sqlite');
try {
  const inningsStmt = db.prepare(`
    INSERT INTO innings (match_id, innings_number, team_name, target_score)
    VALUES (?, 2, ?, ?)
  `);
  inningsStmt.run(58, "Raj11", 91);
  console.log("Success!");
} catch(e) { console.error("Error:", e); }
