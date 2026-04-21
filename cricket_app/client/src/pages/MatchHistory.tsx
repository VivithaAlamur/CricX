import { useState, useEffect } from 'react';
import { Eye, History, Play, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMatch, SCORER_SESSION_ID } from '../store/MatchContext';

interface MatchData {
    id: number;
    team1_name: string;
    team2_name: string;
    status: string;
    created_at: string;
    team1_runs?: number;
    team1_wickets?: number;
    team2_runs?: number;
    team2_wickets?: number;
    joker_player?: string | null;
    team1_squad?: string;
    team2_squad?: string;
}

export default function MatchHistory() {
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { state, dispatch } = useMatch();
    const [viewSquadsMatch, setViewSquadsMatch] = useState<MatchData | null>(null);
    const [overrideMatchId, setOverrideMatchId] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/matches')
            .then(res => res.json())
            .then(data => setMatches(data))
            .catch(console.error);
    }, []);

    const handleResume = async (matchId: number, forceOverride: boolean = false) => {
        try {
            // First attempt to grab lock
            const lockRes = await fetch(`/api/matches/${matchId}/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': state.adminPassword
                },
                body: JSON.stringify({
                    session_id: SCORER_SESSION_ID,
                    force: forceOverride
                })
            });

            const lockData = await lockRes.json();
            if (!lockRes.ok) {
                if (lockRes.status === 403) {
                    if (state.adminPassword) {
                         setOverrideMatchId(matchId);
                         return;
                    } else {
                         setError("Match is currently locked by another device. Only an Admin can override.");
                         return;
                    }
                } else {
                    throw new Error(lockData.error || 'Failed to grab match lock');
                }
            }

            const res = await fetch(`/api/matches/${matchId}`);
            if (!res.ok) throw new Error("Could not fetch match data");
            const data = await res.json();
            dispatch({ type: 'RESUME_MATCH', payload: data });
            navigate('/');
        } catch (err: any) {
            console.error("Failed to resume match:", err);
            setError(`Could not resume match: ${err.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/matches/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': state.adminPassword }
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Delete failed');
            }
            // Refresh matches list
            const refreshRes = await fetch('/api/matches');
            const newData = await refreshRes.json();
            setMatches(newData);
            setDeleteConfirmId(null);
        } catch (err: any) {
            console.error(err);
            setError(`Error: ${err.message}`);
        }
    };

    return (
        <div className="flex-col gap-6 mh-shell">
            {/* Admin PIN indicator for consistency */}
            {!state.adminPassword && (
                <div className="glass-panel mh-note is-danger">
                    <p className="mh-note-text">
                        ⚠️ Enter Admin PIN in the sidebar to enable match deletion.
                    </p>
                </div>
            )}
            {!state.scorerPassword && (
                <div className="glass-panel mh-note is-warning">
                    <p className="mh-note-text">
                        ⚠️ Enter Scorer PIN in the sidebar to resume matches.
                    </p>
                </div>
            )}

            <div className="glass-panel mh-panel">
                <h2 className="text-gradient flex-center gap-2 mh-title">
                    <History size={28} /> Match History
                </h2>

                {error && (
                    <div className="mh-error">
                        {error}
                        <button className="mh-error-close" onClick={() => setError(null)}>&times;</button>
                    </div>
                )}

                {matches.length === 0 ? (
                    <p className="mh-empty">No historical matches found.</p>
                ) : (
                    <div className="flex-col gap-4 mh-list">
                        {matches.map(m => (
                            <div key={m.id} className="glass-card mh-card">
                                {deleteConfirmId === m.id && (
                                    <div className="mh-delete-overlay">
                                        <span className="mh-delete-title">Delete Match?</span>
                                        <button className="btn btn-danger mh-delete-btn" onClick={() => handleDelete(m.id)}>Yes, Delete</button>
                                        <button className="btn btn-secondary mh-delete-btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                    </div>
                                )}
                                <div className="mh-card-main">
                                    <h3 className="mh-scoreline">
                                        {m.team1_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team1_runs || 0}/{m.team1_wickets || 0}</span>
                                        <span className="mh-vs">vs</span>
                                        {m.team2_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team2_runs || 0}/{m.team2_wickets || 0}</span>
                                    </h3>
                                    <p className="mh-meta">
                                        {new Date(m.created_at).toLocaleString()} | Status: <span className="mh-status">{m.status}</span>
                                        {m.joker_player && (
                                            <span className="mh-joker">
                                                🃏 Joker: {m.joker_player}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="mh-bottom-row">
                                    <div className="mh-actions">
                                        <button
                                            className="btn btn-secondary mh-icon-btn"
                                            onClick={() => setViewSquadsMatch(m)}
                                            aria-label="View Squads"
                                            title="View Squads"
                                        >
                                            <Users size={14} />
                                        </button>
                                        {m.status !== 'FINISHED' && (
                                            <button 
                                                className="btn btn-primary mh-icon-btn"
                                                style={{ opacity: state.scorerPassword ? 1 : 0.3, cursor: state.scorerPassword ? 'pointer' : 'not-allowed' }}
                                                disabled={!state.scorerPassword}
                                                onClick={() => handleResume(m.id)}
                                                aria-label="Resume Match"
                                                title="Resume Match"
                                            >
                                                <Play size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-secondary mh-icon-btn"
                                            onClick={() => navigate(`/history/${m.id}`)}
                                            aria-label="View Scorecard"
                                            title="View Scorecard"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            className="btn btn-danger mh-icon-btn"
                                            style={{ opacity: state.adminPassword ? 1 : 0.3, cursor: state.adminPassword ? 'pointer' : 'not-allowed' }}
                                            disabled={!state.adminPassword}
                                            onClick={() => setDeleteConfirmId(m.id)}
                                            aria-label="Delete Match"
                                            title="Delete Match"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Squads Viewer Modal */}
            {viewSquadsMatch && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem' }}>Match Squads</h2>
                            <button onClick={() => setViewSquadsMatch(null)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-success)', marginBottom: '1rem' }}>{viewSquadsMatch.team1_name}</h3>
                                <div className="flex-col gap-2">
                                    {JSON.parse(viewSquadsMatch.team1_squad || '[]').map((p: string) => (
                                        <div key={p} className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{p}</div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>{viewSquadsMatch.team2_name}</h3>
                                <div className="flex-col gap-2">
                                    {JSON.parse(viewSquadsMatch.team2_squad || '[]').map((p: string) => (
                                        <div key={p} className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{p}</div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setViewSquadsMatch(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }}>Close</button>
                    </div>
                </div>
            )}

            {/* Admin Override Modal */}
            {overrideMatchId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', border: '1px solid var(--accent-danger)' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-danger)', marginBottom: '1rem' }}>Match Locked</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            This match is currently being actively scored by another device.
                            As an Admin, you can forcefully take over scoring, which will permanently lock out the other user.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => { setOverrideMatchId(null); handleResume(overrideMatchId, true); }} className="btn btn-danger" style={{ flex: 1 }}>Force Takeover</button>
                            <button onClick={() => setOverrideMatchId(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
