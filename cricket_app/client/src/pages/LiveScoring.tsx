import React, { useState, useEffect, useRef } from 'react';
import { useMatch, SCORER_SESSION_ID } from '../store/MatchContext';
import DetailedScorecard from '../components/DetailedScorecard';
import PlayerCardSelector from '../components/PlayerCardSelector';

function WicketActionIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="ls-wicket-icon">
            <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="9" x2="7" y2="18" />
                <line x1="12" y1="9" x2="12" y2="18" />
                <line x1="17" y1="9" x2="17" y2="18" />
                <line x1="5.7" y1="9" x2="8.3" y2="9" />
                <line x1="10.7" y1="9" x2="13.3" y2="9" />
                <line x1="15.7" y1="9" x2="18.3" y2="9" />
                <circle cx="16.8" cy="5.3" r="2.1" />
                <path d="M15.8 4.5c.9.2 1.7.9 2 1.8" />
            </g>
        </svg>
    );
}

export default function LiveScoring() {
    const { state, dispatch } = useMatch();
    const celebrationTimeoutRef = useRef<number | null>(null);
    const [celebrationType, setCelebrationType] = useState<4 | 6 | 'W' | null>(null);
    const stopWheelPropagation = (e: React.WheelEvent<HTMLSelectElement>) => {
        e.stopPropagation();
    };
    const [showInningsBreak, setShowInningsBreak] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [appError, setAppError] = useState<string | null>(null);

    // Lock Heartbeat Ping
    useEffect(() => {
        if (!state.matchId || !state.scorerPassword || appError) return;

        const pingLock = async () => {
            try {
                const res = await fetch(`/api/matches/${state.matchId}/lock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: SCORER_SESSION_ID })
                });
                
                if (res.status === 403) {
                    setAppError("ACCESS REVOKED: An Admin has forcefully taken over scoring for this match. You can no longer make edits.");
                }
            } catch (err) {
                console.error("Failed to ping lock:", err);
            }
        };

        // Ping immediately on mount, then every 10 seconds
        pingLock();
        const interval = setInterval(pingLock, 10000);
        return () => clearInterval(interval);
    }, [state.matchId, state.scorerPassword, appError]);

    const crr = state.score.oversBowled > 0 ? (state.score.runs / state.score.oversBowled).toFixed(2) : '0.00';
    const isSecondInnings = state.status === 'INNINGS_BREAK' || state.currentInningsId !== null && state.target !== null;
    const reqRate = isSecondInnings && state.target && state.config.overs - state.score.oversBowled > 0
        ? ((state.target - state.score.runs) / (state.config.overs - state.score.oversBowled)).toFixed(2)
        : '0.00';
    
    // Remaining balls for chase scenarios
    const remainingBalls = (state.config.overs * 6) - (Math.floor(state.score.oversBowled) * 6 + Math.round((state.score.oversBowled % 1) * 10));
    const runsRequired = state.target ? state.target - state.score.runs : 0;



    const [needsNextBatter, setNeedsNextBatter] = useState(false);
    const [needsNextBowler, setNeedsNextBowler] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editBalls, setEditBalls] = useState<any[]>([]);
    const [editingBallId, setEditingBallId] = useState<number | null>(null);
    const [editRuns, setEditRuns] = useState<number>(0);
    const [editIsWicket, setEditIsWicket] = useState<boolean>(false);
    const [editWicketType, setEditWicketType] = useState<string>('bowled');
    const [editDismissedPlayer, setEditDismissedPlayer] = useState<string>('');
    const [editFielder, setEditFielder] = useState<string>('');
    const [editBallStriker, setEditBallStriker] = useState<string>('');
    const [editBallNonStriker, setEditBallNonStriker] = useState<string>('');
    const [editRunsScoredBy, setEditRunsScoredBy] = useState<string>('');
    
    // Wicket Modal State
    const [showWicketModal, setShowWicketModal] = useState(false);
    const [wicketType, setWicketType] = useState<string>('bowled');
    const [dismissedPlayer, setDismissedPlayer] = useState<string>('');
    const [fielder, setFielder] = useState<string>('');
    // Store the ID of the second innings created on the server
    const [secondInningsId, setSecondInningsId] = useState<number | null>(null);
    // Change Player state
    const [changingPlayerType, setChangingPlayerType] = useState<'striker' | 'non-striker' | 'bowler' | null>(null);
    // Derive which team is batting based on toss and current innings status
    const isFirstInnings = state.target === null;
    const battingFirst = (state.toss.winner === state.teams.team1 && state.toss.decision === 'bat') ||
        (state.toss.winner === state.teams.team2 && state.toss.decision === 'bowl')
        ? state.teams.team1
        : state.teams.team2;

    const battingTeam = isFirstInnings ? battingFirst : (battingFirst === state.teams.team1 ? state.teams.team2 : state.teams.team1);
    const bowlingTeam = battingTeam === state.teams.team1 ? state.teams.team2 : state.teams.team1;

    // In INNINGS_BREAK, the 'battingTeam' variable above actually points to the team that *just batted*.
    // So for the second innings setup, we need the *next* batting team.
    const nextBattingTeam = state.toss.decision === 'bat'
        ? (state.toss.winner === state.teams.team1 ? state.teams.team2 : state.teams.team1)
        : state.toss.winner;
    const nextBowlingTeam = nextBattingTeam === state.teams.team1 ? state.teams.team2 : state.teams.team1;

    const battingSquad = battingTeam === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;
    const bowlingSquad = bowlingTeam === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;

    const nextBattingSquad = nextBattingTeam === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;
    const nextBowlingSquad = nextBowlingTeam === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;

    const [nextBatterInput, setNextBatterInput] = useState('');
    const [nextBatter2Input, setNextBatter2Input] = useState('');
    const [nextBowlerInput, setNextBowlerInput] = useState('');

    const [d1, setD1] = useState('');
    const [d2, setD2] = useState('');
    const [b1, setB1] = useState('');

    // Squad management state
    const [showEditSquadsModal, setShowEditSquadsModal] = useState(false);
    const [tempTeam1Squad, setTempTeam1Squad] = useState<string[]>([]);
    const [tempTeam2Squad, setTempTeam2Squad] = useState<string[]>([]);
    const [tempJokerPlayer, setTempJokerPlayer] = useState<string | null>(null);
    const [availablePlayersForSquad, setAvailablePlayersForSquad] = useState<{ id: number, name: string }[]>([]);

    const triggerCelebration = (type: 4 | 6 | 'W') => {
        setCelebrationType(type);

        if (celebrationTimeoutRef.current) {
            window.clearTimeout(celebrationTimeoutRef.current);
        }

        celebrationTimeoutRef.current = window.setTimeout(() => {
            setCelebrationType(null);
            celebrationTimeoutRef.current = null;
        }, 2000);
    };

    useEffect(() => {
        return () => {
            if (celebrationTimeoutRef.current) {
                window.clearTimeout(celebrationTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (showEditSquadsModal) {
            fetch('/api/players')
                .then(res => res.json())
                .then(data => setAvailablePlayersForSquad((data as any[]).filter(p => p.is_active !== 0)))
                .catch(console.error);
            setTempTeam1Squad(state.teams.team1_squad);
            setTempTeam2Squad(state.teams.team2_squad);
            setTempJokerPlayer(state.config.jokerPlayer);
        }
    }, [showEditSquadsModal, state.teams.team1_squad, state.teams.team2_squad, state.config.jokerPlayer]);

    const handleAction = async (runs: number, label: string, extras = 0, isWicket = false, customWicketType: string | null = null, customDismissedPlayer: string | null = null, customFielder: string | null = null) => {
        const isWideOrNoBall = label === 'Wd' || label === 'Nb';
        const finalRuns = state.config.noExtraRuns && isWideOrNoBall ? 0 : runs;
        const finalExtras = state.config.noExtraRuns && isWideOrNoBall ? 0 : extras;

        // API Call
        try {
            const res = await fetch('/api/balls', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-scorer-password': state.scorerPassword
                },
                body: JSON.stringify({
                    match_id: state.matchId,
                    innings_id: state.currentInningsId,
                    over_number: Math.floor(state.score.oversBowled) + 1,
                    ball_number: state.thisOver.length + 1,
                    striker: state.currentBatter,
                    non_striker: state.nonStriker,
                    bowler: state.currentBowler,
                    runs: finalRuns,
                    extras: finalExtras,
                    extra_type: label === 'Wd' ? 'wide' : label === 'Nb' ? 'no_ball' : null,
                    is_wicket: isWicket,
                    wicket_type: isWicket ? (customWicketType || 'caught') : null,
                    dismissed_player: isWicket ? (customDismissedPlayer || state.currentBatter) : null,
                    fielder: isWicket ? customFielder : null
                })
            });

            const responseStatus = res.ok;
            if (!responseStatus) {
                let errorMsg = "Unknown error";
                try {
                    const errData = await res.json();
                    errorMsg = errData.error || "Ball could not be saved";
                } catch (e) {
                    errorMsg = await res.text() || "Server error";
                }
                console.error("Failed to save ball:", errorMsg);
                setAppError(`CRITICAL ERROR: ${errorMsg}\n\nScoring has been paused.`);
                return; // STOP scoring locally if server fails
            }

            dispatch({ type: 'ADD_BALL', payload: { runs: finalRuns, extras: finalExtras, isWicket, label } });

            if (isWicket) {
                triggerCelebration('W');
            } else if (finalRuns === 4 || finalRuns === 6) {
                triggerCelebration(finalRuns);
            }

            // We need to calculate the *new* score directly here to pass to handleInningsBreak,
            // because state.score.runs is stale in this closure.
            const newTotalRuns = state.score.runs + finalRuns + finalExtras;

            // Check Innings End
            if (isWicket && state.score.wickets + 1 >= 10) {
                handleInningsBreak(newTotalRuns);
                return;
            }

            const isLegal = extras === 0;
            const newLegalBalls = state.score.legalBalls + (isLegal ? 1 : 0);

            if (newLegalBalls > 0 && newLegalBalls % 6 === 0 && isLegal) {
                if (newLegalBalls / 6 >= state.config.overs) {
                    handleInningsBreak(newTotalRuns);
                } else {
                    setNeedsNextBowler(true);
                }
            }

            if (isWicket && state.score.wickets + 1 < 10) {
                setNeedsNextBatter(true);
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleInningsBreak = async (finalRuns?: number) => {
        if (!state.target) {
            // End of 1st Innings
            // Use the freshly calculated runs from handleAction if provided, 
            // otherwise fallback to state (e.g. if somehow called outside handleAction)
            const actualRuns = finalRuns !== undefined ? finalRuns : state.score.runs;
            const target = actualRuns + 1;
            const nextTeam = state.toss.decision === 'bat'
                ? (state.toss.winner === state.teams.team1 ? state.teams.team2 : state.teams.team1)
                : state.toss.winner;

            try {
                const res = await fetch('/api/innings/end', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-scorer-password': state.scorerPassword
                    },
                    body: JSON.stringify({
                        match_id: state.matchId,
                        current_innings_id: state.currentInningsId,
                        next_batting_team: nextTeam,
                        target_score: target
                    })
                });
                const data = await res.json(); // expects { new_innings_id: number }
                
                if (!res.ok) {
                    alert(`Failed to end innings: ${data.error || 'Unknown error'}`);
                    return;
                }

                // Store the newly created innings ID for later use when the user selects openers
                setSecondInningsId(data.new_innings_id);
                setShowInningsBreak(true);
                dispatch({ type: 'INNINGS_BREAK', payload: { target } });

            } catch (err: any) { 
                console.error(err); 
                alert(`Error ending innings: ${err.message}`);
            }
        } else {
            // End of Match
            let winner;
            const actualRuns = finalRuns !== undefined ? finalRuns : state.score.runs;

            if (actualRuns >= state.target) winner = "Batting Team"; // Simplify
            else if (actualRuns === state.target - 1) winner = "Tie";
            else winner = "Bowling Team";

            try {
                const res = await fetch(`/api/matches/${state.matchId}/finish`, {
                    method: 'POST',
                    headers: {
                        'x-scorer-password': state.scorerPassword
                    }
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(`Failed to finish match: ${data.error || 'Unknown error'}`);
                    return;
                }
                dispatch({ type: 'FINISH_MATCH', payload: { winner } });
            } catch (err: any) {
                console.error(err);
                alert(`Error finishing match: ${err.message}`);
            }
        }
    };

    const startSecondInnings = (e: React.FormEvent) => {
        e.preventDefault();
        if (d1 && b1) {
            setShowInningsBreak(false);
            setNeedsNextBatter(false);
            setNeedsNextBowler(false);
            dispatch({
                type: 'START_SECOND_INNINGS',
                payload: { inningsId: secondInningsId as number, batter1: d1, batter2: d2 || '', bowler: b1 }
            });
        }
    };

    const submitNextBatter = (e: React.FormEvent) => {
        e.preventDefault();
        if (nextBatterInput) {
            const payload: any = { nextBatter: nextBatterInput };
            if (nextBatter2Input) {
                payload.nonStriker = nextBatter2Input;
            } else if (!state.nonStriker && !state.currentBatter && battingSquad.length > 1) {
                // If both were missing but they only picked one, but more are available, 
                // we might want to stay in current state? No, let's just allow it.
            }
            dispatch({ type: 'WICKET', payload });
            setNeedsNextBatter(false);
            setNextBatterInput('');
            setNextBatter2Input('');
        }
    };

    const submitNextBowler = (e: React.FormEvent) => {
        e.preventDefault();
        if (nextBowlerInput) {
            dispatch({ type: 'END_OVER', payload: { nextBowler: nextBowlerInput } });
            setNeedsNextBowler(false);
            setNextBowlerInput('');
        }
    };

    const openEditModal = async () => {
        if (!state.matchId || !state.currentInningsId) return;
        try {
            const res = await fetch(`/api/matches/${state.matchId}`);
            const data = await res.json();
            const currentInningsBalls = data.balls.filter((b: any) => b.innings_id === state.currentInningsId);
            setEditBalls(currentInningsBalls);
            setShowEditModal(true);
        } catch (err) {
            console.error("Failed to fetch match balls:", err);
        }
    };

    const syncMatchFromDatabase = async () => {
        try {
            const matchRes = await fetch(`/api/matches/${state.matchId}`);
            const matchData = await matchRes.json();

            dispatch({
                type: 'RESUME_MATCH',
                payload: matchData
            });
        } catch (err) {
            console.error("Failed to sync match state:", err);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/balls/${editingBallId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-scorer-password': state.scorerPassword
                },
                body: JSON.stringify({
                    runs: editRuns,
                    striker: editRunsScoredBy || editBallStriker,
                    non_striker: editBallNonStriker || null,
                    is_wicket: editIsWicket,
                    wicket_type: editIsWicket ? editWicketType : null,
                    dismissed_player: editIsWicket ? editDismissedPlayer : null,
                    fielder: editIsWicket && (editWicketType === 'caught' || editWicketType === 'run_out') ? editFielder || null : null
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save changes');
            }

            await syncMatchFromDatabase();
            setEditingBallId(null);
            setShowEditModal(false);
        } catch (err: any) {
            console.error("Client Error in handleEditSubmit:", err);
            setAppError(`FAILED TO SAVE: ${err.message || 'Unknown Error'}`);
        }
    };

    const [ballToDelete, setBallToDelete] = useState<number | null>(null);

    const handleDeleteBall = async (ballId: number) => {
        try {
            const res = await fetch(`/api/balls/${ballId}`, {
                method: 'DELETE',
                headers: {
                    'x-scorer-password': state.scorerPassword
                }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            await syncMatchFromDatabase();
            setBallToDelete(null);

            // If deleting from the list view (not form view)
            if (!editingBallId) {
                openEditModal();
            } else {
                setEditingBallId(null);
                setShowEditModal(false);
            }
        } catch (err: any) {
            console.error("Error deleting ball:", err);
            setAppError("Failed to delete ball record. Please check server status.");
        }
    };

    const handleUpdateSquads = async () => {
        try {
            const res = await fetch(`/api/matches/${state.matchId}/squads`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-scorer-password': state.scorerPassword
                },
                body: JSON.stringify({
                    team1_squad: tempTeam1Squad,
                    team2_squad: tempTeam2Squad,
                    joker_player: tempJokerPlayer
                })
            });

            if (!res.ok) throw new Error('Failed to update squads');

            dispatch({
                type: 'UPDATE_SQUADS',
                payload: {
                    team1_squad: tempTeam1Squad,
                    team2_squad: tempTeam2Squad,
                    jokerPlayer: tempJokerPlayer
                }
            });
            setShowEditSquadsModal(false);
        } catch (err) {
            console.error(err);
            setAppError("Failed to update squads.");
        }
    };

    useEffect(() => {
        if (state.status === 'IN_PROGRESS' && state.innings.length === 2 && state.target && state.score.runs >= state.target) {
            handleInningsBreak(state.score.runs);
        }
    }, [state.score.runs, state.target, state.status, state.innings.length]);

    useEffect(() => {
        if (state.status === 'IN_PROGRESS') {
            if ((!state.currentBatter || (!state.nonStriker && battingSquad.length > 1)) && battingSquad.length > 0 && state.score.wickets < 10) {
                setNeedsNextBatter(true);
            }
            // If the over just ended and we resumed, thisOver will be empty, legalBalls > 0.
            // needsNextBowler should trigger.
            if (!state.currentBowler && bowlingSquad.length > 0) {
                setNeedsNextBowler(true);
            }
        }
    }, [state.status, state.currentBatter, state.currentBowler, battingSquad.length, bowlingSquad.length]);

    if (showInningsBreak || state.status === 'INNINGS_BREAK') {
        return (
            <div className="glass-panel ls-ib-shell">
                <h2 className="text-gradient ls-ib-title">Innings Break</h2>

                <div className="ls-ib-target-card">
                    <p className="ls-ib-target-label">Target</p>
                    <p className="ls-ib-target-text"><span className="ls-ib-target-value">{state.target}</span> in {state.config.overs} overs</p>
                </div>

                <form onSubmit={startSecondInnings} className="flex-col gap-4 text-left">
                    <div className="glass-card ls-ib-section-card">
                        <h4 className="ls-ib-section-title">Opening Batters: {nextBattingTeam}</h4>
                        <div className="flex-col gap-2">
                            <label>Striker</label>
                            <PlayerCardSelector
                                options={nextBattingSquad}
                                value={d1}
                                ariaLabel="Select innings break striker"
                                disabledOptions={d2 ? [d2] : []}
                                listClassName="ls-ib-list"
                                onChange={(nextStriker) => {
                                    setD1(nextStriker);
                                    if (d2 && d2 === nextStriker) {
                                        setD2('');
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-col gap-2 ls-ib-subsection">
                            <label>Non-Striker <span className="ms-toss-optional">(Optional)</span></label>
                            <PlayerCardSelector
                                options={nextBattingSquad}
                                value={d2}
                                ariaLabel="Select innings break non-striker"
                                includeNoneOption={true}
                                noneOptionLabel="None / One Batter Mode"
                                disabledOptions={d1 ? [d1] : []}
                                listClassName="ls-ib-list"
                                onChange={(nextNonStriker) => {
                                    setD2(nextNonStriker);
                                    if (nextNonStriker && d1 === nextNonStriker) {
                                        setD1('');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="glass-card ls-ib-section-card">
                        <h4 className="ls-ib-section-title">Opening Bowler: {nextBowlingTeam}</h4>
                        <div className="flex-col gap-2">
                            <label>Bowler</label>
                            <PlayerCardSelector
                                options={nextBowlingSquad}
                                value={b1}
                                ariaLabel="Select innings break opening bowler"
                                listClassName="ls-ib-list"
                                onChange={setB1}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary ls-ib-cta">
                        Start Run Chase
                    </button>
                </form>
            </div>
        );
    }

    // Compute stats for current players directly from state.balls in the current innings
    const currentInningsBalls = state.balls.filter((b: any) => b.innings_id === state.currentInningsId);
    const dismissedBatters = new Set(
        currentInningsBalls
            .filter((b: any) => b.is_wicket === 1 || b.is_wicket === true || b.is_wicket === '1')
            .map((b: any) => b.dismissed_player || b.striker)
            .filter(Boolean)
    );
    const activeBatters = new Set([state.currentBatter, state.nonStriker].filter(Boolean));
    const needsOpeningPairSelection = !state.currentBatter && !state.nonStriker && battingSquad.length > 1;
    
    const getBatterStats = (playerName: string) => {
        let runs = 0, balls = 0, fours = 0, sixes = 0;
        currentInningsBalls.forEach((b: any) => {
            if (b.striker === playerName) {
                if (b.extra_type !== 'wide') balls++;
                runs += b.runs;
                if (b.runs === 4) fours++;
                if (b.runs === 6) sixes++;
            }
        });
        return { runs, balls, fours, sixes };
    };

    const getBowlerStats = (playerName: string) => {
        let balls = 0, runs = 0, wickets = 0;
        currentInningsBalls.forEach((b: any) => {
            if (b.bowler === playerName) {
                if (b.extra_type === null) balls++;
                let bowlerRuns = b.runs;
                if (b.extra_type === 'wide' || b.extra_type === 'no_ball') bowlerRuns += (b.runs + b.extras);
                runs += bowlerRuns;
                if (b.is_wicket && b.wicket_type !== 'run_out') wickets++;
            }
        });
        const overs = Math.floor(balls / 6) + (balls % 6) / 10;
        return { balls, overs, runs, wickets };
    };

    const strikerStats = state.currentBatter ? getBatterStats(state.currentBatter) : null;
    const nonStrikerStats = state.nonStriker ? getBatterStats(state.nonStriker) : null;
    const bowlerStats = state.currentBowler ? getBowlerStats(state.currentBowler) : null;
    const celebrationGifUrl = celebrationType === 'W'
        ? 'https://media.giphy.com/media/l3vR6aasfs0Ae3qdG/giphy.gif'
        : celebrationType === 6
        ? 'https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif'
        : 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif';
    const celebrationLabel = celebrationType === 'W' ? 'WICKET!' : celebrationType === 6 ? 'SIX!' : 'FOUR!';
    const celebrationAlt = celebrationType === 'W' ? 'Wicket celebration' : celebrationType === 6 ? 'Six celebration' : 'Four celebration';

    return (
        <div className="flex-col gap-6 ls-shell">
            {celebrationType && (
                <div className="ls-celebration-pop" aria-live="polite" aria-atomic="true">
                    <div className="ls-celebration-card">
                        <img
                            src={celebrationGifUrl}
                            alt={celebrationAlt}
                            className="ls-celebration-gif"
                        />
                        <div className="ls-celebration-text">{celebrationLabel}</div>
                    </div>
                </div>
            )}

            {/* Score Header */}
            <div className="glass-panel ls-score-panel">
                <div className="flex-between ls-score-top">
                    <div>
                        <div className="flex ls-score-main-wrap">
                            <h2 className="text-gradient ls-score-main">
                                {state.score.runs}<span className="ls-score-slash">/{state.score.wickets}</span>
                            </h2>
                            <div className="glass-card ls-crr-card">
                                <p className="ls-crr-label">CRR</p>
                                <p className="ls-crr-value">{crr}</p>
                            </div>
                        </div>
                        <p className="ls-over-label">
                            {state.score.oversBowled} <span className="ls-over-label-unit">OVERS</span>
                        </p>
                    </div>

                    <div className="flex-col gap-2 text-right ls-score-actions">
                        <button onClick={() => handleInningsBreak()} className="btn btn-danger ls-end-innings-btn">
                            End Inning
                        </button>
                        {state.target && (
                            <div className="glass-card ls-target-card">
                                {runsRequired > 0 && remainingBalls > 0 ? (
                                    <p className="ls-target-text">
                                        Need <span className="ls-target-strong">{runsRequired}</span> runs in <span className="ls-target-strong">{remainingBalls}</span> balls
                                    </p>
                                ) : (runsRequired <= 0 ? 
                                    <p className="ls-target-done">Target Reached!</p> 
                                : 
                                    <p className="ls-target-fail">Match Over</p>
                                )}
                                <div className="flex ls-target-meta">
                                    <span>Target: {state.target}</span>
                                    <span>•</span>
                                    <span>RRR: {reqRate}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass-card ls-top-quick-actions">
                <button
                    onClick={() => setShowScorecard(true)}
                    className="ls-link-btn is-green"
                >
                    View Full Scorecard
                </button>
                <button
                    onClick={() => setShowEditSquadsModal(true)}
                    className="ls-link-btn is-amber"
                >
                    Manage Teams
                </button>
            </div>

            {/* Players Dashboard */}
            <div className="grid grid-mobile-1 gap-4 ls-players-grid">
                <div className="glass-panel ls-player-panel">
                    <h3 className="ls-card-kicker">Batters</h3>
                    <div className="flex-col gap-4">
                        <div className="flex-between ls-player-row">
                            <div className="flex-col">
                                <span className="flex-center gap-2 ls-batter-name-wrap">
                                    <span className="ls-batter-name">
                                        {state.currentBatter} {state.config.jokerPlayer === state.currentBatter && <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem' }}>(Joker)</span>}
                                    </span>
                                    <span style={{ color: 'var(--accent-success)', fontSize: '1.5rem', lineHeight: 1 }}>*</span>
                                </span>
                                {strikerStats && (
                                    <div className="ls-player-stats">
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{strikerStats.runs}</span>
                                        <span style={{ marginLeft: '4px' }}>({strikerStats.balls})</span>
                                        <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                        <span>4s: {strikerStats.fours}</span>
                                        <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                        <span>6s: {strikerStats.sixes}</span>
                                        <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                        <span>SR: {strikerStats.balls > 0 ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(0) : '0'}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setChangingPlayerType('striker')}
                                className="btn btn-secondary ls-change-btn"
                            >
                                Change
                            </button>
                        </div>
                        {state.nonStriker && (
                            <div className="flex-between ls-player-row ls-player-row-muted">
                                <div className="flex-col">
                                    <span className="ls-batter-name ls-batter-name-secondary">
                                        {state.nonStriker} {state.config.jokerPlayer === state.nonStriker && <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem' }}>(Joker)</span>}
                                    </span>
                                    {nonStrikerStats && (
                                        <div className="ls-player-stats ls-player-stats-secondary">
                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{nonStrikerStats.runs}</span>
                                            <span style={{ marginLeft: '4px' }}>({nonStrikerStats.balls})</span>
                                            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                            <span>4s: {nonStrikerStats.fours}</span>
                                            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                            <span>6s: {nonStrikerStats.sixes}</span>
                                            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                            <span>SR: {nonStrikerStats.balls > 0 ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(0) : '0'}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setChangingPlayerType('non-striker')}
                                    className="btn btn-secondary ls-change-btn"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-panel ls-player-panel">
                    <h3 className="ls-card-kicker">Bowler</h3>
                    <div className="flex-between ls-player-row">
                        <div className="flex-col">
                            <p className="ls-batter-name">
                                {state.currentBowler} {state.config.jokerPlayer === state.currentBowler && <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem' }}>(Joker)</span>}
                            </p>
                            {bowlerStats && (
                                <div className="ls-player-stats">
                                    <span>Overs: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bowlerStats.overs}</span></span>
                                    <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                    <span>Runs: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bowlerStats.runs}</span></span>
                                    <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                    <span>Wickets: <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{bowlerStats.wickets}</span></span>
                                    <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                    <span>Econ: {bowlerStats.balls > 0 ? ((bowlerStats.runs / bowlerStats.balls) * 6).toFixed(1) : '0.0'}</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setChangingPlayerType('bowler')}
                            className="btn btn-secondary ls-change-btn ls-change-btn-bowler"
                        >
                            Change
                        </button>
                    </div>
                </div>
            </div>

            {/* Over Timeline */}
            <div className="glass-panel ls-over-panel">
                <div className="flex-between ls-over-head">
                    <h3 className="ls-card-kicker mb-0">This Over</h3>
                    <div className="flex gap-4 ls-over-links">
                        <button
                            onClick={openEditModal}
                            className="ls-link-btn is-blue"
                        >
                            Edit Previous Balls
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 ls-over-balls">
                    {Array.from({ length: 6 }).map((_, i) => {
                        const ball = state.thisOver[i];
                        let bClass = ball ? '' : 'empty-ball';
                        if (ball === '4') bClass = 'run-4';
                        if (ball === '6') bClass = 'run-6';
                        if (ball === 'W') bClass = 'wicket';
                        if (['Wd', 'Nb'].includes(ball)) bClass = 'extra';

                        return (
                            <div key={i} className={`ball-bubble ${bClass}`} style={{
                                opacity: ball ? 1 : 0.2,
                                border: ball ? 'none' : '2px dashed var(--border-color)',
                                background: ball ? undefined : 'transparent'
                            }}>
                                {ball || ''}
                            </div>
                        );
                    })}
                    {state.thisOver.length > 6 && state.thisOver.slice(6).map((ball, idx) => {
                        let bClass = '';
                        if (ball === '4') bClass = 'run-4';
                        if (ball === '6') bClass = 'run-6';
                        if (ball === 'W') bClass = 'wicket';
                        if (['Wd', 'Nb'].includes(ball)) bClass = 'extra';
                        return <div key={idx + 6} className={`ball-bubble ${bClass}`}>{ball}</div>;
                    })}
                </div>
            </div>

            {/* Action Controls */}
            {needsNextBatter ? (
                <div className="glass-card ls-next-batter-card ls-next-select-card">
                    <h3 className="ls-next-select-title">
                        {(!state.currentBatter && !state.nonStriker) 
                            ? `Select Opening Batters (${battingTeam})` 
                            : (!state.currentBatter ? `Select Striker (${battingTeam})` : `Select Non-Striker (${battingTeam})`)}
                    </h3>
                    <form onSubmit={submitNextBatter} className="flex-col gap-4">
                        <div className="flex-col gap-4">
                            {!state.currentBatter && (
                                <div className="flex-col gap-2">
                                    <PlayerCardSelector
                                        options={battingSquad}
                                        value={nextBatterInput}
                                        ariaLabel="Select next striker"
                                        listClassName="ls-next-batter-list"
                                        disabledOptions={[
                                            ...Array.from(dismissedBatters),
                                            ...Array.from(activeBatters),
                                            ...(nextBatter2Input ? [nextBatter2Input] : [])
                                        ]}
                                        getOptionLabel={(playerName) => dismissedBatters.has(playerName) ? `${playerName} (Out)` : playerName}
                                        onChange={setNextBatterInput}
                                    />
                                </div>
                            )}
                            {(!state.nonStriker && (state.currentBatter || battingSquad.length > 1)) && (
                                <div className="flex-col gap-2">
                                    <label>Select Non-Striker</label>
                                    <PlayerCardSelector
                                        options={battingSquad}
                                        value={!state.currentBatter ? nextBatter2Input : nextBatterInput}
                                        ariaLabel="Select next non-striker"
                                        listClassName="ls-next-batter-list"
                                        disabledOptions={[
                                            ...Array.from(dismissedBatters),
                                            ...Array.from(activeBatters),
                                            ...(!state.currentBatter && nextBatterInput ? [nextBatterInput] : []),
                                            ...(state.currentBatter ? [state.currentBatter] : [])
                                        ]}
                                        getOptionLabel={(playerName) => dismissedBatters.has(playerName) ? `${playerName} (Out)` : playerName}
                                        onChange={(nextPlayer) => !state.currentBatter ? setNextBatter2Input(nextPlayer) : setNextBatterInput(nextPlayer)}
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary ls-next-select-cta"
                            disabled={!nextBatterInput || (needsOpeningPairSelection && !nextBatter2Input)}
                        >
                            Confirm Batter(s)
                        </button>
                    </form>
                </div>
            ) : needsNextBowler ? (
                <div className="glass-card ls-next-bowler-card ls-next-select-card">
                    <h3 className="ls-next-select-title ls-next-select-title-bowler">
                        {state.score.legalBalls === 0 ? `Select Opening Bowler (${bowlingTeam})` : `End of Over! Select Next Bowler (${bowlingTeam})`}
                    </h3>
                    <form onSubmit={submitNextBowler} className="flex gap-4">
                        <select value={nextBowlerInput} onChange={e => setNextBowlerInput(e.target.value)} onWheel={stopWheelPropagation} required style={{ flex: 1 }}>
                            <option value="" disabled>Select Player...</option>
                            {bowlingSquad.map(p => <option key={`nbo-${p}`} value={p}>{p}</option>)}
                        </select>
                        <button type="submit" className="btn btn-primary">Confirm Bowler</button>
                    </form>
                </div>
            ) : !state.scorerPassword ? (
                <div className="glass-card flex-center ls-scorer-lock-card">
                    <p className="ls-scorer-lock-text">Enter Scorer PIN in Setup screen to update scores.</p>
                </div>
            ) : (
                <div className="glass-card ls-actions-card">
                    <div className="flex gap-3 ls-actions-secondary ls-actions-pre">
                        {/* <button type="button" className="btn btn-primary ls-secondary-btn ls-secondary-swap" onClick={() => dispatch({ type: 'SWAP_STRIKE' })}>⇆ Swap Strike</button> */}
                    </div>

                    <div className="grid gap-3 ls-actions-grid">
                        {/* Row 1: Zero/Extras */}
                        <button type="button" className="score-btn ls-action-btn" onClick={() => handleAction(0, '0')}>0</button>
                        <button type="button" className="btn btn-secondary ls-action-btn ls-action-extra" onClick={() => handleAction(0, 'Wd', 1)}>Wd</button>
                        <button type="button" className="btn btn-secondary ls-action-btn ls-action-extra" onClick={() => handleAction(0, 'Nb', 1)}>Nb</button>

                        {/* Row 2: Standard Runs */}
                        <button type="button" className="score-btn ls-action-btn" onClick={() => handleAction(1, '1')}>1</button>
                        <button type="button" className="score-btn ls-action-btn" onClick={() => handleAction(2, '2')}>2</button>
                        <button type="button" className="score-btn ls-action-btn" onClick={() => handleAction(3, '3')}>3</button>

                        {/* Row 3: Boundary/Wicket */}
                        <button type="button" className="score-btn four ls-action-btn ls-action-boundary" onClick={() => handleAction(4, '4')}>4</button>
                        <button type="button" className="score-btn six ls-action-btn ls-action-boundary" onClick={() => handleAction(6, '6')}>6</button>
                        <button type="button" className="score-btn wicket ls-action-btn ls-action-wicket" onClick={() => {
                            setWicketType('bowled');
                            setDismissedPlayer(state.currentBatter || '');
                            setFielder('');
                            setShowWicketModal(true);
                        }}>
                            <WicketActionIcon />
                            <span>Wicket</span>
                        </button>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="ls-edit-overlay">
                    <div className="glass-panel ls-edit-modal">
                        <div className="flex-between ls-edit-head">
                            <h2 className="ls-edit-title">Edit Previous Balls</h2>
                            <button onClick={() => { setShowEditModal(false); setEditingBallId(null); }} className="btn btn-secondary ls-edit-close ls-modal-close">✕</button>
                        </div>

                        {editingBallId ? (
                            <form onSubmit={handleEditSubmit} className="flex-col gap-4">
                                <div className="flex gap-4 ls-edit-form-top">
                                    <div className="flex-col gap-2 ls-edit-runs-block">
                                        <label>Runs Scored</label>
                                        <input className="ls-edit-runs-input" type="number" min="0" value={editRuns} onChange={e => setEditRuns(Number(e.target.value))} />
                                    </div>
                                    <div className="flex-col gap-2 ls-edit-wicket-toggle-wrap">
                                        <label className="flex gap-2 ls-edit-wicket-toggle">
                                            <input className="ls-edit-wicket-check" type="checkbox" checked={editIsWicket} onChange={e => setEditIsWicket(e.target.checked)} />
                                            <span style={{ fontWeight: 600 }}>Is Wicket?</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex-col gap-2">
                                    <label className="ls-edit-field-label">Runs scored by</label>
                                    <select className="ls-edit-field-select" value={editRunsScoredBy || editBallStriker} onChange={e => setEditRunsScoredBy(e.target.value)}>
                                        {editBallStriker ? <option value={editBallStriker}>{editBallStriker} (Striker)</option> : null}
                                        {editBallNonStriker ? <option value={editBallNonStriker}>{editBallNonStriker} (Non-Striker)</option> : null}
                                    </select>
                                </div>
                                {editIsWicket && (
                                    <div className="flex-col gap-4 ls-edit-wicket-panel">
                                        <div>
                                            <label className="ls-edit-field-label">Wicket Type</label>
                                            <select className="ls-edit-field-select" value={editWicketType} onChange={e => setEditWicketType(e.target.value)}>
                                                <option value="bowled">Bowled</option>
                                                <option value="caught">Caught</option>
                                                <option value="run_out">Run Out</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="ls-edit-field-label">Who was dismissed?</label>
                                            <div className="flex-col gap-3">
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: editDismissedPlayer === editBallStriker ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', background: editDismissedPlayer === editBallStriker ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-tertiary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    <input type="radio" style={{ width: '20px', height: '20px', transform: 'scale(1.2)', margin: 0, padding: 0, flexShrink: 0, accentColor: 'var(--accent-primary)' }} value={editBallStriker} checked={editDismissedPlayer === editBallStriker} onChange={e => setEditDismissedPlayer(e.target.value)} />
                                                    <span style={{ fontWeight: 600 }}>Striker ({editBallStriker})</span>
                                                </label>
                                                {editBallNonStriker && (
                                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem', marginTop: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: editDismissedPlayer === editBallNonStriker ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', background: editDismissedPlayer === editBallNonStriker ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-tertiary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                        <input type="radio" style={{ width: '20px', height: '20px', transform: 'scale(1.2)', margin: 0, padding: 0, flexShrink: 0, accentColor: 'var(--accent-primary)' }} value={editBallNonStriker} checked={editDismissedPlayer === editBallNonStriker} onChange={e => setEditDismissedPlayer(e.target.value)} />
                                                        <span style={{ fontWeight: 600 }}>Non-Striker ({editBallNonStriker})</span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        {(editWicketType === 'caught' || editWicketType === 'run_out') && (
                                            <div>
                                                <label className="ls-edit-field-label">Fielder (Optional)</label>
                                                <select className="ls-edit-field-select" value={editFielder || ''} onChange={e => setEditFielder(e.target.value)}>
                                                    <option value="">-- Select Fielder --</option>
                                                    {bowlingSquad.map(player => (
                                                        <option key={'edit-'+player} value={player}>{player}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-4 ls-edit-form-actions">
                                    {ballToDelete === editingBallId ? (
                                        <div className="ls-edit-confirm-inline">
                                            <span className="ls-edit-confirm-inline-text">Confirm delete?</span>
                                            <button type="button" onClick={() => handleDeleteBall(editingBallId!)} className="btn btn-danger ls-edit-mini-btn">Yes</button>
                                            <button type="button" onClick={() => setBallToDelete(null)} className="btn btn-secondary ls-edit-mini-btn">No</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="submit" className="btn btn-primary ls-edit-action-btn ls-edit-action-save">Save Changes</button>
                                            <button type="button" onClick={() => setBallToDelete(editingBallId!)} className="btn btn-secondary ls-edit-action-btn ls-edit-action-delete">Delete Ball</button>
                                            <button type="button" onClick={() => setEditingBallId(null)} className="btn btn-secondary ls-edit-action-btn ls-edit-action-cancel">Cancel</button>
                                        </>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <div className="flex-col gap-2 ls-edit-list">
                                {editBalls.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No balls bowled yet.</p> : null}
                                {editBalls.slice().reverse().map((b: any) => (
                                    <div key={b.id} className="glass-card flex-between ls-edit-row">
                                        {ballToDelete === b.id && !editingBallId && (
                                            <div className="ls-edit-row-confirm">
                                                <span className="ls-edit-row-confirm-text">Delete Ball?</span>
                                                <button className="btn btn-danger ls-edit-mini-btn" onClick={() => handleDeleteBall(b.id)}>Delete</button>
                                                <button className="btn btn-secondary ls-edit-mini-btn" onClick={() => setBallToDelete(null)}>Cancel</button>
                                            </div>
                                        )}
                                        <div className="ls-edit-row-meta">
                                            <p className="ls-edit-row-over">Over {b.over_number}.{b.ball_number}</p>
                                            <p className="ls-edit-row-desc">
                                                {b.runs} Runs {b.extras > 0 ? `+ ${b.extras} (${b.extra_type})` : ''} {b.is_wicket === 1 ? '• Wicket' : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 ls-edit-row-actions">
                                            <button className="btn btn-secondary ls-edit-row-btn" onClick={() => {
                                                setEditingBallId(b.id);
                                                setEditRuns(b.runs);
                                                setEditIsWicket(b.is_wicket === 1);
                                                setEditWicketType(b.wicket_type || 'bowled');
                                                setEditDismissedPlayer(b.dismissed_player || b.striker);
                                                setEditFielder(b.fielder || '');
                                                setEditBallStriker(b.striker);
                                                setEditBallNonStriker(b.non_striker);
                                                setEditRunsScoredBy(b.striker);
                                            }}>Edit</button>
                                            <button
                                                className="btn btn-secondary ls-edit-row-btn ls-edit-row-btn-delete"
                                                onClick={() => setBallToDelete(b.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showEditSquadsModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-light)' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Match Squads</h2>
                            <button onClick={() => setShowEditSquadsModal(false)} className="btn btn-secondary ls-modal-close">✕</button>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Joker Player (Optional)</label>
                            <select 
                                value={tempJokerPlayer || ''} 
                                onChange={e => {
                                    const val = e.target.value;
                                    setTempJokerPlayer(val || null);
                                    if (val) {
                                        setTempTeam1Squad(prev => prev.filter(p => p !== val));
                                        setTempTeam2Squad(prev => prev.filter(p => p !== val));
                                    }
                                }} 
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                            >
                                <option value="">None</option>
                                {availablePlayersForSquad.map(p => (
                                    <option key={`edit-joker-${p.id}`} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            {/* Team 1 Section */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-success)' }}></span>
                                    <span style={{ flex: 1 }}>{state.teams.team1}</span>
                                    <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{tempTeam1Squad.length} selected</span>
                                </h3>
                                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '0.5rem' }}>
                                    {availablePlayersForSquad.map(p => {
                                        const isJoker = p.name === tempJokerPlayer;
                                        const isSelectedInOther = tempTeam2Squad.includes(p.name) || isJoker;
                                        const isSelected = tempTeam1Squad.includes(p.name);
                                        
                                        return (
                                            <div 
                                                key={`edit-t1-${p.id}`} 
                                                style={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '0.75rem 1rem', 
                                                    borderRadius: '12px',
                                                    background: isSelected ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255,255,255,0.03)',
                                                    border: isSelected ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                    cursor: isSelectedInOther ? 'not-allowed' : 'pointer',
                                                    opacity: isSelectedInOther ? 0.4 : 1,
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                                }}
                                                onClick={() => {
                                                    if (isSelectedInOther) return;
                                                    setTempTeam1Squad(prev => prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]);
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-success)', margin: 0 }}
                                                />
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? 'var(--accent-success)' : 'var(--bg-tertiary)', color: isSelected ? 'white' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, border: '1px solid var(--border-light)', flexShrink: 0 }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '1rem', fontWeight: isSelected ? 600 : 400, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.name}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                        {isJoker && <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem', fontWeight: 600 }}>JOKER</span>}
                                                        {isSelectedInOther && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>In Opposing Team</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Team 2 Section */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                                    <span style={{ flex: 1 }}>{state.teams.team2}</span>
                                    <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>{tempTeam2Squad.length} selected</span>
                                </h3>
                                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '0.5rem' }}>
                                    {availablePlayersForSquad.map(p => {
                                        const isJoker = p.name === tempJokerPlayer;
                                        const isSelectedInOther = tempTeam1Squad.includes(p.name) || isJoker;
                                        const isSelected = tempTeam2Squad.includes(p.name);

                                        return (
                                            <div 
                                                key={`edit-t2-${p.id}`} 
                                                style={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '0.75rem 1rem', 
                                                    borderRadius: '12px',
                                                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                                                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                    cursor: isSelectedInOther ? 'not-allowed' : 'pointer',
                                                    opacity: isSelectedInOther ? 0.4 : 1,
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                                }}
                                                onClick={() => {
                                                    if (isSelectedInOther) return;
                                                    setTempTeam2Squad(prev => prev.includes(p.name) ? prev.filter(n => n !== p.name) : [...prev, p.name]);
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)', margin: 0 }}
                                                />
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: isSelected ? 'white' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, border: '1px solid var(--border-light)', flexShrink: 0 }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '1rem', fontWeight: isSelected ? 600 : 400, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.name}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                        {isJoker && <span style={{ color: 'var(--accent-warning)', fontSize: '0.7rem', fontWeight: 600 }}>JOKER</span>}
                                                        {isSelectedInOther && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>In Opposing Team</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4" style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                            <button onClick={handleUpdateSquads} className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: 600 }}>Update Squads</button>
                            <button onClick={() => setShowEditSquadsModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {changingPlayerType && (
                <div className="ls-edit-overlay ls-change-modal-overlay">
                    <div className="glass-panel ls-change-player-modal">
                        <div className="ls-change-player-modal-header">
                            <div className="flex-between">
                                <h2 className="ls-change-player-modal-title">Change {changingPlayerType === 'bowler' ? 'Bowler' : (changingPlayerType === 'striker' ? 'Striker' : 'Non-Striker')}</h2>
                                <button onClick={() => setChangingPlayerType(null)} className="btn btn-secondary ls-modal-close">✕</button>
                            </div>
                        </div>

                        <div className="ls-change-player-modal-body">
                            <div className="flex-col gap-4">
                                <label className="ls-change-player-label">Select New Player</label>
                            <PlayerCardSelector
                                options={changingPlayerType === 'bowler' ? bowlingSquad : battingSquad}
                                value={
                                    changingPlayerType === 'bowler'
                                        ? state.currentBowler
                                        : changingPlayerType === 'striker'
                                            ? state.currentBatter
                                            : state.nonStriker
                                }
                                ariaLabel="Select new player"
                                listClassName="ls-change-player-list"
                                disabledOptions={
                                    changingPlayerType === 'bowler'
                                        ? []
                                        : Array.from(dismissedBatters)
                                }
                                getOptionLabel={(playerName) =>
                                    changingPlayerType === 'bowler'
                                        ? playerName
                                        : dismissedBatters.has(playerName)
                                            ? `${playerName} (Out)`
                                            : playerName
                                }
                                onChange={(nextPlayer) => {
                                    if (changingPlayerType === 'bowler') {
                                        dispatch({ type: 'CHANGE_BOWLER', payload: { newPlayer: nextPlayer } });
                                    } else {
                                        dispatch({ type: 'CHANGE_BATTER', payload: { isStriker: changingPlayerType === 'striker', newPlayer: nextPlayer } });
                                    }
                                    setChangingPlayerType(null);
                                }}
                            />
                                <button onClick={() => setChangingPlayerType(null)} className="btn btn-secondary ls-change-player-cancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Wicket Details Modal */}
            {showWicketModal && (
                <div className="ls-edit-overlay ls-wicket-overlay">
                    <div className="glass-panel ls-wicket-modal">
                        <div className="ls-wicket-modal-header">
                            <h2 className="ls-wicket-modal-title">Wicket Details</h2>
                        </div>

                        <div className="ls-wicket-modal-body">
                            <div className="flex-col gap-4">
                                <div>
                                    <label className="ls-wicket-label">Wicket Type</label>
                                    <select className="ls-wicket-select" value={wicketType} onChange={e => setWicketType(e.target.value)}>
                                        <option value="bowled">Bowled</option>
                                        <option value="caught">Caught</option>
                                        <option value="run_out">Run Out</option>
                                    </select>
                                </div>

                                <div className="ls-wicket-dismissed-block">
                                    <label className="ls-wicket-label">Who was dismissed?</label>
                                    <div className="flex-col gap-3">
                                        <label className={`ls-wicket-radio-row ${dismissedPlayer === state.currentBatter ? 'is-selected' : ''}`}>
                                            <input
                                                className="ls-wicket-radio"
                                                type="radio"
                                                value={state.currentBatter || ''}
                                                checked={dismissedPlayer === state.currentBatter}
                                                onChange={e => setDismissedPlayer(e.target.value)}
                                            />
                                            <span className="ls-wicket-radio-text">Striker ({state.currentBatter})</span>
                                        </label>

                                        {state.nonStriker && (
                                            <label className={`ls-wicket-radio-row ${dismissedPlayer === state.nonStriker ? 'is-selected' : ''}`}>
                                                <input
                                                    className="ls-wicket-radio"
                                                    type="radio"
                                                    value={state.nonStriker}
                                                    checked={dismissedPlayer === state.nonStriker}
                                                    onChange={e => setDismissedPlayer(e.target.value)}
                                                />
                                                <span className="ls-wicket-radio-text">Non-Striker ({state.nonStriker})</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {(wicketType === 'caught' || wicketType === 'run_out') && (
                                    <div>
                                        <label className="ls-wicket-label">Fielder (Optional)</label>
                                        <select className="ls-wicket-select" value={fielder} onChange={e => setFielder(e.target.value)}>
                                            <option value="">-- Select Fielder --</option>
                                            {bowlingSquad.map(player => (
                                                <option key={player} value={player}>{player}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 ls-wicket-actions">
                                <button
                                    onClick={() => {
                                        handleAction(0, 'W', 0, true, wicketType, dismissedPlayer, fielder || null);
                                        setShowWicketModal(false);
                                    }}
                                    className="btn btn-danger ls-wicket-action-btn"
                                >
                                    Confirm Wicket
                                </button>
                                <button onClick={() => setShowWicketModal(false)} className="btn btn-secondary ls-wicket-action-btn">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {appError && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-danger)', marginBottom: '1rem' }}>Attention</h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{appError}</p>
                        <button onClick={() => setAppError(null)} className="btn btn-primary" style={{ width: '100%' }}>Dismiss</button>
                    </div>
                </div>
            )}
            {/* Detailed Scorecard Modal */}
            {showScorecard && (
                <div className="ls-scorecard-overlay">
                    <div className="glass-panel ls-scorecard-modal">
                        <button
                            onClick={() => setShowScorecard(false)}
                            className="ls-scorecard-close ls-modal-close"
                        >
                            &times;
                        </button>

                        <div className="flex-col gap-6 ls-scorecard-body">
                            <h2 className="text-gradient ls-scorecard-title">Full Match Scorecard</h2>

                            {/* Match Squads Section */}
                            <div className="ls-scorecard-squads-block">
                                <h3 className="ls-scorecard-kicker">Match Squads</h3>
                                <div className="grid grid-mobile-1 ls-scorecard-squads-grid">
                                    <div className="ls-squad-card is-team1">
                                        <h4 className="ls-squad-title is-team1">
                                            {state.teams.team1}
                                        </h4>
                                        <div className="ls-squad-list">
                                            {state.teams.team1_squad.map(p => (
                                                <div key={`squad1-${p}`} className="ls-squad-player">
                                                    <span className="ls-squad-dot is-team1">•</span> {p}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ls-squad-card is-team2">
                                        <h4 className="ls-squad-title is-team2">
                                            {state.teams.team2}
                                        </h4>
                                        <div className="ls-squad-list">
                                            {state.teams.team2_squad.map(p => (
                                                <div key={`squad2-${p}`} className="ls-squad-player">
                                                    <span className="ls-squad-dot is-team2">•</span> {p}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DetailedScorecard match={state} innings={state.innings} balls={state.balls} />

                            <button onClick={() => setShowScorecard(false)} className="btn btn-primary ls-scorecard-close-cta">Close Scorecard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
