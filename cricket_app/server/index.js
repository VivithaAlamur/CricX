import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Security Middleware ---
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier development/local sharing if needed, or adjust as necessary
}));
app.use(cors());
app.use(express.json());

// --- Persistent Match Locks ---
const matchLocks = new Map(); // match_id -> { sessionId, lastPing }

// --- Visitor Monitoring ---
const activeTesters = new Set();
app.use((req, res, next) => {
  // Use standard IP detection for local testing
  const ip = req.ip || req.connection.remoteAddress;

  if (!activeTesters.has(ip)) {
    activeTesters.add(ip);
    console.log(`\x1b[32m[Local Monitor] Connection from: ${ip}. Total unique connections: ${activeTesters.size}\x1b[0m`);
  }
  next();
});

// --- Admin & Scorer Auth ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SCORER_PASSWORD = process.env.SCORER_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn('\x1b[31m[Security Warning] ADMIN_PASSWORD not set in .env! Using default.\x1b[0m');
}
if (!SCORER_PASSWORD) {
  console.warn('\x1b[31m[Security Warning] SCORER_PASSWORD not set in .env! Using default.\x1b[0m');
}

const adminRequired = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (password === (ADMIN_PASSWORD || 'cricket123')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required. Please provide correct PIN.' });
  }
};

const scorerRequired = (req, res, next) => {
  const password = req.headers['x-scorer-password'];
  if (password === (SCORER_PASSWORD || 'scorer123')) {
    next();
  } else {
    res.status(403).json({ error: 'Scorer access required. Please provide correct Scorer PIN.' });
  }
};

app.get('/api/auth/scorer/verify', scorerRequired, (_req, res) => {
  res.json({ valid: true });
});

// Get all players
app.get('/api/players', (req, res) => {
  const players = db.prepare('SELECT id, name, first_name, middle_name, last_name, is_active FROM players ORDER BY name').all();
  res.json(players);
});

// Get player stats
app.get('/api/players/stats', (req, res) => {
  // Aggregate stats from the balls table
  const stats = db.prepare(`
    SELECT 
      p.id, 
      p.name,
      p.first_name,
      p.middle_name,
      p.last_name,
      p.is_active,
      COALESCE(SUM(CASE WHEN b.striker = p.name THEN b.runs ELSE 0 END), 0) as total_runs,
      COALESCE(SUM(CASE WHEN b.bowler = p.name AND b.is_wicket = 1 THEN 1 ELSE 0 END), 0) as total_wickets,
      COALESCE(SUM(CASE WHEN b.striker = p.name AND b.extra_type IS NULL THEN 1 ELSE 0 END), 0) as balls_faced,
      COALESCE(SUM(CASE WHEN b.bowler = p.name AND b.extra_type IS NULL THEN 1 ELSE 0 END), 0) as legal_balls_bowled,
      COALESCE(SUM(CASE WHEN b.bowler = p.name AND b.extra_type IS NULL THEN 1 ELSE 0 END), 0) as legal_balls_bowled,
      COALESCE(SUM(CASE WHEN b.bowler = p.name AND (b.extra_type IS NULL OR b.extra_type = 'wide' OR b.extra_type = 'no_ball') THEN (b.runs + b.extras) ELSE 0 END), 0) as runs_conceded,
      (SELECT COUNT(*) FROM matches m WHERE m.team1_squad LIKE '%"' || p.name || '"%' OR m.team2_squad LIKE '%"' || p.name || '"%' OR m.joker_player = p.name) as matches_played,
      (
        SELECT COUNT(*)
        FROM matches m
        LEFT JOIN innings i1 ON m.id = i1.match_id AND i1.innings_number = 1
        LEFT JOIN innings i2 ON m.id = i2.match_id AND i2.innings_number = 2
        WHERE m.status = 'FINISHED'
          AND (
               (i1.total_runs > i2.total_runs AND ((m.team1_name = i1.team_name AND m.team1_squad LIKE '%"' || p.name || '"%') OR (m.team2_name = i1.team_name AND m.team2_squad LIKE '%"' || p.name || '"%') OR m.joker_player = p.name))
               OR 
               (i2.total_runs > i1.total_runs AND ((m.team1_name = i2.team_name AND m.team1_squad LIKE '%"' || p.name || '"%') OR (m.team2_name = i2.team_name AND m.team2_squad LIKE '%"' || p.name || '"%') OR m.joker_player = p.name))
          )
      ) as matches_won,
      (
        SELECT COUNT(*)
        FROM matches m
        LEFT JOIN innings i1 ON m.id = i1.match_id AND i1.innings_number = 1
        LEFT JOIN innings i2 ON m.id = i2.match_id AND i2.innings_number = 2
        WHERE m.status = 'FINISHED'
          AND (
               (i1.total_runs < i2.total_runs AND ((m.team1_name = i1.team_name AND m.team1_squad LIKE '%"' || p.name || '"%') OR (m.team2_name = i1.team_name AND m.team2_squad LIKE '%"' || p.name || '"%') OR m.joker_player = p.name))
               OR 
               (i2.total_runs < i1.total_runs AND ((m.team1_name = i2.team_name AND m.team1_squad LIKE '%"' || p.name || '"%') OR (m.team2_name = i2.team_name AND m.team2_squad LIKE '%"' || p.name || '"%') OR m.joker_player = p.name))
          )
      ) as matches_lost,
      (
        SELECT COUNT(*)
        FROM matches m
        WHERE m.status = 'FINISHED' AND m.joker_player = p.name
      ) as matches_joker
    FROM players p
    LEFT JOIN balls b ON b.striker = p.name OR b.bowler = p.name
    GROUP BY p.id, p.name, p.first_name, p.middle_name, p.last_name, p.is_active
    ORDER BY total_runs DESC, total_wickets DESC
  `).all();
  res.json(stats);
});

// Get player specific match history
app.get('/api/players/:id/history', (req, res) => {
  const playerId = req.params.id;
  try {
    const player = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Find matches where player participated and get innings data
    const matches = db.prepare(`
      SELECT m.*, 
        (SELECT SUM(runs + extras) FROM balls WHERE match_id = m.id AND striker = ?) as player_runs,
        (SELECT COUNT(*) FROM balls WHERE match_id = m.id AND striker = ? AND extra_type IS NULL) as player_balls_faced,
        (SELECT COUNT(*) FROM balls WHERE match_id = m.id AND bowler = ? AND is_wicket = 1) as player_wickets,
        i1.total_runs as team1_runs, i1.total_wickets as team1_wickets, i1.total_overs_bowled as team1_overs,
        i2.total_runs as team2_runs, i2.total_wickets as team2_wickets, i2.total_overs_bowled as team2_overs
      FROM matches m
      LEFT JOIN innings i1 ON m.id = i1.match_id AND i1.innings_number = 1
      LEFT JOIN innings i2 ON m.id = i2.match_id AND i2.innings_number = 2
      WHERE 
        EXISTS (SELECT 1 FROM json_each(m.team1_squad) WHERE value = ?) OR
        EXISTS (SELECT 1 FROM json_each(m.team2_squad) WHERE value = ?) OR
        m.joker_player = ?
      ORDER BY m.created_at DESC
    `).all(player.name, player.name, player.name, player.name, player.name, player.name);

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new player (JSON now, no photo)
app.post('/api/players', (req, res) => {
  const { first_name, middle_name, last_name } = req.body;

  if (!first_name || !last_name) return res.status(400).json({ error: 'First and Last name are required' });

  // Create combined name for stats compatibility
  const combinedName = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();

  try {
    const stmt = db.prepare('INSERT INTO players (name, first_name, middle_name, last_name) VALUES (?, ?, ?, ?)');
    const info = stmt.run(combinedName, first_name, middle_name || null, last_name);
    res.json({ id: info.lastInsertRowid, name: combinedName });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Player with this combined name already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a player
app.put('/api/players/:id', adminRequired, (req, res) => {
  const playerId = req.params.id;
  const { first_name, middle_name, last_name, is_active } = req.body;

  if (!first_name || !last_name) return res.status(400).json({ error: 'First and Last name are required' });

  const combinedName = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  const activeValue = is_active === false ? 0 : 1;

  try {
    const oldPlayer = db.prepare('SELECT name FROM players WHERE id = ?').get(playerId);
    if (!oldPlayer) return res.status(404).json({ error: 'Player not found' });

    db.transaction(() => {
      db.prepare(`
                UPDATE players 
                SET name = ?, first_name = ?, middle_name = ?, last_name = ?, is_active = ?
                WHERE id = ?
            `).run(combinedName, first_name, middle_name || null, last_name, activeValue, playerId);

      if (oldPlayer.name !== combinedName) {
        console.log(`Renaming ${oldPlayer.name} to ${combinedName} in legacy records`);
        db.prepare('UPDATE balls SET striker = ? WHERE striker = ?').run(combinedName, oldPlayer.name);
        db.prepare('UPDATE balls SET non_striker = ? WHERE non_striker = ?').run(combinedName, oldPlayer.name);
        db.prepare('UPDATE balls SET bowler = ? WHERE bowler = ?').run(combinedName, oldPlayer.name);
        db.prepare('UPDATE balls SET dismissed_player = ? WHERE dismissed_player = ?').run(combinedName, oldPlayer.name);
      }
    })();

    res.json({ success: true, name: combinedName });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Another player with this combined name already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a player
app.delete('/api/players/:id', adminRequired, (req, res) => {
  const playerId = parseInt(req.params.id);
  console.log('Processed DELETE request for player ID (int):', playerId);

  if (isNaN(playerId)) {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  try {
    const result = db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
    console.log(`Deleted ${result.changes} player record for ID ${playerId}`);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found in database' });
    }
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (err) {
    console.error('Error during player deletion:', err);
    res.status(500).json({ error: err.message || 'Database error during player deletion' });
  }
});

// Create a new match
app.post('/api/matches', scorerRequired, (req, res) => {
  const { team1_name, team2_name, toss_winner, toss_decision, total_overs, team1_squad, team2_squad, no_extra_runs, joker_player, single_batter, innings_timer_seconds } = req.body;
  const timerInitialSeconds = Number.isFinite(Number(innings_timer_seconds)) && Number(innings_timer_seconds) > 0
    ? Number(innings_timer_seconds)
    : Number(total_overs) * 60;

  try {
    const stmt = db.prepare(`
      INSERT INTO matches (team1_name, team2_name, toss_winner, toss_decision, total_overs, current_innings, status, team1_squad, team2_squad, no_extra_runs, joker_player, single_batter, timer_initial_seconds, innings1_timer_remaining, innings2_timer_remaining, timer_is_paused)
      VALUES (?, ?, ?, ?, ?, 1, 'IN_PROGRESS', ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const info = stmt.run(
      team1_name,
      team2_name,
      toss_winner,
      toss_decision,
      total_overs,
      JSON.stringify(team1_squad || []),
      JSON.stringify(team2_squad || []),
      no_extra_runs ? 1 : 0,
      joker_player || null,
      single_batter ? 1 : 0,
      timerInitialSeconds,
      timerInitialSeconds,
      timerInitialSeconds
    );

    // Create first innings
    const inningsStmt = db.prepare(`
      INSERT INTO innings (match_id, innings_number, team_name)
      VALUES (?, 1, ?)
    `);
    const battingTeam = toss_decision === 'bat' ? toss_winner : (toss_winner === team1_name ? team2_name : team1_name);
    const inningsInfo = inningsStmt.run(info.lastInsertRowid, battingTeam);

    res.json({ match_id: info.lastInsertRowid, current_innings_id: inningsInfo.lastInsertRowid });
  } catch (err) {
    console.error("Error creating match:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/matches/:id/timer', scorerRequired, (req, res) => {
  const matchId = Number(req.params.id);
  const inningsNumber = Number(req.body.innings_number);
  const remainingSeconds = Number(req.body.remaining_seconds);
  const isPaused = req.body.is_paused ? 1 : 0;

  if (!Number.isFinite(matchId) || !Number.isFinite(inningsNumber) || ![1, 2].includes(inningsNumber)) {
    return res.status(400).json({ error: 'Invalid match or innings number' });
  }

  if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) {
    return res.status(400).json({ error: 'Invalid remaining seconds' });
  }

  const clamped = Math.max(0, Math.floor(remainingSeconds));
  const inningsColumn = inningsNumber === 1 ? 'innings1_timer_remaining' : 'innings2_timer_remaining';

  try {
    const result = db.prepare(`UPDATE matches SET ${inningsColumn} = ?, timer_is_paused = ? WHERE id = ?`)
      .run(clamped, isPaused, matchId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating timer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record a ball (Optional: add security here? Let's leave for scorers for now, 
// but user said "totally secure", so let's add it to sensitive ball edits)
app.post('/api/balls', scorerRequired, (req, res) => {
  const body = req.body;

  // 1. Parse IDs and ensure they are valid finite numbers
  const match_id = Number(body.match_id);
  const innings_id = Number(body.innings_id);

  if (!Number.isFinite(match_id) || !Number.isFinite(innings_id)) {
    console.error("FAILED Ball Record: Invalid/Non-finite match_id or innings_id", { match_id, innings_id });
    return res.status(400).json({ error: "Internal Error: Invalid Match or Innings ID received. Please restart the match." });
  }

  // 2. Parse other numeric fields with safe defaults
  const over_number = Number.isFinite(Number(body.over_number)) ? Number(body.over_number) : 1;
  const ball_number = Number.isFinite(Number(body.ball_number)) ? Number(body.ball_number) : 1;
  let runs = Number.isFinite(Number(body.runs)) ? Number(body.runs) : 0;
  let extras = Number.isFinite(Number(body.extras)) ? Number(body.extras) : 0;
  const is_wicket = body.is_wicket ? 1 : 0;

  // 3. Ensure strings are never undefined
  const striker = String(body.striker || 'Unknown');
  const non_striker = String(body.non_striker || '');
  const bowler = String(body.bowler || 'Unknown');
  const extra_type = body.extra_type ? String(body.extra_type) : null;
  const wicket_type = body.wicket_type ? String(body.wicket_type) : null;
  const dismissed_player = body.dismissed_player ? String(body.dismissed_player) : null;
  const fielder = body.fielder ? String(body.fielder) : null;

  console.log(`[Ball Record] Match: ${match_id}, Inn: ${innings_id}, Over: ${over_number}.${ball_number}, Striker: ${striker}, Bowler: ${bowler}`);

  try {
    // Check match settings for no_extra_runs
    const match = db.prepare('SELECT no_extra_runs FROM matches WHERE id = ?').get(match_id);
    let finalExtras = extras;

    if (match && match.no_extra_runs === 1) {
      if (extra_type === 'wide' || extra_type === 'no_ball') {
        finalExtras = 0;
        runs = 0;
      }
    }

    // 4. Final safety check on total runs to be added
    const totalToAdd = Number.isFinite(runs + finalExtras) ? (runs + finalExtras) : runs;

    // Insert ball
    const stmt = db.prepare(`
      INSERT INTO balls (match_id, innings_id, over_number, ball_number, striker, non_striker, bowler, runs, extras, extra_type, is_wicket, wicket_type, dismissed_player, fielder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      match_id, innings_id, over_number, ball_number,
      striker, non_striker, bowler,
      runs, finalExtras, extra_type,
      is_wicket, wicket_type, dismissed_player, fielder
    );

    console.log(`Successfully saved ball ${info.lastInsertRowid}`);

    // Update innings score
    db.prepare(`
      UPDATE innings 
      SET total_runs = total_runs + ?,
          total_wickets = total_wickets + ?
      WHERE id = ?
    `).run(totalToAdd, is_wicket, innings_id);

    res.json({ success: true, ball_id: info.lastInsertRowid });
  } catch (err) {
    console.error("CRITICAL Error inserting ball:", err);
    res.status(500).json({ error: `Server Database Error: ${err.message}` });
  }
});

// Edit a ball
app.put('/api/balls/:id', scorerRequired, (req, res) => {
  const ballId = parseInt(req.params.id);
  let { runs, extras, extra_type, is_wicket, wicket_type, dismissed_player, fielder, striker, non_striker } = req.body;

  try {
    // Get the ball to find its innings_id and current values
    const ball = db.prepare('SELECT * FROM balls WHERE id = ?').get(ballId);
    if (!ball) return res.status(404).json({ error: 'Ball not found' });

    // Partial updates: fallback to existing ball values if missing in request
    const finalRuns = runs !== undefined ? Number(runs) : ball.runs;
    const finalExtras = extras !== undefined ? Number(extras) : ball.extras;
    const finalIsWicket = is_wicket !== undefined ? (is_wicket ? 1 : 0) : ball.is_wicket;

    // If wicket is being removed, clear wicket-related fields
    const finalWicketType = finalIsWicket === 0 ? null : (wicket_type !== undefined ? wicket_type : ball.wicket_type);
    const finalDismissedPlayer = finalIsWicket === 0 ? null : (dismissed_player !== undefined ? dismissed_player : ball.dismissed_player);
    const finalFielder = finalIsWicket === 0 ? null : (fielder !== undefined ? fielder : ball.fielder);
    const finalExtraType = extra_type !== undefined ? extra_type : ball.extra_type;
    const finalStriker = striker !== undefined && striker !== null && String(striker).trim() !== '' ? String(striker) : ball.striker;
    const finalNonStriker = non_striker !== undefined ? (non_striker ? String(non_striker) : '') : ball.non_striker;

    // Update ball
    db.prepare(`
      UPDATE balls 
      SET runs = ?, extras = ?, extra_type = ?, is_wicket = ?, wicket_type = ?, dismissed_player = ?, fielder = ?, striker = ?, non_striker = ?
      WHERE id = ?
    `).run(finalRuns, finalExtras, finalExtraType, finalIsWicket, finalWicketType, finalDismissedPlayer, finalFielder, finalStriker, finalNonStriker, ballId);

    // Recalculate innings totals directly from all balls
    const totals = db.prepare(`
      SELECT 
        SUM(runs + extras) as total_runs, 
        SUM(is_wicket) as total_wickets,
        COUNT(CASE WHEN extra_type IS NULL THEN 1 END) as legal_balls
      FROM balls 
      WHERE innings_id = ?
    `).get(ball.innings_id);

    const legal = totals.legal_balls || 0;
    const oversBowled = Math.floor(legal / 6) + (legal % 6) / 10;

    // Update innings table with new truth
    db.prepare(`
      UPDATE innings 
      SET total_runs = ?, total_wickets = ?, total_overs_bowled = ?
      WHERE id = ?
    `).run(totals.total_runs || 0, totals.total_wickets || 0, oversBowled, ball.innings_id);

    res.json({ success: true, recalculated: totals });
  } catch (err) {
    console.error("Error updating ball:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a ball
app.delete('/api/balls/:id', scorerRequired, (req, res) => {
  const ballId = parseInt(req.params.id);

  try {
    // Get the ball to find its innings_id
    const ball = db.prepare('SELECT innings_id FROM balls WHERE id = ?').get(ballId);
    if (!ball) return res.status(404).json({ error: 'Ball not found' });

    // Delete ball
    db.prepare('DELETE FROM balls WHERE id = ?').run(ballId);

    // Recalculate innings totals directly from all remaining balls
    const totals = db.prepare(`
      SELECT 
        SUM(runs + extras) as total_runs, 
        SUM(is_wicket) as total_wickets,
        COUNT(CASE WHEN extra_type IS NULL THEN 1 END) as legal_balls
      FROM balls 
      WHERE innings_id = ?
    `).get(ball.innings_id);

    const legal = totals.legal_balls || 0;
    const oversBowled = Math.floor(legal / 6) + (legal % 6) / 10;

    // Update innings table with new truth
    db.prepare(`
      UPDATE innings 
      SET total_runs = ?, total_wickets = ?, total_overs_bowled = ?
      WHERE id = ?
    `).run(totals.total_runs || 0, totals.total_wickets || 0, oversBowled, ball.innings_id);

    res.json({ success: true, recalculated: totals });
  } catch (err) {
    console.error("Error deleting ball:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all matches (History) with summarized scores
app.get('/api/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*, 
      (SELECT SUM(total_runs) FROM innings WHERE match_id = m.id AND team_name = m.team1_name) as team1_runs,
      (SELECT SUM(total_wickets) FROM innings WHERE match_id = m.id AND team_name = m.team1_name) as team1_wickets,
      (SELECT SUM(total_runs) FROM innings WHERE match_id = m.id AND team_name = m.team2_name) as team2_runs,
      (SELECT SUM(total_wickets) FROM innings WHERE match_id = m.id AND team_name = m.team2_name) as team2_wickets
    FROM matches m 
    ORDER BY created_at DESC
  `).all();
  res.json(matches);
});

// Get match stats
app.get('/api/matches/:id', (req, res) => {
  const matchId = req.params.id;
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  const innings = db.prepare('SELECT * FROM innings WHERE match_id = ?').all(matchId);
  const balls = db.prepare('SELECT * FROM balls WHERE match_id = ?').all(matchId);

  res.json({ match, innings, balls });
});

// Update match squads
app.put('/api/matches/:id/squads', scorerRequired, (req, res) => {
  const matchId = parseInt(req.params.id);
  const { team1_squad, team2_squad, joker_player } = req.body;

  console.log(`[Squad Update] Match: ${matchId}`, { team1_squad, team2_squad });

  if (isNaN(matchId)) {
    return res.status(400).json({ error: 'Invalid match ID' });
  }

  try {
    const jpUpdate = joker_player !== undefined ? joker_player : null;
    const result = db.prepare('UPDATE matches SET team1_squad = ?, team2_squad = ?, joker_player = ? WHERE id = ?')
      .run(JSON.stringify(team1_squad || []), JSON.stringify(team2_squad || []), jpUpdate, matchId);
    
    console.log(`[Squad Update] Rows affected: ${result.changes}`);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating squads:", err);
    res.status(500).json({ error: err.message });
  }
});

// Alias POST to PUT for squads just in case of frontend/env weirdness
app.post('/api/matches/:id/squads', scorerRequired, (req, res) => {
  // Redirect internal call to the same logic
  const matchId = parseInt(req.params.id);
  const { team1_squad, team2_squad, joker_player } = req.body;
  try {
    const jpUpdate = joker_player !== undefined ? joker_player : null;
    db.prepare('UPDATE matches SET team1_squad = ?, team2_squad = ?, joker_player = ? WHERE id = ?')
      .run(JSON.stringify(team1_squad || []), JSON.stringify(team2_squad || []), jpUpdate, matchId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a match and its related data
app.delete('/api/matches/:id', adminRequired, (req, res) => {
  const matchId = parseInt(req.params.id);
  console.log('Processed DELETE request for match ID (int):', matchId);

  if (isNaN(matchId)) {
    return res.status(400).json({ error: 'Invalid match ID' });
  }

  try {
    const deleteTransaction = db.transaction((id) => {
      // Delete balls first
      const ballsResult = db.prepare('DELETE FROM balls WHERE match_id = ?').run(id);
      console.log(`[ID: ${id}] Deleted ${ballsResult.changes} balls`);

      // Delete innings
      const inningsResult = db.prepare('DELETE FROM innings WHERE match_id = ?').run(id);
      console.log(`[ID: ${id}] Deleted ${inningsResult.changes} innings`);

      // Delete match record
      const matchResult = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
      console.log(`[ID: ${id}] Deleted match record (Rows affected: ${matchResult.changes})`);

      if (matchResult.changes === 0) {
        throw new Error('Match record not found in database');
      }
    });

    deleteTransaction(matchId);
    console.log(`Successfully completed deletion of match ${matchId}`);
    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (err) {
    console.error(`Match deletion failed for ID ${matchId}:`, err);
    res.status(500).json({ error: err.message || 'Database error during deletion' });
  }
});

// Update innings target / end innings
app.post('/api/innings/end', scorerRequired, (req, res) => {
  const { match_id, current_innings_id, next_batting_team, target_score, innings1_timer_seconds } = req.body;
  const innings1Timer = Number(innings1_timer_seconds);

  // Update match current_innings
  db.prepare('UPDATE matches SET current_innings = 2 WHERE id = ?').run(match_id);

  // Persist final innings 1 timer in the same request to avoid race/loss.
  if (Number.isFinite(innings1Timer) && innings1Timer >= 0) {
    db.prepare('UPDATE matches SET innings1_timer_remaining = ?, timer_is_paused = 1 WHERE id = ?')
      .run(Math.floor(innings1Timer), match_id);
  }

  // Update current innings target (just to store what they made + 1 for second innings context)
  db.prepare('UPDATE innings SET target_score = ? WHERE id = ?').run(target_score, current_innings_id);

  // Create second innings
  const inningsStmt = db.prepare(`
    INSERT INTO innings (match_id, innings_number, team_name, target_score)
    VALUES (?, 2, ?, ?)
  `);
  const newInnings = inningsStmt.run(match_id, next_batting_team, target_score);

  res.json({ success: true, new_innings_id: newInnings.lastInsertRowid });
});

// Finish Match
app.post('/api/matches/:id/finish', scorerRequired, (req, res) => {
  const innings2Timer = Number(req.body?.innings2_timer_seconds);
  if (Number.isFinite(innings2Timer) && innings2Timer >= 0) {
    db.prepare("UPDATE matches SET status = 'FINISHED', innings2_timer_remaining = ?, timer_is_paused = 1 WHERE id = ?")
      .run(Math.floor(innings2Timer), req.params.id);
  } else {
    db.prepare("UPDATE matches SET status = 'FINISHED' WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

// Single-Scorer Locking Endpoint
app.post('/api/matches/:id/lock', (req, res) => {
  const matchId = parseInt(req.params.id);
  const { session_id, force } = req.body;
  const adminHeader = req.headers['x-admin-password'];
  const isAdmin = adminHeader === process.env.ADMIN_PASSWORD;

  if (isNaN(matchId) || !session_id) {
    return res.status(400).json({ error: 'Invalid match or session' });
  }

  const now = Date.now();
  const currentLock = matchLocks.get(matchId);

  // If locked by someone else recently (last 15 seconds)
  if (currentLock && currentLock.sessionId !== session_id && (now - currentLock.lastPing < 15000)) {
    if (isAdmin && force) {
      // Force override by Admin
      matchLocks.set(matchId, { sessionId: session_id, lastPing: now });
      return res.json({ success: true, message: 'Forced lock' });
    } else {
      return res.status(403).json({ error: 'Match is currently locked by another scorer. Admin privileges required to override.' });
    }
  }

  // Otherwise, grant or renew the lock
  matchLocks.set(matchId, { sessionId: session_id, lastPing: now });
  res.json({ success: true });
});

// --- Static Assets (Production Only) ---
// Serve the built client files if they exist
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Handle React routing (serve index.html for unknown routes)
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
