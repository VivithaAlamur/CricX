import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Users, Trash2 } from 'lucide-react';
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
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewSquadsMatch, setViewSquadsMatch] = useState<any | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const { state } = useMatch();

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
            setEditingPlayerId(null);
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

        // Scroll to form
        if (formRef.current) {
            window.scrollTo({
                top: formRef.current.offsetTop - 20,
                behavior: 'smooth'
            });
        }
    };

    const cancelEdit = () => {
        setEditingPlayerId(null);
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setIsActive(true);
        setError('');
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
        <div className="flex-col gap-6" style={{ maxWidth: '800px', margin: '0 auto' }}>

            <div className="glass-panel" style={{ padding: '2rem' }} ref={formRef}>
                <h2 className="text-gradient flex-center gap-2" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <UserPlus size={28} />
                    {editingPlayerId ? 'Edit Player Details' : 'Add New Player'}
                </h2>
                {!editingPlayerId && !state.adminPassword && (
                    <div className="flex-center" style={{ marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(76, 175, 80, 0.1)', color: 'var(--accent-success)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(76, 175, 80, 0.3)', fontWeight: 600 }}>
                            🔓 Public Registration: No PIN Required
                        </span>
                    </div>
                )}

                <form onSubmit={addPlayer} className="flex-col gap-4">
                    <div className="flex gap-4 stack-mobile" style={{ alignItems: 'flex-end' }}>
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>First Name</label>
                            <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Virat"
                                required
                            />
                        </div>
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Middle Name (Optional)</label>
                            <input
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                                placeholder="Kumar"
                            />
                        </div>
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last Name</label>
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Kohli"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, position: 'relative' }} disabled={editingPlayerId !== null && !state.adminPassword}>
                            {editingPlayerId ? 'Update Player' : 'Register Player'}
                        </button>
                        {editingPlayerId && (
                            <button type="button" className="btn btn-secondary" style={{ flex: 0.5 }} onClick={cancelEdit}>
                                Cancel
                            </button>
                        )}
                    </div>
                    {editingPlayerId !== null && !state.adminPassword && <p style={{ fontSize: '0.8rem', color: 'var(--accent-danger)', textAlign: 'center' }}>Enter Admin PIN in the top right header to enable updating.</p>}
                </form>
            </div>

            {error && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-danger)', marginBottom: '1rem' }}>Attention</h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{error}</p>
                        <button onClick={() => setError('')} className="btn btn-primary" style={{ width: '100%' }}>Dismiss</button>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div className="flex-between stack-mobile gap-4" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="flex gap-2" style={{ color: 'var(--text-primary)', margin: 0, alignItems: 'center' }}>
                        <Users size={24} color="var(--accent-primary)" /> Global Player Database
                    </h3>
                    <div className="flex gap-4 stack-mobile" style={{ alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Search names..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '180px' }}
                        />
                        <label className="flex gap-2" style={{ cursor: 'pointer', alignItems: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            <input
                                type="checkbox"
                                checked={showOnlyActive}
                                onChange={(e) => setShowOnlyActive(e.target.checked)}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <span>Active Only</span>
                        </label>
                    </div>
                </div>

                {players.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No players registered yet.</p>
                ) : (
                    <div className="grid grid-mobile-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                        {filteredPlayers.map(p => (
                            <div key={p.id} className="glass-card flex-col gap-4" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden', opacity: p.is_active === 0 ? 0.6 : 1 }}>
                                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
                                    <label className="flex gap-1" style={{ cursor: 'pointer', alignItems: 'center', fontSize: '0.65rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={p.is_active !== 0}
                                            onChange={() => togglePlayerActive(p)}
                                            style={{ width: '12px', height: '12px' }}
                                        />
                                        <span style={{ fontWeight: 700, color: p.is_active === 0 ? 'var(--text-muted)' : 'var(--accent-success)' }}>
                                            {p.is_active === 0 ? 'INACTIVE' : 'ACTIVE'}
                                        </span>
                                    </label>
                                </div>
                                {deleteConfirmId === p.id && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 10, padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ width: '100%', fontWeight: 700, color: 'var(--accent-danger)', fontSize: '0.9rem' }}>Delete {p.name}?</div>
                                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }} onClick={() => removePlayer(p.id)}>Delete</button>
                                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                    </div>
                                )}
                                <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                    <div
                                        onClick={() => setSelectedPlayer(p)}
                                        style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-tertiary)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            {p.name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="flex-col" style={{ flex: 1 }}>
                                        <div className="flex-between">
                                            <span
                                                onClick={() => setSelectedPlayer(p)}
                                                style={{ fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                {p.name}
                                            </span>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => editPlayer(p)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', opacity: state.adminPassword ? 0.6 : 0.2 }}
                                                    disabled={!state.adminPassword}
                                                    title="Edit Player"
                                                >
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>EDIT</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(p.id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: state.adminPassword ? 0.6 : 0.2 }}
                                                    disabled={!state.adminPassword}
                                                    title="Remove Player"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-success)' }} />
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Stats</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-between" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div className="flex-col text-center">
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Runs</span>
                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{p.total_runs || 0}</span>
                                    </div>
                                    <div className="flex-col text-center">
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Wickets</span>
                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{p.total_wickets || 0}</span>
                                    </div>
                                    <div className="flex-col text-center">
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Played</span>
                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{p.balls_faced || 0}b</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detailed Stats Modal */}
            {selectedPlayer && (
                <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, padding: '1rem', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem', position: 'relative' }}>
                        <button
                            onClick={() => setSelectedPlayer(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}
                        >
                            &times;
                        </button>

                        <div className="flex-col gap-6">
                                <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>
                                        {selectedPlayer.name.charAt(0)}
                                    </div>
                                    <div className="flex-col">
                                        <h2 style={{ fontSize: '1.8rem' }}>{selectedPlayer.name}</h2>
                                        <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>
                                            Matches: {selectedPlayer.matches_played || 0} • W: {selectedPlayer.matches_won || 0} • L: {selectedPlayer.matches_lost || 0} • J: {selectedPlayer.matches_joker || 0}
                                        </span>
                                    </div>
                                </div>

                            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                {/* Batting Stats */}
                                <div className="glass-card flex-col gap-3" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Batting</h4>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Runs</span>
                                        <span style={{ fontWeight: 700 }}>{selectedPlayer.total_runs || 0}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Balls</span>
                                        <span style={{ fontWeight: 700 }}>{selectedPlayer.balls_faced || 0}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>SR</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {selectedPlayer.balls_faced && selectedPlayer.balls_faced > 0
                                                ? ((selectedPlayer.total_runs || 0) / selectedPlayer.balls_faced * 100).toFixed(1)
                                                : '0.0'}
                                        </span>
                                    </div>
                                </div>

                                {/* Bowling Stats */}
                                <div className="glass-card flex-col gap-3" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Bowling</h4>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Wkts</span>
                                        <span style={{ fontWeight: 700 }}>{selectedPlayer.total_wickets || 0}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Overs</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {selectedPlayer.legal_balls_bowled
                                                ? (Math.floor(selectedPlayer.legal_balls_bowled / 6) + (selectedPlayer.legal_balls_bowled % 6) / 10).toFixed(1)
                                                : '0.0'}
                                        </span>
                                    </div>
                                    <div className="flex-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Econ</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {selectedPlayer.legal_balls_bowled && selectedPlayer.legal_balls_bowled > 0
                                                ? ((selectedPlayer.runs_conceded || 0) / (selectedPlayer.legal_balls_bowled / 6)).toFixed(2)
                                                : '0.00'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Match History Section */}
                            <div className="flex-col gap-3">
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Match Performance</h4>
                                {loadingHistory ? (
                                    <div className="animate-pulse" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading history...</div>
                                ) : history.length === 0 ? (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matches recorded yet.</p>
                                ) : (
                                    <div className="flex-col gap-2" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
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
                                                <div key={idx} className="glass-card flex-col gap-2" style={{ padding: '0.75rem', fontSize: '0.85rem', background: bgColor, borderColor: borderColor }}>
                                                    <div className="flex-between">
                                                        <span style={{ fontWeight: 600 }}>
                                                            {m.team1_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team1_runs || 0}/{m.team1_wickets || 0}</span>
                                                            <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>vs</span>
                                                            {m.team2_name} <span style={{ color: 'var(--accent-primary)' }}>{m.team2_runs || 0}/{m.team2_wickets || 0}</span>
                                                        </span>
                                                        <div className="flex-col" style={{ alignItems: 'flex-end', gap: '2px' }}>
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Unknown Date'}</span>
                                                            {matchStatus === 'WON' && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-success)', textTransform: 'uppercase' }}>Won</span>}
                                                            {matchStatus === 'LOST' && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-danger)', textTransform: 'uppercase' }}>Lost</span>}
                                                            {matchStatus === 'JOKER' && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-warning)', textTransform: 'uppercase' }}>Joker</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-between" style={{ padding: '0.4rem 0', borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                                                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>Played for: {teamName}</span>
                                                        </div>
                                                        <div className="flex gap-3" style={{ fontWeight: 700 }}>
                                                            <span title="Runs Scored">{m.player_runs || 0}r</span>
                                                            <span style={{ color: 'var(--accent-secondary)' }} title="Wickets Taken">{m.player_wickets || 0}w</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2" style={{ marginTop: '0.2rem' }}>
                                                        <button
                                                            onClick={() => setViewSquadsMatch(m)}
                                                            className="btn btn-secondary"
                                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                                                        >
                                                            View Squads
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary" 
                                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }} 
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

                            <div className="flex-col gap-2">
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teams Represented</h4>
                                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
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
                                        <span key={i} style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-light)' }}>
                                            {t}
                                        </span>
                                    ))}
                                    {history.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>None yet</span>}
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={() => setSelectedPlayer(null)}>Close</button>
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
