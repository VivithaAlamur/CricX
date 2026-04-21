import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMatch } from '../store/MatchContext';

interface Player {
    id: number;
    name: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    total_runs?: number;
    total_wickets?: number;
    balls_faced?: number;
    legal_balls_bowled?: number;
    runs_conceded?: number;
    is_active?: number;
    matches_played?: number;
    matches_won?: number;
    matches_lost?: number;
    matches_joker?: number;
}

export default function PlayerRoster() {
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewSquadsMatch, setViewSquadsMatch] = useState<any | null>(null);
    const [showPlayerFormModal, setShowPlayerFormModal] = useState(false);
    const { state, dispatch } = useMatch();

    const goBackToMatchSetup = () => {
        dispatch({ type: 'BACK_TO_SETUP' });
        navigate('/');
    };

    const openAddPlayerModal = () => {
        setEditingPlayerId(null);
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setIsActive(true);
        setError('');
        setShowPlayerFormModal(true);
    };

    const fetchPlayers = async () => {
        try {
            const res = await fetch('/api/players/stats');
            const data = await res.json();
            setPlayers(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    useEffect(() => {
        if (selectedPlayer) {
            setLoadingHistory(true);
            fetch(`/api/players/${selectedPlayer.id}/history`)
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    setHistory(Array.isArray(data) ? data : []);
                    setLoadingHistory(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoadingHistory(false);
                });
        } else {
            setHistory([]);
        }
    }, [selectedPlayer]);

    const addPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!firstName.trim() || !lastName.trim()) return;

        const isEditing = editingPlayerId !== null;
        const url = isEditing ? `/api/players/${editingPlayerId}` : '/api/players';
        const method = isEditing ? 'PUT' : 'POST';

        const headers: any = {
            'Content-Type': 'application/json',
        };
        // Only require and send password for editing
        if (state.adminPassword) {
            headers['x-admin-password'] = state.adminPassword;
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: headers,
                body: JSON.stringify({
                    first_name: firstName.trim(),
                    middle_name: middleName.trim(),
                    last_name: lastName.trim(),
                    is_active: isActive
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to add player');
                return;
            }

            setFirstName('');
            setMiddleName('');
            setLastName('');
            setIsActive(true);
            setEditingPlayerId(null);
            setShowPlayerFormModal(false);
            fetchPlayers(); // Reload list
        } catch (err) {
            setError('An error occurred');
        }
    };

    const editPlayer = (p: Player) => {
        setEditingPlayerId(p.id);

        // Handle legacy players who don't have separate name fields yet
        let f = p.first_name || '';
        let m = p.middle_name || '';
        let l = p.last_name || '';

        if (!f && !l && p.name) {
            const parts = p.name.trim().split(/\s+/);
            if (parts.length === 1) {
                f = parts[0];
            } else if (parts.length === 2) {
                f = parts[0];
                l = parts[1];
            } else if (parts.length >= 3) {
                f = parts[0];
                m = parts.slice(1, -1).join(' ');
                l = parts[parts.length - 1];
            }
        }

        setFirstName(f);
        setMiddleName(m);
        setLastName(l);
        setIsActive(p.is_active !== 0);
        setError('');
        setShowPlayerFormModal(true);
    };

    const cancelEdit = () => {
        setEditingPlayerId(null);
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setIsActive(true);
        setError('');
        setShowPlayerFormModal(false);
    };

    const togglePlayerActive = async (p: Player) => {
        if (!state.adminPassword) {
            setError("Admin PIN required to toggle player status.");
            return;
        }
        try {
            const res = await fetch(`/api/players/${p.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': state.adminPassword
                },
                body: JSON.stringify({
                    first_name: p.first_name || p.name.split(' ')[0],
                    middle_name: p.middle_name || '',
                    last_name: p.last_name || p.name.split(' ').slice(1).join(' '),
                    is_active: p.is_active === 0 ? 1 : 0
                })
            });
            if (res.ok) fetchPlayers();
        } catch (err) {
            console.error(err);
        }
    };

    const removePlayer = async (id: number) => {
        try {
            const res = await fetch(`/api/players/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': state.adminPassword }
            });
            if (res.ok) {
                fetchPlayers();
                setDeleteConfirmId(null);
            } else {
                const errData = await res.json();
                throw new Error(errData.error || 'Deletion failed');
            }
        } catch (err: any) {
            console.error('Failed to remove player:', err);
            setError(`Error: ${err.message}`);
        }
    };

    const filteredPlayers = players
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesActive = !showOnlyActive || p.is_active !== 0;
            return matchesSearch && matchesActive;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="flex-col gap-6 pr-shell">

            {error && (
                <div className="pr-modal-overlay pr-modal-overlay-soft">
                    <div className="glass-panel pr-error-modal">
                        <h2 className="pr-error-title">Attention</h2>
                        <p className="pr-error-text">{error}</p>
                        <button onClick={() => setError('')} className="btn btn-primary pr-error-btn">Dismiss</button>
                    </div>
                </div>
            )}

            <div className="glass-panel pr-db-panel">
                <div className="flex-between stack-mobile gap-4 pr-db-header">
                    <div className="flex gap-3 pr-db-head-left">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={goBackToMatchSetup}
                            aria-label="Back"
                            title="Back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="pr-db-title-wrap">
                            <h3 className="flex gap-2 pr-db-title">
                            <Users size={24} color="var(--accent-primary)" /> Global Player Database
                            </h3>
                            <p className="pr-db-kicker">Showing {filteredPlayers.length} player{filteredPlayers.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openAddPlayerModal}
                    >
                        <span className="flex-center gap-2">
                            <UserPlus size={16} /> Add New Player
                        </span>
                    </button>
                </div>
                <div className="flex gap-4 stack-mobile pr-db-controls">
                    <input
                        type="text"
                        placeholder="Search names..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pr-search"
                    />
                    <div className="pr-active-only-toggle-wrap">
                        <span className="pr-active-only-title">Active Only</span>
                        <div className="pr-active-only-toggle" role="group" aria-label="Active only filter">
                            <button
                                type="button"
                                className={`pr-active-only-btn ${showOnlyActive ? 'is-active' : ''}`}
                                onClick={() => setShowOnlyActive(true)}
                                aria-pressed={showOnlyActive}
                            >
                                Yes
                            </button>
                            <button
                                type="button"
                                className={`pr-active-only-btn ${!showOnlyActive ? 'is-active' : ''}`}
                                onClick={() => setShowOnlyActive(false)}
                                aria-pressed={!showOnlyActive}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>

                {players.length === 0 ? (
                    <p className="pr-empty">No players registered yet.</p>
                ) : (
                    <div className="grid grid-mobile-1 gap-4 pr-grid">
                        {filteredPlayers.map(p => (
                            <div
                                key={p.id}
                                className={`glass-card flex-col gap-4 pr-player-card ${p.is_active === 0 ? 'is-inactive' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedPlayer(p)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedPlayer(p);
                                    }
                                }}
                            >
                                {deleteConfirmId === p.id && (
                                    <div className="pr-delete-overlay" onClick={(e) => e.stopPropagation()}>
                                        <div className="pr-delete-title">Delete {p.name}?</div>
                                        <button className="btn btn-danger pr-delete-btn" onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}>Delete</button>
                                        <button className="btn btn-secondary pr-delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}>Cancel</button>
                                    </div>
                                )}
                                <div className="pr-status-corner">
                                    <button
                                        type="button"
                                        className={`pr-status-btn ${p.is_active === 0 ? 'is-muted' : 'is-active'}`}
                                        onClick={(e) => { e.stopPropagation(); togglePlayerActive(p); }}
                                        disabled={!state.adminPassword}
                                        title={state.adminPassword ? 'Toggle player status' : 'Enter Admin PIN to change status'}
                                    >
                                        {p.is_active === 0 ? 'INACTIVE' : 'ACTIVE PLAYER'}
                                    </button>
                                    <div className="flex gap-2 pr-status-actions">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); editPlayer(p); }}
                                            className="pr-action-btn is-edit"
                                            disabled={!state.adminPassword}
                                            title="Edit Player"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                                            className="pr-action-btn is-delete"
                                            disabled={!state.adminPassword}
                                            title="Remove Player"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="pr-player-head">
                                    <div className="pr-player-main">
                                        <span
                                            onClick={() => setSelectedPlayer(p)}
                                            className="pr-player-name"
                                        >
                                            {p.name}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-between pr-stats-strip">
                                    <div className="flex-col text-center pr-stat-item">
                                        <span className="pr-stat-label">Runs:{' '}</span>
                                        <span className="pr-stat-value">{p.total_runs || 0}</span>
                                    </div>
                                    <div className="flex-col text-center pr-stat-item">
                                        <span className="pr-stat-label">Wickets:{' '}</span>
                                        <span className="pr-stat-value">{p.total_wickets || 0}</span>
                                    </div>
                                    <div className="flex-col text-center pr-stat-item">
                                        <span className="pr-stat-label">Played:{' '}</span>
                                        <span className="pr-stat-value">{p.balls_faced || 0}b</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showPlayerFormModal && (
                <div className="pr-modal-overlay pr-modal-overlay-soft">
                    <div className="glass-panel pr-form-panel pr-form-modal">
                        <button
                            type="button"
                            className="pr-profile-close"
                            onClick={cancelEdit}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                        <h2 className="text-gradient flex-center gap-2 pr-form-title">
                            <UserPlus size={28} />
                            {editingPlayerId ? 'Edit Player Details' : 'Add New Player'}
                        </h2>
                        {!editingPlayerId && !state.adminPassword && (
                            <div className="flex-center pr-public-wrap">
                                <span className="pr-public-badge">
                                    🔓 Public Registration: No PIN Required
                                </span>
                            </div>
                        )}

                        <form onSubmit={addPlayer} className="flex-col gap-4">
                            <div className="flex gap-4 stack-mobile pr-form-row">
                                <div className="flex-col gap-1 pr-form-col">
                                    <label className="pr-input-label">First Name</label>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Virat"
                                        required
                                    />
                                </div>
                                <div className="flex-col gap-1 pr-form-col">
                                    <label className="pr-input-label">Middle Name (Optional)</label>
                                    <input
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                        placeholder="Kumar"
                                    />
                                </div>
                                <div className="flex-col gap-1 pr-form-col">
                                    <label className="pr-input-label">Last Name</label>
                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Kohli"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pr-form-actions">
                                <button type="submit" className="btn btn-primary pr-submit-btn" disabled={editingPlayerId !== null && !state.adminPassword}>
                                    {editingPlayerId ? 'Update Player' : 'Register Player'}
                                </button>
                                <button type="button" className="btn btn-secondary pr-cancel-btn" onClick={cancelEdit}>
                                    Cancel
                                </button>
                            </div>
                            {editingPlayerId !== null && !state.adminPassword && <p className="pr-admin-note">Enter Admin PIN in the top right header to enable updating.</p>}
                        </form>
                    </div>
                </div>
            )}

            {/* Detailed Stats Modal */}
            {selectedPlayer && (
                <div className="pr-modal-overlay pr-profile-overlay">
                    <div className="glass-panel pr-profile-modal">
                        <button
                            onClick={() => setSelectedPlayer(null)}
                            className="pr-profile-close"
                        >
                            &times;
                        </button>

                        <div className="flex-col gap-6 pr-profile-body">
                                <div className="flex gap-4 pr-profile-head">
                                    <div className="pr-profile-avatar">
                                        {selectedPlayer.name.charAt(0)}
                                    </div>
                                    <div className="flex-col pr-profile-meta">
                                        <h2 className="pr-profile-name">{selectedPlayer.name}</h2>
                                        <span className="pr-profile-record">
                                            Matches: {selectedPlayer.matches_played || 0} • W: {selectedPlayer.matches_won || 0} • L: {selectedPlayer.matches_lost || 0} • J: {selectedPlayer.matches_joker || 0}
                                        </span>
                                    </div>
                                </div>

                            <div className="grid gap-4 pr-profile-stats-grid">
                                {/* Batting Stats */}
                                <div className="glass-card flex-col gap-3 pr-profile-stat-card">
                                    <h4 className="pr-profile-stat-title is-batting">Batting</h4>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>Runs</span>
                                        <span className="pr-profile-stat-value">{selectedPlayer.total_runs || 0}</span>
                                    </div>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>Balls</span>
                                        <span className="pr-profile-stat-value">{selectedPlayer.balls_faced || 0}</span>
                                    </div>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>SR</span>
                                        <span className="pr-profile-stat-value">
                                            {selectedPlayer.balls_faced && selectedPlayer.balls_faced > 0
                                                ? ((selectedPlayer.total_runs || 0) / selectedPlayer.balls_faced * 100).toFixed(1)
                                                : '0.0'}
                                        </span>
                                    </div>
                                </div>

                                {/* Bowling Stats */}
                                <div className="glass-card flex-col gap-3 pr-profile-stat-card">
                                    <h4 className="pr-profile-stat-title is-bowling">Bowling</h4>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>Wkts</span>
                                        <span className="pr-profile-stat-value">{selectedPlayer.total_wickets || 0}</span>
                                    </div>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>Overs</span>
                                        <span className="pr-profile-stat-value">
                                            {selectedPlayer.legal_balls_bowled
                                                ? (Math.floor(selectedPlayer.legal_balls_bowled / 6) + (selectedPlayer.legal_balls_bowled % 6) / 10).toFixed(1)
                                                : '0.0'}
                                        </span>
                                    </div>
                                    <div className="flex-between pr-profile-stat-row">
                                        <span>Econ</span>
                                        <span className="pr-profile-stat-value">
                                            {selectedPlayer.legal_balls_bowled && selectedPlayer.legal_balls_bowled > 0
                                                ? ((selectedPlayer.runs_conceded || 0) / (selectedPlayer.legal_balls_bowled / 6)).toFixed(2)
                                                : '0.00'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Match History Section */}
                            <div className="flex-col gap-3 pr-profile-history">
                                <h4 className="pr-profile-section-title">Recent Match Performance</h4>
                                {loadingHistory ? (
                                    <div className="animate-pulse pr-profile-muted">Loading history...</div>
                                ) : history.length === 0 ? (
                                    <p className="pr-profile-muted">No matches recorded yet.</p>
                                ) : (
                                    <div className="flex-col gap-2 pr-profile-history-list">
                                        {history.map((m, idx) => {
                                            const team1SquadStr = m.team1_squad || '[]';
                                            let isTeam1 = false;
                                            try {
                                                const squad = typeof team1SquadStr === 'string' ? JSON.parse(team1SquadStr) : team1SquadStr;
                                                isTeam1 = Array.isArray(squad) && squad.includes(selectedPlayer.name);
                                            } catch (e) { }

                                            const teamName = isTeam1 ? m.team1_name : m.team2_name;
                                            
                                            // Determine Match Status (Win, Loss, Tie, Joker)
                                            const isJoker = m.joker_player === selectedPlayer.name;
                                            let matchStatus = 'TIE';
                                            let bgColor = 'var(--bg-tertiary)';
                                            let borderColor = 'var(--border-light)';
                                            
                                            if (isJoker) {
                                                matchStatus = 'JOKER';
                                                bgColor = 'rgba(245, 158, 11, 0.05)';
                                                borderColor = 'rgba(245, 158, 11, 0.3)';
                                            } else if (m.status === 'FINISHED') {
                                                const t1Runs = m.team1_runs || 0;
                                                const t2Runs = m.team2_runs || 0;
                                                if (t1Runs > t2Runs) {
                                                    matchStatus = isTeam1 ? 'WON' : 'LOST';
                                                } else if (t2Runs > t1Runs) {
                                                    matchStatus = !isTeam1 ? 'WON' : 'LOST';
                                                }
                                                
                                                if (matchStatus === 'WON') {
                                                    bgColor = 'rgba(76, 175, 80, 0.05)';
                                                    borderColor = 'rgba(76, 175, 80, 0.3)';
                                                } else if (matchStatus === 'LOST') {
                                                    bgColor = 'rgba(239, 68, 68, 0.05)';
                                                    borderColor = 'rgba(239, 68, 68, 0.3)';
                                                }
                                            }

                                            return (
                                                <div key={idx} className="glass-card flex-col gap-2 pr-profile-match-card" style={{ background: bgColor, borderColor: borderColor }}>
                                                    <div className="flex-between pr-profile-match-head">
                                                        <span className="pr-profile-match-score">
                                                            {m.team1_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team1_runs || 0}/{m.team1_wickets || 0}</span>
                                                            <span className="pr-profile-vs">vs</span>
                                                            {m.team2_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team2_runs || 0}/{m.team2_wickets || 0}</span>
                                                        </span>
                                                        <div className="flex-col pr-profile-match-meta">
                                                            <span className="pr-profile-date">{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Unknown Date'}</span>
                                                            {matchStatus === 'WON' && <span className="pr-profile-result is-won">Won</span>}
                                                            {matchStatus === 'LOST' && <span className="pr-profile-result is-lost">Lost</span>}
                                                            {matchStatus === 'JOKER' && <span className="pr-profile-result is-joker">Joker</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-between pr-profile-match-mid" style={{ borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                                                        <div className="flex gap-2 pr-profile-played-wrap">
                                                            <span className="pr-profile-played-tag">Played for: {teamName}</span>
                                                        </div>
                                                        <div className="flex gap-3 pr-profile-impact">
                                                            <span title="Runs Scored">{m.player_runs || 0}r</span>
                                                            <span style={{ color: 'var(--accent-secondary)' }} title="Wickets Taken">{m.player_wickets || 0}w</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 pr-profile-match-actions">
                                                        <button
                                                            onClick={() => setViewSquadsMatch(m)}
                                                            className="btn btn-secondary pr-profile-mini-btn"
                                                        >
                                                            View Squads
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary pr-profile-mini-btn" 
                                                            onClick={() => navigate(`/history/${m.id}`)}
                                                        >
                                                            View Scorecard
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex-col gap-2 pr-profile-teams">
                                <h4 className="pr-profile-teams-title">Teams Represented</h4>
                                <div className="flex gap-2 pr-profile-teams-list">
                                    {Array.from(new Set(history.map(m => {
                                        try {
                                            const team1SquadStr = m.team1_squad || '[]';
                                            const team2SquadStr = m.team2_squad || '[]';
                                            const s1 = typeof team1SquadStr === 'string' ? JSON.parse(team1SquadStr) : team1SquadStr;
                                            const s2 = typeof team2SquadStr === 'string' ? JSON.parse(team2SquadStr) : team2SquadStr;

                                            const teams = [];
                                            if (Array.isArray(s1) && s1.includes(selectedPlayer.name)) teams.push(m.team1_name);
                                            if (Array.isArray(s2) && s2.includes(selectedPlayer.name)) teams.push(m.team2_name);
                                            return teams;
                                        } catch (e) {
                                            return [];
                                        }
                                    }).flat().filter(Boolean))).map((t: any, i) => (
                                        <span key={i} className="pr-profile-team-chip">
                                            {t}
                                        </span>
                                    ))}
                                    {history.length === 0 && <span className="pr-profile-muted">None yet</span>}
                                </div>
                            </div>
                            <button className="btn btn-secondary pr-profile-close-cta" onClick={() => setSelectedPlayer(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Squads Viewer Modal */}
            {viewSquadsMatch && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1rem' }}>
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
        </div >
    );
}
