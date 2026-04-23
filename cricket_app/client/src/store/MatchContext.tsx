import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

// Types
export const SCORER_SESSION_ID = localStorage.getItem('scorer_session_id') || Math.random().toString(36).substring(2, 15);
localStorage.setItem('scorer_session_id', SCORER_SESSION_ID);

export type MatchStatus = 'SETUP' | 'TOSS' | 'IN_PROGRESS' | 'INNINGS_BREAK' | 'FINISHED';

export interface MatchState {
    status: MatchStatus;
    matchId: number | null;
    currentInningsId: number | null;
    teams: {
        team1: string;
        team2: string;
        team1_squad: string[];
        team2_squad: string[];
    };
    toss: {
        winner: string | null;
        decision: 'bat' | 'bowl' | null;
    };
    config: {
        overs: number;
        totalPlayers: number | null;
        inningsTimerSeconds: number;
        noExtraRuns: boolean;
        jokerPlayer: string | null;
    };
    timer: {
        isPaused: boolean;
        innings1Remaining: number;
        innings2Remaining: number;
    };
    score: {
        runs: number;
        wickets: number;
        oversBowled: number; // e.g. 1.4
        legalBalls: number;
    };
    target: number | null;
    currentBatter: string;
    nonStriker: string;
    currentBowler: string;
    thisOver: string[]; // e.g. ['0', '1', 'W', '4', 'Wd', '6']
    balls: any[];
    innings: any[];
    adminPassword: string;
    scorerPassword: string;
}

type Action =
    | { type: 'SET_TEAMS'; payload: { team1: string; team2: string; team1_squad: string[]; team2_squad: string[]; overs: number; totalPlayers: number; noExtraRuns: boolean, jokerPlayer: string | null } }
    | { type: 'RESET_MATCH' }
    | { type: 'RESET_FOR_REMATCH' }
    | { type: 'BACK_TO_SETUP' }
    | { type: 'SET_TOSS'; payload: { winner: string; decision: 'bat' | 'bowl' } }
    | { type: 'START_MATCH'; payload: { matchId: number; inningsId: number; batter1: string; batter2: string; bowler: string } }
    | { type: 'ADD_BALL'; payload: { runs: number; extras: number; isWicket: boolean; label: string; wicketType?: string | null; dismissedPlayer?: string | null } }
    | { type: 'END_OVER'; payload: { nextBowler: string } }
    | { type: 'SWAP_STRIKE' }
    | { type: 'WICKET'; payload: { nextBatter: string; nonStriker?: string } }
    | { type: 'INNINGS_BREAK'; payload: { target: number } }
    | { type: 'START_SECOND_INNINGS'; payload: { inningsId: number; batter1: string; batter2: string; bowler: string } }
    | { type: 'FINISH_MATCH'; payload: { winner: string } }
    | { type: 'SYNC_MATCH_STATE'; payload: { runs: number; wickets: number; legalBalls: number; oversBowled: number; thisOver: string[] } }
    | { type: 'RESUME_MATCH'; payload: { match: any, innings: any[], balls: any[] } }
    | { type: 'CHANGE_BATTER'; payload: { isStriker: boolean; newPlayer: string } }
    | { type: 'CHANGE_BOWLER'; payload: { newPlayer: string } }
    | { type: 'UPDATE_INNINGS_TIMER'; payload: { inningsNumber: 1 | 2; remainingSeconds?: number; isPaused?: boolean } }
    | { type: 'UPDATE_SQUADS'; payload: { team1_squad: string[]; team2_squad: string[]; jokerPlayer: string | null } }
    | { type: 'SET_ADMIN_PASSWORD'; payload: string }
    | { type: 'SET_SCORER_PASSWORD'; payload: string };

const initialState: MatchState = {
    status: 'SETUP',
    matchId: null,
    currentInningsId: null,
    teams: { team1: '', team2: '', team1_squad: [], team2_squad: [] },
    toss: { winner: null, decision: null },
    config: { overs: 20, totalPlayers: null, inningsTimerSeconds: 1200, noExtraRuns: false, jokerPlayer: null },
    timer: { isPaused: false, innings1Remaining: 0, innings2Remaining: 0 },
    score: { runs: 0, wickets: 0, oversBowled: 0, legalBalls: 0 },
    target: null,
    currentBatter: '',
    nonStriker: '',
    currentBowler: '',
    thisOver: [],
    balls: [],
    innings: [],
    adminPassword: localStorage.getItem('admin_password') || '',
    scorerPassword: localStorage.getItem('scorer_password') || ''
};

function matchReducer(state: MatchState, action: Action): MatchState {
    switch (action.type) {
        case 'SET_TEAMS':
            const inningsTimerSeconds = action.payload.overs * 60;
            return {
                ...initialState,
                teams: {
                    team1: action.payload.team1,
                    team2: action.payload.team2,
                    team1_squad: action.payload.team1_squad,
                    team2_squad: action.payload.team2_squad
                },
                config: {
                    ...state.config,
                    overs: action.payload.overs,
                    totalPlayers: action.payload.totalPlayers,
                    inningsTimerSeconds,
                    noExtraRuns: action.payload.noExtraRuns,
                    jokerPlayer: action.payload.jokerPlayer
                },
                timer: {
                    isPaused: false,
                    innings1Remaining: 0,
                    innings2Remaining: 0
                },
                adminPassword: state.adminPassword,
                scorerPassword: state.scorerPassword,
                status: 'TOSS'
            };
        case 'SET_TOSS':
            return {
                ...state,
                toss: { winner: action.payload.winner, decision: action.payload.decision },
            };
        case 'RESET_MATCH':
            return {
                ...initialState,
                adminPassword: state.adminPassword,
                scorerPassword: state.scorerPassword
            };
        case 'RESET_FOR_REMATCH':
            return {
                ...initialState,
                teams: state.teams,
                config: state.config,
                status: 'TOSS',
                adminPassword: state.adminPassword,
                scorerPassword: state.scorerPassword
            };
        case 'BACK_TO_SETUP':
            return {
                ...state,
                status: 'SETUP',
                toss: { winner: null, decision: null }
            };
        case 'START_MATCH':
            return {
                ...state,
                status: 'IN_PROGRESS',
                matchId: action.payload.matchId,
                currentInningsId: action.payload.inningsId,
                currentBatter: action.payload.batter1,
                nonStriker: action.payload.batter2,
                currentBowler: action.payload.bowler,
                innings: [{ id: action.payload.inningsId, innings_number: 1, team_name: state.toss.decision === 'bat' ? state.toss.winner : (state.toss.winner === state.teams.team1 ? state.teams.team2 : state.teams.team1) }]
            };
        case 'ADD_BALL': {
            const isLegal = action.payload.label !== 'Wd' && action.payload.label !== 'Nb';
            const newLegalBalls = isLegal ? state.score.legalBalls + 1 : state.score.legalBalls;

            const newOversBowled = Math.floor(newLegalBalls / 6) + (newLegalBalls % 6) / 10;

            let nextStriker = state.currentBatter;
            let nextNonStriker = state.nonStriker;
            
            // First, adjust for runs completed on the play (only 1 or 3)
            if ((action.payload.runs === 1 || action.payload.runs === 3) && state.nonStriker) {
                nextStriker = state.nonStriker;
                nextNonStriker = state.currentBatter;
            }

            // Then, clear the player who was actually dismissed
            if (action.payload.isWicket) {
                if (action.payload.dismissedPlayer === nextNonStriker) {
                    nextNonStriker = '';
                } else if (action.payload.dismissedPlayer === nextStriker) {
                    nextStriker = '';
                } else {
                    nextStriker = ''; // fallback
                }
            }

            return {
                ...state,
                score: {
                    ...state.score,
                    runs: state.score.runs + action.payload.runs + action.payload.extras,
                    wickets: state.score.wickets + (action.payload.isWicket ? 1 : 0),
                    legalBalls: newLegalBalls,
                    oversBowled: newOversBowled,
                },
                thisOver: [...state.thisOver, action.payload.label],
                balls: [...state.balls, {
                    match_id: state.matchId,
                    innings_id: state.currentInningsId,
                    over_number: Math.floor(state.score.legalBalls / 6) + 1,
                    ball_number: (state.score.legalBalls % 6) + 1,
                    striker: state.currentBatter,
                    non_striker: state.nonStriker,
                    bowler: state.currentBowler,
                    runs: action.payload.runs,
                    extras: action.payload.extras,
                    extra_type: action.payload.label.includes('Wd') ? 'wide' : (action.payload.label.includes('Nb') ? 'no_ball' : null),
                    is_wicket: action.payload.isWicket,
                    label: action.payload.label
                }],
                currentBatter: nextStriker,
                nonStriker: nextNonStriker
            };
        }
        case 'END_OVER':
            return {
                ...state,
                thisOver: [],
                currentBatter: state.nonStriker || state.currentBatter, // Swap if present, otherwise no‑op
                nonStriker: state.nonStriker ? state.currentBatter : '',
                currentBowler: action.payload.nextBowler
            };
        case 'WICKET': {
            const updates: any = {};
            if (!state.currentBatter) {
                updates.currentBatter = action.payload.nextBatter;
                if (action.payload.nonStriker !== undefined) {
                    updates.nonStriker = action.payload.nonStriker;
                }
            } else if (!state.nonStriker) {
                updates.nonStriker = action.payload.nextBatter;
            }
            return {
                ...state,
                ...updates
            };
        }
        case 'SWAP_STRIKE':
            return {
                ...state,
                currentBatter: state.nonStriker || state.currentBatter,
                nonStriker: state.nonStriker ? state.currentBatter : ''
            };
        case 'INNINGS_BREAK':
            return {
                ...state,
                status: 'INNINGS_BREAK',
                timer: {
                    ...state.timer,
                    isPaused: true
                },
                target: action.payload.target
            };
        case 'START_SECOND_INNINGS':
            return {
                ...state,
                status: 'IN_PROGRESS',
                currentInningsId: action.payload.inningsId,
                score: { runs: 0, wickets: 0, oversBowled: 0, legalBalls: 0 },
                thisOver: [],
                currentBatter: action.payload.batter1,
                nonStriker: action.payload.batter2,
                currentBowler: action.payload.bowler,
                timer: {
                    ...state.timer,
                    isPaused: false,
                    innings2Remaining: 0
                },
                innings: [
                    ...state.innings,
                    { id: action.payload.inningsId, innings_number: 2, team_name: state.innings[0].team_name === state.teams.team1 ? state.teams.team2 : state.teams.team1 }
                ]
            };
        case 'FINISH_MATCH':
            return {
                ...state,
                timer: {
                    ...state.timer,
                    isPaused: true
                },
                status: 'FINISHED'
            };
        case 'SYNC_MATCH_STATE': {
            return {
                ...state,
                score: {
                    runs: action.payload.runs,
                    wickets: action.payload.wickets,
                    legalBalls: action.payload.legalBalls,
                    oversBowled: action.payload.oversBowled
                },
                thisOver: action.payload.thisOver
            };
        }
        case 'RESUME_MATCH': {
            const { match, innings, balls } = action.payload;
            const currentInnings = innings.find((i: any) => i.innings_number === (match.current_innings || 1));
            const firstInnings = innings.find((i: any) => i.innings_number === 1);
            const currentInningsBalls = balls.filter((b: any) => b.innings_id === currentInnings?.id);

            let legal = 0;
            currentInningsBalls.forEach((b: any) => {
                if (!b.extra_type) legal++;
            });

            const currentOverNum = (legal % 6 === 0 && legal > 0) ? Math.floor(legal / 6) : Math.floor(legal / 6) + 1;
            
            const ballsInThisOver = currentInningsBalls.filter((b: any) => b.over_number === currentOverNum);
            const thisOver = ballsInThisOver.map((b: any) => {
                if (b.is_wicket) return 'W';
                if (b.extra_type === 'wide') return 'Wd';
                if (b.extra_type === 'no_ball') return 'Nb';
                return b.runs.toString();
            });

            const lastBall = currentInningsBalls[currentInningsBalls.length - 1];
            let currentBatter = lastBall?.striker || '';
            let nonStriker = lastBall?.non_striker || '';
            let currentBowler = lastBall?.bowler || '';

            const isSyncingCurrentLiveMatch = Number(state.matchId) === Number(match.id) && state.status === 'IN_PROGRESS';
            const isSameInnings = Number(state.currentInningsId) === Number(currentInnings?.id);

            // Apply strike rotation if last ball was 1 or 3 runs
            if (lastBall && (lastBall.runs === 1 || lastBall.runs === 3) && !lastBall.is_wicket) {
                [currentBatter, nonStriker] = [nonStriker, currentBatter];
            }

            // If over ended, rotate strike too
            if (legal > 0 && legal % 6 === 0) {
                [currentBatter, nonStriker] = [nonStriker, currentBatter];
                currentBowler = '';
            }

            // When editing/deleting recent balls in the active live innings, keep current selections
            // if DB no longer has enough context to reconstruct them from the last ball.
            if (isSyncingCurrentLiveMatch && isSameInnings) {
                if (!currentBatter && state.currentBatter) currentBatter = state.currentBatter;
                if (!nonStriker && state.nonStriker) nonStriker = state.nonStriker;
                if (!currentBowler && state.currentBowler) currentBowler = state.currentBowler;
            }

            const resumedOversRaw = Number(match.total_overs ?? match.overs);
            const resumedOvers = Number.isFinite(resumedOversRaw) && resumedOversRaw > 0
                ? resumedOversRaw
                : (state.config.overs || 0);
            const resumedTimerInitial = Number.isFinite(Number(match.timer_initial_seconds))
                ? Number(match.timer_initial_seconds)
                : resumedOvers * 60;
            const dbInnings1 = Number.isFinite(Number(match.innings1_timer_remaining))
                ? Number(match.innings1_timer_remaining)
                : state.timer.innings1Remaining;
            const dbInnings2 = Number.isFinite(Number(match.innings2_timer_remaining))
                ? Number(match.innings2_timer_remaining)
                : state.timer.innings2Remaining;

            return {
                ...state,
                status: (match.status === 'FINISHED') ? 'FINISHED' : (match.current_innings === 1 ? 'IN_PROGRESS' : 'IN_PROGRESS'), 
                matchId: match.id,
                currentInningsId: currentInnings?.id || null,
                toss: {
                    winner: match.toss_winner,
                    decision: match.toss_decision
                },
                teams: {
                    team1: match.team1_name,
                    team2: match.team2_name,
                    team1_squad: typeof match.team1_squad === 'string' ? JSON.parse(match.team1_squad) : match.team1_squad,
                    team2_squad: typeof match.team2_squad === 'string' ? JSON.parse(match.team2_squad) : match.team2_squad
                },
                config: {
                    overs: resumedOvers,
                    totalPlayers: null,
                    inningsTimerSeconds: resumedTimerInitial,
                    noExtraRuns: match.no_extra_runs === 1,
                    jokerPlayer: match.joker_player
                },
                timer: {
                    isPaused: isSyncingCurrentLiveMatch ? state.timer.isPaused : (match.timer_is_paused === 1),
                    innings1Remaining: isSyncingCurrentLiveMatch ? Math.max(state.timer.innings1Remaining, dbInnings1) : dbInnings1,
                    innings2Remaining: isSyncingCurrentLiveMatch ? Math.max(state.timer.innings2Remaining, dbInnings2) : dbInnings2
                },
                score: {
                    runs: currentInnings?.total_runs || 0,
                    wickets: currentInnings?.total_wickets || 0,
                    legalBalls: legal,
                    oversBowled: currentInnings?.total_overs_bowled || 0
                },
                target: (Number(match.current_innings) === 2 && firstInnings) ? firstInnings.total_runs + 1 : undefined,
                balls: balls || [],
                innings: innings || [],
                thisOver,
                currentBatter,
                nonStriker,
                currentBowler
            };
        }
        case 'CHANGE_BATTER':
            return {
                ...state,
                currentBatter: action.payload.isStriker ? action.payload.newPlayer : state.currentBatter,
                nonStriker: !action.payload.isStriker ? action.payload.newPlayer : state.nonStriker
            };
        case 'UPDATE_SQUADS':
            return {
                ...state,
                teams: {
                    ...state.teams,
                    team1_squad: action.payload.team1_squad,
                    team2_squad: action.payload.team2_squad
                },
                config: {
                    ...state.config,
                    jokerPlayer: action.payload.jokerPlayer
                }
            };
        case 'CHANGE_BOWLER':
            return {
                ...state,
                currentBowler: action.payload.newPlayer
            };
        case 'UPDATE_INNINGS_TIMER': {
            const nextInnings1 = action.payload.inningsNumber === 1
                ? (action.payload.remainingSeconds ?? state.timer.innings1Remaining)
                : state.timer.innings1Remaining;
            const nextInnings2 = action.payload.inningsNumber === 2
                ? (action.payload.remainingSeconds ?? state.timer.innings2Remaining)
                : state.timer.innings2Remaining;

            return {
                ...state,
                timer: {
                    isPaused: action.payload.isPaused ?? state.timer.isPaused,
                    innings1Remaining: nextInnings1,
                    innings2Remaining: nextInnings2
                }
            };
        }
        case 'SET_ADMIN_PASSWORD':
            return {
                ...state,
                adminPassword: action.payload
            };
        case 'SET_SCORER_PASSWORD':
            return {
                ...state,
                scorerPassword: action.payload
            };
        default:
            return state;
    }
}

const MatchContext = createContext<{
    state: MatchState;
    dispatch: React.Dispatch<Action>;
} | null>(null);

export const MatchProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(matchReducer, initialState);

    return (
        <MatchContext.Provider value={{ state, dispatch }}>
            {children}
        </MatchContext.Provider>
    );
};

export const useMatch = () => {
    const context = useContext(MatchContext);
    if (!context) throw new Error('useMatch must be used within a MatchProvider');
    return context;
};
