import { useState } from 'react';

interface DetailedScorecardProps {
    match: any;
    innings: any[];
    balls: any[];
}

export default function DetailedScorecard({ match, innings, balls }: DetailedScorecardProps) {
    const [activeInningsIdx, setActiveInningsIdx] = useState(0);
    const [selectedBowler, setSelectedBowler] = useState<string | null>(null);

    if (!innings || innings.length === 0) return <div>No innings data available.</div>;

    const currentInns = innings[activeInningsIdx];
    const innBalls = balls.filter(b => b.innings_id === currentInns.id);

    // Get squad for the batting team
    let battingSquad: string[] = [];
    try {
        const squadStr = currentInns.team_name === match.team1_name ? match.team1_squad : match.team2_squad;
        battingSquad = typeof squadStr === 'string' ? JSON.parse(squadStr) : (squadStr || []);
    } catch (e) {
        console.error("Failed to parse squad", e);
    }

    // --- BATTING STATS ---
    const batters = new Map<string, any>();
    const fow: any[] = [];
    let extras = { w: 0, nb: 0, total: 0 };

    innBalls.forEach(b => {
        // Init batter if not exists
        if (!batters.has(b.striker)) {
            batters.set(b.striker, { name: b.striker, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out', isOut: false, fowOrder: 0 });
        }
        if (b.non_striker && !batters.has(b.non_striker)) {
            batters.set(b.non_striker, { name: b.non_striker, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out', isOut: false, fowOrder: 0 });
        }

        const s = batters.get(b.striker);
        // Balls faced (don't count wides)
        if (b.extra_type !== 'wide') s.balls++;
        s.runs += b.runs;
        if (b.runs === 4) s.fours++;
        if (b.runs === 6) s.sixes++;

        // Extras
        if (b.extra_type === 'wide') { extras.w += b.extras; extras.total += b.extras; }
        else if (b.extra_type === 'no_ball') { extras.nb += b.extras; extras.total += b.extras; }

        // Wicket
        if (b.is_wicket) {
            const dismissed = b.dismissed_player || b.striker;
            const d = batters.get(dismissed) || s;
            d.isOut = true;
            
            let desc = '';
            if (b.wicket_type === 'bowled') desc = `b ${b.bowler}`;
            else if (b.wicket_type === 'caught') desc = `c ${b.fielder || 'fielder'} b ${b.bowler}`;
            else if (b.wicket_type === 'lbw') desc = `lbw b ${b.bowler}`;
            else if (b.wicket_type === 'run_out') desc = `run out (${b.fielder || 'fielder'})`;
            else if (b.wicket_type === 'stumped') desc = `st b ${b.fielder || 'fielder'} b ${b.bowler}`;
            else desc = `out b ${b.bowler}`;
            
            d.dismissal = desc;
            
            // FOW record
            // Calculate total runs at the exact moment of this wicket
            const ballIndexInInnings = innBalls.indexOf(b);
            const currentTotalRuns = innBalls.slice(0, ballIndexInInnings + 1)
                .reduce((sum, ball) => sum + ball.runs + ball.extras, 0);

            fow.push({
                num: fow.length + 1,
                score: currentTotalRuns,
                player: dismissed,
                over: `${b.over_number}.${b.ball_number}`
            });
        }
    });

    const didNotBat = battingSquad.filter(name => !batters.has(name));

    // --- BOWLING STATS ---
    const bowlers = new Map<string, any>();

    innBalls.forEach(b => {
        if (!bowlers.has(b.bowler)) {
            bowlers.set(b.bowler, { name: b.bowler, balls: 0, maidens: 0, runs: 0, wickets: 0, dots: 0, fours: 0, sixes: 0, wd: 0, nb: 0 });
        }
        const bw = bowlers.get(b.bowler);
        
        // Legal balls
        if (b.extra_type === null) {
            bw.balls++;
        }

        // Runs conceded (wides and no-balls count against bowler)
        if (b.extra_type === 'wide' || b.extra_type === 'no_ball') {
            bw.runs += (b.runs + b.extras);
            if (b.extra_type === 'wide') bw.wd++;
            if (b.extra_type === 'no_ball') bw.nb++;
        } else {
            bw.runs += b.runs;
        }

        if (b.is_wicket && b.wicket_type !== 'run_out') {
            bw.wickets++;
        }

        if (b.runs === 0 && b.extras === 0) bw.dots++;
        if (b.runs === 4) bw.fours++;
        if (b.runs === 6) bw.sixes++;
    });

    // Calculate Maidens
    const overMap = new Map<string, any[]>();
    innBalls.forEach(b => {
        const key = `${b.bowler}-${b.over_number}`;
        if (!overMap.has(key)) overMap.set(key, []);
        overMap.get(key)!.push(b);
    });

    overMap.forEach((osBalls, key) => {
        const bowlerName = key.split('-')[0];
        const bw = bowlers.get(bowlerName);
        const runsInOver = osBalls.reduce((sum, b) => {
            // Maidens are usually defined as overs where no runs are scored from the bat 
            // AND no wides/no-balls are bowled.
            const isWideOrNB = b.extra_type === 'wide' || b.extra_type === 'no_ball';
            return sum + b.runs + (isWideOrNB ? b.extras : 0);
        }, 0);
        
        const legalBalls = osBalls.filter(b => b.extra_type === null).length;
        if (runsInOver === 0 && legalBalls === 6) {
            bw.maidens++;
        }
    });

    const totalRuns = innBalls.reduce((acc, b) => acc + b.runs + b.extras, 0);
    const totalWickets = innBalls.filter(b => b.is_wicket).length;
    const legalTotal = innBalls.filter(b => b.extra_type === null).length;
    const oversTotal = `${Math.floor(legalTotal / 6)}.${legalTotal % 6}`;

    return (
        <div className="flex-col gap-6 w-full">
            {/* Innings Tabs */}
            <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
                {innings.map((inn, idx) => (
                    <button 
                        key={inn.id} 
                        className="btn"
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            background: activeInningsIdx === idx ? 'var(--bg-tertiary)' : 'transparent',
                            color: activeInningsIdx === idx ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeInningsIdx === idx ? '3px solid var(--accent-primary)' : '3px solid transparent',
                            borderRadius: '8px 8px 0 0',
                            fontWeight: 600
                        }}
                        onClick={() => setActiveInningsIdx(idx)}
                    >
                        {inn.team_name}
                    </button>
                ))}
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: "hidden" }}>
                {/* Batting Header & List */}
                <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
                    <div style={{ minWidth: "600px" }}>
                        <div style={{ 
                            background: "rgba(255,255,255,0.03)", 
                            padding: "0.75rem 1.5rem", 
                            borderBottom: "1px solid var(--border-light)", 
                            display: "grid", 
                            gridTemplateColumns: "1fr 50px 50px 40px 40px 60px", 
                            gap: "1rem", 
                            alignItems: "center" 
                        }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Batting</span>
                            <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>R</span>
                            <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>B</span>
                            <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>4s</span>
                            <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>6s</span>
                            <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>SR</span>
                        </div>

                        <div className="flex-col">
                            {Array.from(batters.values()).map(b => (
                                <div key={b.name} style={{ 
                                    padding: "1rem 1.5rem", 
                                    borderBottom: "1px solid rgba(255,255,255,0.05)", 
                                    display: "grid", 
                                    gridTemplateColumns: "1fr 50px 50px 40px 40px 60px", 
                                    gap: "1rem", 
                                    alignItems: "center" 
                                }}>
                                    <div className="flex-col" style={{ gap: "4px" }}>
                                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                                            {b.name} {match.joker_player === b.name && <span style={{ color: "var(--accent-warning)", fontSize: "0.75rem" }}>(J)</span>}
                                        </span>
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>{b.dismissal}</span>
                                    </div>
                                    <span style={{ textAlign: "right", fontWeight: 700 }}>{b.runs}</span>
                                    <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{b.balls}</span>
                                    <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{b.fours}</span>
                                    <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{b.sixes}</span>
                                    <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : "0.00"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Extras & Total Row */}
                <div className="ds-extras-total">
                    <div className="flex-between ds-extras-row">
                        <span className="ds-extras-label">Extras</span>
                        <span className="ds-extras-value">{extras.total} <span className="ds-extras-breakup">(w {extras.w}, nb {extras.nb})</span></span>
                    </div>
                    <div className="flex-between ds-total-row">
                        <span className="ds-total-label">Total</span>
                        <span className="ds-total-value">
                            {totalRuns}/{totalWickets} <span className="ds-total-meta">({oversTotal} ov, RR: {legalTotal > 0 ? ((totalRuns / legalTotal) * 6).toFixed(2) : "0.00"})</span>
                        </span>
                    </div>
                </div>

                {/* Did Not Bat */}
                {didNotBat.length > 0 && (
                    <div className="ds-dnb-row">
                        <span className="ds-dnb-label">DID NOT BAT:</span>
                        <span className="ds-dnb-value">{didNotBat.join(", ")}</span>
                    </div>
                )}
            </div>

            {/* Fall of Wickets */}
            {fow.length > 0 && (
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h4 style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>Fall of Wickets</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.85rem" }}>
                        {fow.map((f, i) => (
                            <span key={i} style={{ background: "rgba(255,255,255,0.05)", padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <strong>{f.num}-{f.score}</strong> ({f.player}, {f.over} ov)
                                {i < fow.length - 1 && <span style={{ marginLeft: "8px", opacity: 0.3 }}>|</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Bowling Table */}
            <div className="glass-panel ds-bowling-panel">
                <div className="ds-table-scroll">
                    <div className="ds-bowling-table">
                        <div className="ds-bowling-head">
                            <span 
                                className="ds-bowling-head-title"
                                onClick={() => setSelectedBowler(null)}
                            >
                                Bowling {selectedBowler && <span className="ds-bowling-clear">(Clear Filter)</span>}
                            </span>
                            <span className="ds-bowling-head-cell">O</span>
                            <span className="ds-bowling-head-cell">M</span>
                            <span className="ds-bowling-head-cell">R</span>
                            <span className="ds-bowling-head-cell">W</span>
                            <span className="ds-bowling-head-cell">ECON</span>
                            <span className="ds-bowling-head-cell">0s</span>
                            <span className="ds-bowling-head-cell">4s</span>
                            <span className="ds-bowling-head-cell">6s</span>
                            <span className="ds-bowling-head-cell">WD</span>
                            <span className="ds-bowling-head-cell">NB</span>
                        </div>

                        <div className="flex-col">
                            {Array.from(bowlers.values()).map(bw => {
                                const overs = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
                                const econ = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(2) : "0.00";
                                return (
                                    <div key={bw.name} className={`ds-bowling-row ${selectedBowler === bw.name ? 'is-selected' : ''}`}>
                                        <span 
                                            className={`ds-bowler-name ${selectedBowler === bw.name ? 'is-selected' : ''}`}
                                            onClick={() => setSelectedBowler(selectedBowler === bw.name ? null : bw.name)}
                                        >
                                            {bw.name}
                                        </span>
                                        <span className="ds-bowling-cell is-strong">{overs}</span>
                                        <span className="ds-bowling-cell is-muted">{bw.maidens}</span>
                                        <span className="ds-bowling-cell is-strong">{bw.runs}</span>
                                        <span className="ds-bowling-cell is-wickets">{bw.wickets}</span>
                                        <span className="ds-bowling-cell is-muted">{econ}</span>
                                        <span className="ds-bowling-cell is-fine">{bw.dots}</span>
                                        <span className="ds-bowling-cell is-fine">{bw.fours}</span>
                                        <span className="ds-bowling-cell is-fine">{bw.sixes}</span>
                                        <span className="ds-bowling-cell is-fine">{bw.wd}</span>
                                        <span className="ds-bowling-cell is-fine">{bw.nb}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overs Summary */}
            <div className="glass-panel ds-over-summary-panel">
                <div className="flex-between ds-over-summary-head">
                    <h4 className="ds-over-summary-title">Overs Summary</h4>
                    {selectedBowler && (
                        <span 
                            className="ds-over-summary-filter"
                            onClick={() => setSelectedBowler(null)}
                        >
                            Showing {selectedBowler}'s Overs (View All)
                        </span>
                    )}
                </div>
                <div className="flex-col ds-over-summary-list">
                    {Array.from(overMap.entries())
                        .filter(([key]) => !selectedBowler || key.startsWith(`${selectedBowler}-`))
                        .sort((a, b) => {
                            const splitA = a[0].lastIndexOf('-');
                            const splitB = b[0].lastIndexOf('-');
                            const overA = parseInt(a[0].slice(splitA + 1), 10);
                            const overB = parseInt(b[0].slice(splitB + 1), 10);
                            return overA - overB;
                        }).map(([key, osBalls]) => {
                            const splitIdx = key.lastIndexOf('-');
                            const bowlerName = key.slice(0, splitIdx);
                            const overNum = key.slice(splitIdx + 1);
                            return (
                                <div key={key} className="ds-over-row">
                                    <span className="ds-over-num">Over {overNum}</span>
                                    <div className="ds-over-balls">
                                        {osBalls.map((b, i) => {
                                            let label = b.runs.toString();
                                            let ballBg = "rgba(255,255,255,0.05)";
                                            let ballColor = "white";

                                            if (b.is_wicket) { 
                                                ballBg = "var(--accent-danger)"; 
                                                ballColor = "white"; 
                                                label = "W"; 
                                            } else if (b.runs === 4) { 
                                                ballBg = "rgba(52, 152, 219, 0.2)"; 
                                                ballColor = "var(--accent-primary)"; 
                                            } else if (b.runs === 6) { 
                                                ballBg = "rgba(155, 89, 182, 0.2)"; 
                                                ballColor = "#9b59b6"; 
                                            } else if (b.extra_type === 'wide') { 
                                                ballBg = "rgba(241, 196, 15, 0.1)"; 
                                                ballColor = "#f1c40f"; 
                                                label = b.runs + "w";
                                            } else if (b.extra_type === 'no_ball') { 
                                                ballBg = "rgba(231, 76, 60, 0.1)"; 
                                                ballColor = "#e74c3c"; 
                                                label = b.runs + "n";
                                            }

                                            return (
                                                <span key={i} title={b.label} className="ds-over-ball" style={{ 
                                                    width: "28px", 
                                                    height: "28px", 
                                                    display: "flex", 
                                                    alignItems: "center", 
                                                    justifyContent: "center", 
                                                    borderRadius: "50%", 
                                                    background: ballBg, 
                                                    color: ballColor,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 800,
                                                    border: "1px solid rgba(255,255,255,0.1)"
                                                }}>
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <span 
                                        className="ds-over-bowler"
                                        onClick={() => setSelectedBowler(bowlerName)}
                                    >
                                        {bowlerName}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
