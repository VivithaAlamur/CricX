import Database from 'better-sqlite3';

const db = new Database('cricket.sqlite');

try {
    db.prepare("BEGIN").run();

    // 1. Update Match 59's innings (id = 92) to belong to Match 58, innings_number = 2
    // Set target_score to 91 (Phani11 scored 90 in the first innings)
    db.prepare(`UPDATE innings SET match_id = 58, innings_number = 2, target_score = 91 WHERE id = 92`).run();

    // 2. Update all balls from Match 59's innings to match_id = 58
    db.prepare(`UPDATE balls SET match_id = 58 WHERE match_id = 59`).run();

    // 3. Update Match 58 match status since the target of 91 was successfully chased (scored 94)
    db.prepare(`UPDATE matches SET status = 'FINISHED' WHERE id = 58`).run();

    // 4. Delete the leftover Match 59 entry
    db.prepare(`DELETE FROM matches WHERE id = 59`).run();

    db.prepare("COMMIT").run();
    console.log("Successfully combined Match 59 into Match 58!");
} catch (e) {
    if (db.inTransaction) db.prepare("ROLLBACK").run();
    console.error("Failed to merge matches:", e);
}
