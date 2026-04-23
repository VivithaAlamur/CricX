import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatch } from '../store/MatchContext';
import DetailedScorecard from '../components/DetailedScorecard';

function formatHhMmSs(totalSeconds: number) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hh = String(Math.floor(safe / 3600)).padStart(2, '0');
    const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

export default function MatchSummary() {
    const { state, dispatch } = useMatch();
    const { matchId } = useParams();
    const navigate = useNavigate();
    const [matchData, setMatchData] = useState<any>(null);

    const activeMatchId = matchId || state.matchId;

    useEffect(() => {
        if (activeMatchId) {
            fetch(`/api/matches/${activeMatchId}`)
                .then(res => res.json())
                .then(data => setMatchData(data))
                .catch(err => console.error(err));
        }
    }, [activeMatchId, state.status]);

    if (!matchData) {
        return (
            <div className="flex-center" style={{ height: '50vh' }}>
                <h2 className="text-gradient">Loading Match Summary...</h2>
            </div>
        );
    }

    const { match, innings, balls } = matchData;

    if (!match || !innings) {
        return (
            <div className="flex-center" style={{ height: '50vh' }}>
                <h2 style={{ color: 'var(--accent-danger)' }}>Match data incomplete.</h2>
            </div>
        );
    }

    const inningsByTeam = new Map(innings.map((inn: any) => [inn.team_name, inn]));
    const team1Innings = inningsByTeam.get(match.team1_name);
    const team2Innings = inningsByTeam.get(match.team2_name);

    const getInningsDurationFromBalls = (inningsNumber: number) => {
        const inningsEntry = innings.find((inn: any) => Number(inn.innings_number) === inningsNumber);
        if (!inningsEntry) return 0;

        const inningsBalls = balls
            .filter((b: any) => Number(b.innings_id) === Number(inningsEntry.id) && b.timestamp)
            .map((b: any) => new Date(b.timestamp).getTime())
            .filter((ts: number) => Number.isFinite(ts))
            .sort((a: number, b: number) => a - b);

        if (inningsBalls.length < 2) return 0;
        return Math.max(0, Math.floor((inningsBalls[inningsBalls.length - 1] - inningsBalls[0]) / 1000));
    };

    const isActiveMatchSummary = !matchId && Number(state.matchId) === Number(activeMatchId);
    const serverInnings1 = Math.max(0, Number(match.innings1_timer_remaining) || 0);
    const serverInnings2 = Math.max(0, Number(match.innings2_timer_remaining) || 0);
    const fallbackInnings1 = getInningsDurationFromBalls(1);
    const fallbackInnings2 = getInningsDurationFromBalls(2);
    const resolvedInnings1 = serverInnings1 > 0 ? serverInnings1 : fallbackInnings1;
    const resolvedInnings2 = serverInnings2 > 0 ? serverInnings2 : fallbackInnings2;
    const localInnings1 = Math.max(0, Number(state.timer.innings1Remaining) || 0);
    const localInnings2 = Math.max(0, Number(state.timer.innings2Remaining) || 0);
    const innings1TotalTime = isActiveMatchSummary ? Math.max(resolvedInnings1, localInnings1) : resolvedInnings1;
    const innings2TotalTime = isActiveMatchSummary ? Math.max(resolvedInnings2, localInnings2) : resolvedInnings2;
    const totalInningsTime = innings1TotalTime + innings2TotalTime;

    const formatInningsScore = (inn: any) => {
        if (!inn) return 'Yet to bat';
        const runs = Number(inn.total_runs || 0);
        const wickets = Number(inn.total_wickets || 0);
        const overs = Number(inn.total_overs_bowled || 0);
        return `${runs}/${wickets} (${overs.toFixed(1)} ov)`;
    };

    const handleStartNewMatch = () => {
        dispatch({ type: 'RESET_MATCH' });
        navigate('/');
    };

    const handleStartRematch = () => {
        dispatch({ type: 'RESET_FOR_REMATCH' });
        navigate('/');
    };

    const handleBack = () => {
        if (matchId) {
            navigate('/history');
            return;
        }
        navigate('/');
    };

    // Calculate winner from innings data
    let winner = 'Unknown';
    if (innings.length > 0) {
        const team1Inns = innings.find((inn: any) => inn.team_name === match.team1_name);
        const team2Inns = innings.find((inn: any) => inn.team_name === match.team2_name);

        const t1Runs = team1Inns?.total_runs || 0;
        const t2Runs = team2Inns?.total_runs || 0;

        if (t1Runs > t2Runs) winner = match.team1_name;
        else if (t2Runs > t1Runs) winner = match.team2_name;
        else if (innings.length >= 2) winner = 'Match Tied';
    }

    return (
        <div className="flex-col gap-6 msu-shell">
            <div className="glass-panel msu-hero">
                <div className="msu-back-row">
                    <button
                        type="button"
                        className="btn btn-secondary msu-top-back-btn"
                        onClick={handleBack}
                        aria-label="Back"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                </div>
                <div className="msu-header-row">
                    <div>
                        <h2 className="text-gradient msu-title">
                            {match.status === 'FINISHED' ? 'Match Finished' : 'Match In Progress'}
                        </h2>
                        <p className="msu-subtitle">{match.team1_name} vs {match.team2_name}</p>
                    </div>
                    <span className={`msu-status-pill ${match.status === 'FINISHED' ? 'is-finished' : 'is-live'}`}>
                        {match.status === 'FINISHED' ? 'Final' : 'Live'}
                    </span>
                </div>

                {match.status === 'FINISHED' && (
                    <div className="msu-result-banner">
                        <h3 className="msu-result-text">
                            {winner === 'Match Tied' ? 'The Match is Tied' : `${winner} won the match`}
                        </h3>
                    </div>
                )}

                {balls.length === 0 && (
                    <div className="msu-warning-banner">
                        <strong>Data Sync Warning:</strong> No ball-by-ball details were found for this match.
                    </div>
                )}

                <div className="msu-score-grid">
                    <div className="glass-card msu-score-card is-team1">
                        <p className="msu-score-team">{match.team1_name}</p>
                        <p className="msu-score-value">{formatInningsScore(team1Innings)}</p>
                    </div>
                    <div className="glass-card msu-score-card is-team2">
                        <p className="msu-score-team">{match.team2_name}</p>
                        <p className="msu-score-value">{formatInningsScore(team2Innings)}</p>
                    </div>
                </div>

                <div className="glass-card msu-timer-card">
                    <p className="msu-timer-title">Innings Timer</p>
                    <p className="msu-timer-row">Total Innings Time: <strong>{formatHhMmSs(totalInningsTime)}</strong></p>
                    <p className="msu-timer-row">Innings 1 Total Time: <strong>{formatHhMmSs(innings1TotalTime)}</strong></p>
                    <p className="msu-timer-row">Innings 2 Total Time: <strong>{formatHhMmSs(innings2TotalTime)}</strong></p>
                </div>

                <div className="msu-actions-row">
                    <button type="button" className="btn btn-secondary msu-action-btn" onClick={handleStartRematch}>
                        Start Rematch (Same Squads)
                    </button>
                    <button type="button" className="btn btn-primary msu-action-btn" onClick={handleStartNewMatch}>
                        Start New Match
                    </button>
                </div>
            </div>

            <DetailedScorecard match={match} innings={innings} balls={balls} />
        </div>
    );
}
