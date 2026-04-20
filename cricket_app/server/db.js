import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
const db = new Database(path.join(__dirname, 'cricket.sqlite'), { verbose: console.log });

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team1_name TEXT NOT NULL,
    team2_name TEXT NOT NULL,
    toss_winner TEXT NOT NULL,
    toss_decision TEXT NOT NULL,
    total_overs INTEGER NOT NULL,
    current_innings INTEGER DEFAULT 1,
    status TEXT DEFAULT 'IN_PROGRESS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS innings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings_number INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    total_runs INTEGER DEFAULT 0,
    total_wickets INTEGER DEFAULT 0,
    total_overs_bowled REAL DEFAULT 0,
    target_score INTEGER,
    FOREIGN KEY (match_id) REFERENCES matches (id)
  );

  CREATE TABLE IF NOT EXISTS balls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    over_number INTEGER NOT NULL,
    ball_number INTEGER NOT NULL,
    striker TEXT NOT NULL,
    non_striker TEXT NOT NULL,
    bowler TEXT NOT NULL,
    runs INTEGER DEFAULT 0,
    extras INTEGER DEFAULT 0,
    extra_type TEXT,
    is_wicket BOOLEAN DEFAULT 0,
    wicket_type TEXT,
    dismissed_player TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches (id),
    FOREIGN KEY (innings_id) REFERENCES innings (id)
  );

  -- Handle migrations using try-catch blocks in the exec block or separate execs
`);

// Hand-rolled migrations to add new columns to existing table
try { db.exec("ALTER TABLE players ADD COLUMN first_name TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE players ADD COLUMN middle_name TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE players ADD COLUMN last_name TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE matches ADD COLUMN team1_squad TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE matches ADD COLUMN team2_squad TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE matches ADD COLUMN no_extra_runs INTEGER DEFAULT 0;"); } catch (e) { }
try { db.exec("ALTER TABLE matches ADD COLUMN joker_player TEXT;"); } catch (e) { }
try { db.exec("ALTER TABLE players ADD COLUMN is_active INTEGER DEFAULT 1;"); } catch (e) { }
try { db.exec("ALTER TABLE matches ADD COLUMN single_batter INTEGER DEFAULT 0;"); } catch (e) { }
try { db.exec("ALTER TABLE balls ADD COLUMN fielder TEXT;"); } catch (e) { }

export default db;
