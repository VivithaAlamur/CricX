import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatch } from '../store/MatchContext';
import DetailedScorecard from '../components/DetailedScorecard';

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
