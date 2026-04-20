import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
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
        <div className="flex-col gap-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Admin PIN indicator for consistency */}
            {!state.adminPassword && (
                <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', textAlign: 'center', border: '1px solid var(--accent-danger)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-danger)' }}>
                        ⚠️ Enter Admin PIN in the sidebar to enable match deletion.
                    </p>
                </div>
            )}
            {!state.scorerPassword && (
                <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', textAlign: 'center', border: '1px solid var(--accent-warning)', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-warning)' }}>
                        ⚠️ Enter Scorer PIN in the sidebar to resume matches.
                    </p>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 className="text-gradient flex-center gap-2" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <History size={28} /> Match History
                </h2>

                {error && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', borderRadius: '8px', color: 'var(--accent-danger)', textAlign: 'center', position: 'relative' }}>
                        {error}
                        <button onClick={() => setError(null)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>&times;</button>
                    </div>
                )}

                {matches.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No historical matches found.</p>
                ) : (
                    <div className="flex-col gap-4">
                        {matches.map(m => (
                            <div key={m.id} className="glass-card flex-between stack-mobile" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                                {deleteConfirmId === m.id && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 10 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>Delete Match?</span>
                                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(m.id)}>Yes, Delete</button>
                                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                    </div>
                                )}
                                <div className="flex-col gap-1">
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                        {m.team1_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team1_runs || 0}/{m.team1_wickets || 0}</span>
                                        <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>vs</span>
                                        {m.team2_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team2_runs || 0}/{m.team2_wickets || 0}</span>
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        {new Date(m.created_at).toLocaleString()} | Status: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.status}</span>
                                        {m.joker_player && (
                                            <span style={{ marginLeft: '1rem', color: 'var(--accent-warning)', fontWeight: 600 }}>
                                                🃏 Joker: {m.joker_player}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
                                        <button
                                            onClick={() => setViewSquadsMatch(m)}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-success)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                        >
                                            View Squads
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                    {m.status !== 'FINISHED' && (
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ flex: 1, fontSize: '0.85rem', opacity: state.scorerPassword ? 1 : 0.3, cursor: state.scorerPassword ? 'pointer' : 'not-allowed' }} 
                                            disabled={!state.scorerPassword}
                                            onClick={() => handleResume(m.id)}
                                        >
                                            Resume
                                        </button>
                                    )}
                                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => navigate(`/history/${m.id}`)}>
                                        View
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        style={{ flex: 1, fontSize: '0.85rem', opacity: state.adminPassword ? 1 : 0.3, cursor: state.adminPassword ? 'pointer' : 'not-allowed' }}
                                        disabled={!state.adminPassword}
                                        onClick={() => setDeleteConfirmId(m.id)}
                                    >
                                        Delete
                                    </button>
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
