import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMatch } from '../store/MatchContext';
import { ArrowLeft, RefreshCcw, ClipboardList, Users, Flag } from 'lucide-react';

function SetupControlIcon() {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="ms-setup-title-icon"
        >
            <defs>
                <linearGradient id="setupIconGradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ef4444" />
                    <stop offset="0.55" stopColor="#a855f7" />
                    <stop offset="1" stopColor="#0ea5e9" />
                </linearGradient>
            </defs>

            <line x1="3" y1="6" x2="21" y2="6" stroke="url(#setupIconGradient)" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="12" x2="21" y2="12" stroke="url(#setupIconGradient)" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="18" x2="21" y2="18" stroke="url(#setupIconGradient)" strokeWidth="2" strokeLinecap="round" />

            <circle cx="8" cy="6" r="2.5" fill="#ffffff" stroke="url(#setupIconGradient)" strokeWidth="2" />
            <circle cx="15" cy="12" r="2.5" fill="#ffffff" stroke="url(#setupIconGradient)" strokeWidth="2" />
            <circle cx="11" cy="18" r="2.5" fill="#ffffff" stroke="url(#setupIconGradient)" strokeWidth="2" />
        </svg>
    );
}

function ManagePlayersIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="setup-manage-link-icon"
        >
            <defs>
                <linearGradient id="managePlayersIconGradient" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f59e0b" />
                    <stop offset="0.55" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#0ea5e9" />
                </linearGradient>
            </defs>

            <circle cx="12" cy="8" r="3" fill="#ffffff" stroke="url(#managePlayersIconGradient)" strokeWidth="1.8" />
            <circle cx="5.5" cy="10" r="2.2" fill="#ffffff" stroke="url(#managePlayersIconGradient)" strokeWidth="1.6" />
            <circle cx="18.5" cy="10" r="2.2" fill="#ffffff" stroke="url(#managePlayersIconGradient)" strokeWidth="1.6" />

            <path d="M7.2 18.3c.5-2.2 2.5-3.8 4.8-3.8 2.3 0 4.3 1.6 4.8 3.8" stroke="url(#managePlayersIconGradient)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2.9 18.4c.3-1.3 1.5-2.3 2.9-2.3 1.4 0 2.6.9 2.9 2.3" stroke="url(#managePlayersIconGradient)" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M15.3 18.4c.3-1.3 1.5-2.3 2.9-2.3 1.4 0 2.6.9 2.9 2.3" stroke="url(#managePlayersIconGradient)" strokeWidth="1.6" strokeLinecap="round" />

            <circle cx="18.2" cy="5.6" r="2.1" fill="#ffffff" stroke="url(#managePlayersIconGradient)" strokeWidth="1.4" />
            <path d="M18.2 4.65v1.9M17.25 5.6h1.9" stroke="url(#managePlayersIconGradient)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

export default function MatchSetup() {
    const { state, dispatch } = useMatch();
    const MAX_TEAM_SELECTION = 11;

    const [team1, setTeam1] = useState('');
    const [team2, setTeam2] = useState('');
    const [team1Squad, setTeam1Squad] = useState<string[]>([]);
    const [team2Squad, setTeam2Squad] = useState<string[]>([]);
    const [playerFilter, setPlayerFilter] = useState('');
    const [squadView, setSquadView] = useState<'all' | 'team1' | 'team2'>('all');
    const [oversInput, setOversInput] = useState('');
    const [noExtraRuns, setNoExtraRuns] = useState(false);
    const [useJoker, setUseJoker] = useState(false);
    const [jokerPlayer, setJokerPlayer] = useState<string | null>(null);
    const [setupError, setSetupError] = useState('');
    const [selectionError, setSelectionError] = useState('');
    const [showMandatoryNote, setShowMandatoryNote] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({
        team1: false,
        team2: false,
        overs: false,
        scorerPin: false,
        team1Squad: false,
        team2Squad: false,
        jokerPlayer: false
    });

    const [availablePlayers, setAvailablePlayers] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        fetch('/api/players')
            .then(res => res.json())
            .then(data => setAvailablePlayers((data as any[]).filter(p => p.is_active !== 0)))
            .catch(console.error);
    }, []);

    const [batter1, setBatter1] = useState('');
    const [batter2, setBatter2] = useState('');
    const [bowler, setBowler] = useState('');

    const [tossWinner, setTossWinner] = useState('');
    const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
    const [isTossing, setIsTossing] = useState(false);
    const [tossResult, setTossResult] = useState<'Heads' | 'Tails' | null>(null);
    const canPickSquads = !!team1.trim() && !!team2.trim() && !!oversInput.trim() && Number(oversInput) > 0;

    const getTeamLabel = (teamName: string, fallback: string) => {
        const trimmed = teamName.trim();
        const full = trimmed || fallback;
        const isTruncated = !!trimmed && trimmed.length > 4;
        const short = isTruncated ? `${trimmed.slice(0, 4)}...` : full;
        return { full, short, isTruncated };
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        const missingFields: string[] = [];
        const overs = Number(oversInput);
        const hasExactTeam1 = team1Squad.length === MAX_TEAM_SELECTION;
        const hasExactTeam2 = team2Squad.length === MAX_TEAM_SELECTION;
        const jokerSelectionInvalid = useJoker && (!jokerPlayer || !team1Squad.includes(jokerPlayer) || !team2Squad.includes(jokerPlayer));
        const nextErrors = {
            team1: !team1.trim(),
            team2: !team2.trim(),
            overs: !oversInput.trim() || !overs || overs <= 0,
            scorerPin: !state.scorerPassword.trim(),
            team1Squad: !hasExactTeam1,
            team2Squad: !hasExactTeam2,
            jokerPlayer: jokerSelectionInvalid
        };

        setFieldErrors(nextErrors);
        setShowMandatoryNote(true);

        if (!team1.trim()) missingFields.push('Team 1 Name');
        if (!team2.trim()) missingFields.push('Team 2 Name');
        if (!oversInput.trim() || !overs || overs <= 0) missingFields.push('Total Overs');
        if (!state.scorerPassword.trim()) missingFields.push('Scorer PIN');
        if (!hasExactTeam1) missingFields.push('Team 1 Squad (exactly 11 players)');
        if (!hasExactTeam2) missingFields.push('Team 2 Squad (exactly 11 players)');
        if (jokerSelectionInvalid) missingFields.push('Joker Player selection');

        if (missingFields.length > 0) {
            setSetupError(`Please complete required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const scorerPin = state.scorerPassword.trim();
            const verifyResponse = await fetch('/api/auth/scorer/verify', {
                headers: {
                    'x-scorer-password': scorerPin
                }
            });

            if (!verifyResponse.ok) {
                if (verifyResponse.status === 403) {
                    setFieldErrors(prev => ({ ...prev, scorerPin: true }));
                    setSetupError('Scorer PIN is incorrect. Please enter correct PIN to proceed to toss.');
                } else {
                    setSetupError('Scorer PIN verification failed on server. Please retry or restart server.');
                }
                return;
            }
        } catch {
            setSetupError('Unable to verify Scorer PIN right now. Please try again.');
            return;
        }

        setShowMandatoryNote(false);
        setSetupError('');

        dispatch({
            type: 'SET_TEAMS',
            payload: { team1, team2, team1_squad: team1Squad, team2_squad: team2Squad, overs, noExtraRuns, jokerPlayer }
        });
    };

    const assignPlayerTeam = (playerName: string, team: 1 | 2 | null) => {
        if (!canPickSquads) {
            setSelectionError('Enter Team 1, Team 2, and Total Overs first.');
            return;
        }

        if (playerName === jokerPlayer) return;

        if (team === 1) {
            if (team1Squad.includes(playerName)) {
                setTeam1Squad((prev) => prev.filter((name) => name !== playerName));
                setSelectionError('');
                return;
            }
            if (team1Squad.length >= MAX_TEAM_SELECTION) {
                setSelectionError(`${team1 || 'Team 1'} already has ${MAX_TEAM_SELECTION} players. Remove one to add another.`);
                return;
            }

            setTeam1Squad((prev) => [...prev, playerName]);
            setTeam2Squad((prev) => prev.filter((name) => name !== playerName));
            setSelectionError('');
            return;
        }

        if (team === 2) {
            if (team2Squad.includes(playerName)) {
                setTeam2Squad((prev) => prev.filter((name) => name !== playerName));
                setSelectionError('');
                return;
            }
            if (team2Squad.length >= MAX_TEAM_SELECTION) {
                setSelectionError(`${team2 || 'Team 2'} already has ${MAX_TEAM_SELECTION} players. Remove one to add another.`);
                return;
            }

            setTeam2Squad((prev) => [...prev, playerName]);
            setTeam1Squad((prev) => prev.filter((name) => name !== playerName));
            setSelectionError('');
            return;
        }

        setTeam1Squad((prev) => prev.filter((name) => name !== playerName));
        setTeam2Squad((prev) => prev.filter((name) => name !== playerName));
        setSelectionError('');
    };

    const clearSquads = () => {
        if (!canPickSquads) return;

        const shouldClear = window.confirm('Are you sure you want to reset squad selections?');
        if (!shouldClear) return;

        if (jokerPlayer) {
            setTeam1Squad([jokerPlayer]);
            setTeam2Squad([jokerPlayer]);
            setSelectionError('');
            return;
        }
        setTeam1Squad([]);
        setTeam2Squad([]);
        setSelectionError('');
    };

    const handleTossSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tossWinner && tossDecision) {
            dispatch({ type: 'SET_TOSS', payload: { winner: tossWinner, decision: tossDecision } });
        }
    };

    const simulateToss = () => {
        setIsTossing(true);
        setTossResult(null); // Reset previous toss
        setTimeout(() => {
            const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
            setTossResult(result);
            setIsTossing(false);

            // Optionally, randomly pre-fill the winner/decision for convenience, or let them pick.
            // Here we just show the coin and pre-fill one of the teams as the winner.
            const winner = Math.random() > 0.5 ? state.teams.team1 : state.teams.team2;
            setTossWinner(winner);
        }, 1500);
    };

    const startMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batter1 || !bowler) return;

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-scorer-password': state.scorerPassword 
                },
                body: JSON.stringify({
                    team1_name: state.teams.team1,
                    team2_name: state.teams.team2,
                    toss_winner: state.toss.winner,
                    toss_decision: state.toss.decision,
                    total_overs: state.config.overs,
                    team1_squad: state.teams.team1_squad,
                    team2_squad: state.teams.team2_squad,
                    no_extra_runs: state.config.noExtraRuns,
                    joker_player: state.config.jokerPlayer
                })
            });

            if (!response.ok) {
                const data = await response.json();
                alert(`Error starting match: ${data.error || 'Server error'}`);
                return;
            }

            const data = await response.json();

            dispatch({
                type: 'START_MATCH',
                payload: {
                    matchId: data.match_id,
                    inningsId: data.current_innings_id,
                    batter1,
                    batter2: batter2 || '',
                    bowler
                }
            });
        } catch (err) {
            console.error('Failed to start match via API', err);
            alert(`Network Error: failed to start match`);
        }
    };

    if (state.status === 'SETUP') {
        const filteredPlayers = availablePlayers.filter((p) =>
            p.name.toLowerCase().includes(playerFilter.trim().toLowerCase())
        );
        const visiblePlayers = filteredPlayers.filter((p) => {
            if (squadView === 'team1') return team1Squad.includes(p.name);
            if (squadView === 'team2') return team2Squad.includes(p.name);
            return true;
        });
        const availableJokerPlayers = availablePlayers.filter((p) => {
            if (p.name === jokerPlayer) return true;
            const inTeam1 = team1Squad.includes(p.name);
            const inTeam2 = team2Squad.includes(p.name);
            return !inTeam1 && !inTeam2;
        });
        const team1Label = getTeamLabel(team1, 'Team 1');
        const team2Label = getTeamLabel(team2, 'Team 2');
        const team1MaxReached = team1Squad.length >= MAX_TEAM_SELECTION;
        const team2MaxReached = team2Squad.length >= MAX_TEAM_SELECTION;
        const selectedPlayersCount = new Set([...team1Squad, ...team2Squad]).size;
        const canClearSelection = selectedPlayersCount >= 2;
        const hasMatchBasics = !!team1.trim() && !!team2.trim() && !!oversInput.trim() && Number(oversInput) > 0;
        const hasPickSquads = team1Squad.length === MAX_TEAM_SELECTION && team2Squad.length === MAX_TEAM_SELECTION;
        const hasReadyToToss = !!state.scorerPassword.trim();
        const hasValidJoker = !useJoker || (!!jokerPlayer && team1Squad.includes(jokerPlayer) && team2Squad.includes(jokerPlayer));
        const canProceedToToss = hasMatchBasics && hasPickSquads && hasReadyToToss && hasValidJoker;

        return (
            <div className="glass-panel custom-scrollbar ms-setup-panel">
                <div className="setup-topbar ms-setup-topbar">
                    <h2 className="text-gradient ms-setup-title ms-setup-title-wrap">
                        <SetupControlIcon />
                        <span>Match Setup</span>
                    </h2>
                    <Link to="/players" className="setup-manage-link">
                        <ManagePlayersIcon />
                        <span>Manage Players</span>
                    </Link>
                </div>

                <form onSubmit={handleSetup} className="flex-col gap-4">
                    <section className="glass-card ms-section">
                        <h3 className="ms-section-title ms-heading-with-icon">
                            <ClipboardList size={18} className="ms-heading-icon" />
                            <span>Match Basics</span>
                        </h3>

                        <div className="setup-grid">
                            <div className="flex-col gap-2">
                                <label>Team 1 Name <span className="ms-required-star">*</span></label>
                                <input className={showMandatoryNote && fieldErrors.team1 ? 'ms-input-error' : ''} value={team1} onChange={e => setTeam1(e.target.value)} placeholder="Enter Team Name" />
                            </div>

                            <div className="flex-col gap-2">
                                <label>Team 2 Name <span className="ms-required-star">*</span></label>
                                <input className={showMandatoryNote && fieldErrors.team2 ? 'ms-input-error' : ''} value={team2} onChange={e => setTeam2(e.target.value)} placeholder="Enter Team Name" />
                            </div>
                        </div>

                        <div className="setup-grid ms-grid-spacer-top">
                            <div className="flex-col gap-2">
                                <label>Total Overs <span className="ms-required-star">*</span></label>
                                <input className={showMandatoryNote && fieldErrors.overs ? 'ms-input-error' : ''} type="number" value={oversInput} onChange={e => setOversInput(e.target.value)} min={1} max={100} placeholder="Enter Overs" />
                            </div>

                            <div className="ms-toggle-row">
                                <div className="ms-toggle-field">
                                    <label className="ms-toggle-label">No Extra Runs</label>
                                    <div className="ms-yesno-toggle" role="group" aria-label="No extra runs">
                                        <button
                                            type="button"
                                            className={`ms-yesno-btn ${noExtraRuns ? 'is-active' : ''}`}
                                            onClick={() => setNoExtraRuns(true)}
                                            aria-pressed={noExtraRuns}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`ms-yesno-btn ${!noExtraRuns ? 'is-active' : ''}`}
                                            onClick={() => setNoExtraRuns(false)}
                                            aria-pressed={!noExtraRuns}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                <div className="ms-toggle-field">
                                    <label className="ms-toggle-label">Joker Player (in both teams)</label>
                                    <div className="ms-yesno-toggle" role="group" aria-label="Use joker player">
                                        <button
                                            type="button"
                                            className={`ms-yesno-btn ${useJoker ? 'is-active' : ''}`}
                                            onClick={() => setUseJoker(true)}
                                            aria-pressed={useJoker}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`ms-yesno-btn ${!useJoker ? 'is-active' : ''}`}
                                            onClick={() => {
                                                setUseJoker(false);
                                                const currentJoker = jokerPlayer;
                                                setJokerPlayer(null);
                                                if (currentJoker) {
                                                    setTeam1Squad(prev => prev.filter(name => name !== currentJoker));
                                                    setTeam2Squad(prev => prev.filter(name => name !== currentJoker));
                                                }
                                            }}
                                            aria-pressed={!useJoker}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {useJoker && (
                                    <div className="flex-col gap-2">
                                        <label className="ms-joker-label">Select Joker Player <span className="ms-required-star">*</span></label>
                                        <select
                                            className={showMandatoryNote && fieldErrors.jokerPlayer ? 'ms-input-error' : 'ms-joker-select'}
                                            value={jokerPlayer || ''}
                                            onChange={e => {
                                                const nextJoker = e.target.value || null;
                                                const prevJoker = jokerPlayer;

                                                const projectedTeam1 = prevJoker && team1Squad.includes(prevJoker)
                                                    ? team1Squad.length - 1
                                                    : team1Squad.length;
                                                const projectedTeam2 = prevJoker && team2Squad.includes(prevJoker)
                                                    ? team2Squad.length - 1
                                                    : team2Squad.length;

                                                if (nextJoker && projectedTeam1 >= MAX_TEAM_SELECTION) {
                                                    setSelectionError(`${team1 || 'Team 1'} already has ${MAX_TEAM_SELECTION} players. Remove one to assign Joker.`);
                                                    return;
                                                }

                                                if (nextJoker && projectedTeam2 >= MAX_TEAM_SELECTION) {
                                                    setSelectionError(`${team2 || 'Team 2'} already has ${MAX_TEAM_SELECTION} players. Remove one to assign Joker.`);
                                                    return;
                                                }

                                                setJokerPlayer(nextJoker);

                                                if (prevJoker && prevJoker !== nextJoker) {
                                                    setTeam1Squad(prev => prev.filter(name => name !== prevJoker));
                                                    setTeam2Squad(prev => prev.filter(name => name !== prevJoker));
                                                }

                                                if (nextJoker) {
                                                    setTeam1Squad(prev => prev.includes(nextJoker) ? prev : [...prev, nextJoker]);
                                                    setTeam2Squad(prev => prev.includes(nextJoker) ? prev : [...prev, nextJoker]);
                                                }

                                                setSelectionError('');
                                            }}
                                        >
                                            <option value="">Pick a player</option>
                                            {availableJokerPlayers.map(p => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className={`glass-card ms-section ${showMandatoryNote && (fieldErrors.team1Squad || fieldErrors.team2Squad) ? 'ms-section-error' : ''}`}>
                        <div className="flex-between stack-mobile ms-section-header">
                            <h3 className="ms-heading-with-icon">
                                <Users size={18} className="ms-heading-icon" />
                                <span>Pick Squads <span className="ms-required-star">*</span></span>
                            </h3>
                        </div>

                        <div className="flex gap-2 ms-chip-row">
                            <button
                                type="button"
                                className={`ms-chip-btn ${squadView === 'all' ? 'is-active-all' : ''}`}
                                onClick={() => setSquadView('all')}
                                disabled={!canPickSquads}
                            >
                                All Players
                            </button>

                            <button
                                type="button"
                                className={`ms-chip-btn ${squadView === 'team1' ? 'is-active-team1' : ''}`}
                                onClick={() => setSquadView('team1')}
                                disabled={!canPickSquads}
                            >
                                <span
                                    className={team1Label.isTruncated ? 'tooltip-anchor' : ''}
                                    data-tooltip={team1Label.isTruncated ? team1Label.full : undefined}
                                    title={team1Label.full}
                                >
                                    {team1Label.short}
                                </span>: <strong className="ms-chip-count-team1">{team1Squad.length}/{MAX_TEAM_SELECTION}</strong>
                            </button>
                            <button
                                type="button"
                                className={`ms-chip-btn ${squadView === 'team2' ? 'is-active-team2' : ''}`}
                                onClick={() => setSquadView('team2')}
                                disabled={!canPickSquads}
                            >
                                <span
                                    className={team2Label.isTruncated ? 'tooltip-anchor' : ''}
                                    data-tooltip={team2Label.isTruncated ? team2Label.full : undefined}
                                    title={team2Label.full}
                                >
                                    {team2Label.short}
                                </span>: <strong className="ms-chip-count-team2">{team2Squad.length}/{MAX_TEAM_SELECTION}</strong>
                            </button>
                        </div>

                        {selectionError && (
                            <div className="ms-error-banner">
                                {selectionError}
                            </div>
                        )}

                        {!canPickSquads && (
                            <div className="ms-info-banner">
                                Enter Team 1, 2 Names, and Total Overs to unlock squad selection.
                            </div>
                        )}

                        <div className="glass-panel ms-selection-container">
                            <div className="flex ms-selection-toolbar">
                                <input
                                    className="ms-search-input"
                                    value={playerFilter}
                                    onChange={(e) => setPlayerFilter(e.target.value)}
                                    placeholder="Search player..."
                                    disabled={!canPickSquads}
                                />

                                <button
                                    type="button"
                                    className="btn btn-danger tooltip-anchor ms-clear-btn"
                                    onClick={clearSquads}
                                    data-tooltip={!canPickSquads ? 'Enter team names and overs first' : (canClearSelection ? 'Clear selection' : 'Select at least 2 players')}
                                    aria-label="Clear selection"
                                    disabled={!canPickSquads || !canClearSelection}
                                >
                                    <RefreshCcw size={16} />
                                </button>
                            </div>

                            <div className="flex-col gap-2 custom-scrollbar ms-player-list">
                                {visiblePlayers.length === 0 && (
                                    <div className="ms-empty-state">
                                        No players found for this selection.
                                    </div>
                                )}

                                {visiblePlayers.map((p) => {
                                    const isJoker = p.name === jokerPlayer;
                                    const isTeam1 = team1Squad.includes(p.name);
                                    const isTeam2 = team2Squad.includes(p.name);
                                    const currentValue = isJoker ? 'joker' : isTeam1 ? 'team1' : isTeam2 ? 'team2' : '';
                                    const hasAnySelection = currentValue === 'team1' || currentValue === 'team2';
                                    const lockedToTeam1 = currentValue === 'team1';
                                    const lockedToTeam2 = currentValue === 'team2';
                                    const disableTeam1ByLock = lockedToTeam2;
                                    const disableTeam2ByLock = lockedToTeam1;
                                    const disableTeam1ByMax = !isTeam1 && team1MaxReached;
                                    const disableTeam2ByMax = !isTeam2 && team2MaxReached;
                                    const disableTeam1Option = disableTeam1ByLock || disableTeam1ByMax;
                                    const disableTeam2Option = disableTeam2ByLock || disableTeam2ByMax;
                                    const team1Tooltip = disableTeam1ByMax
                                        ? `Max players reached for ${team1 || 'Team 1'}`
                                        : (disableTeam1ByLock ? `Unselect ${team2Label.full} first` : undefined);
                                    const team2Tooltip = disableTeam2ByMax
                                        ? `Max players reached for ${team2 || 'Team 2'}`
                                        : (disableTeam2ByLock ? `Unselect ${team1Label.full} first` : undefined);

                                    return (
                                        <div
                                            key={`assignment-${p.id}`}
                                            className={`flex-between ms-player-row ${isJoker ? 'is-joker' : isTeam1 ? 'is-team1' : isTeam2 ? 'is-team2' : ''}`}
                                        >
                                            <div className="tooltip-anchor ms-player-name-wrap" data-tooltip={p.name}>
                                                <span className="ms-player-name-text">
                                                    {p.name} {isJoker && <span className="ms-joker-tag">(Joker)</span>}
                                                </span>
                                            </div>

                                            {isJoker ? (
                                                <span className="ms-joker-assigned">
                                                    Assigned to both teams
                                                </span>
                                            ) : (
                                                <div className="flex ms-toggle-group">
                                                    <span
                                                        className={`${team1Tooltip ? 'tooltip-anchor' : ''} ms-max-tooltip-wrap`}
                                                        data-tooltip={team1Tooltip}
                                                    >
                                                        <button
                                                            type="button"
                                                            className={`btn btn-secondary ms-toggle-btn ms-toggle-btn-team1 ${currentValue === 'team1' ? 'is-active' : ''} ${!hasAnySelection ? 'is-idle' : ''} ${disableTeam1ByLock ? 'is-blocked' : ''}`}
                                                            onClick={() => assignPlayerTeam(p.name, 1)}
                                                            disabled={!canPickSquads || disableTeam1Option}
                                                            title={team1Label.full}
                                                        >
                                                            {team1Label.short}
                                                        </button>
                                                    </span>

                                                    <span
                                                        className={`${team2Tooltip ? 'tooltip-anchor' : ''} ms-max-tooltip-wrap`}
                                                        data-tooltip={team2Tooltip}
                                                    >
                                                        <button
                                                            type="button"
                                                            className={`btn btn-secondary ms-toggle-btn ms-toggle-btn-team2 ${currentValue === 'team2' ? 'is-active' : ''} ${!hasAnySelection ? 'is-idle' : ''} ${disableTeam2ByLock ? 'is-blocked' : ''}`}
                                                            onClick={() => assignPlayerTeam(p.name, 2)}
                                                            disabled={!canPickSquads || disableTeam2Option}
                                                            title={team2Label.full}
                                                        >
                                                            {team2Label.short}
                                                        </button>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </section>

                    <section className="glass-card ms-ready-section">
                        <h3 className="ms-ready-title ms-heading-with-icon">
                            <Flag size={18} className="ms-heading-icon" />
                            <span>Ready to Toss</span>
                        </h3>
                        <div className="flex-col gap-2 ms-ready-pin-group">
                            <label className="ms-ready-pin-label">Enter Scorer PIN <span className="ms-required-star">*</span></label>
                            <input
                                type="password"
                                placeholder="Enter Scorer PIN"
                                value={state.scorerPassword}
                                className={showMandatoryNote && fieldErrors.scorerPin ? 'ms-input-error' : ''}
                                onChange={(e) => {
                                    dispatch({ type: 'SET_SCORER_PASSWORD', payload: e.target.value });
                                    localStorage.setItem('scorer_password', e.target.value);
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!canProceedToToss}
                            title={!canProceedToToss ? 'Complete Match Basics, Pick Squads, and Ready to Toss details' : undefined}
                        >
                            Proceed to Toss
                        </button>

                        {setupError && (
                            <div className="ms-error-banner ms-error-banner-top">
                                {setupError}
                            </div>
                        )}
                    </section>
                </form>
            </div>
        );
    }

    if (state.status === 'TOSS') {
        const isBattingFirst = (state.toss.winner === state.teams.team1 && state.toss.decision === 'bat') ||
            (state.toss.winner === state.teams.team2 && state.toss.decision === 'bowl') ? state.teams.team1 : state.teams.team2;
        const isBowlingFirst = isBattingFirst === state.teams.team1 ? state.teams.team2 : state.teams.team1;
        const battingFirstSquad = isBattingFirst === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;
        const bowlingFirstSquad = isBowlingFirst === state.teams.team1 ? state.teams.team1_squad : state.teams.team2_squad;
        const jokerPlayerName = state.config.jokerPlayer;
        const isJokerSelectedAsOpener = !!jokerPlayerName && (batter1 === jokerPlayerName || batter2 === jokerPlayerName);
        const openingBowlerOptions = isJokerSelectedAsOpener && jokerPlayerName
            ? Array.from(new Set([...bowlingFirstSquad, jokerPlayerName]))
            : bowlingFirstSquad;
        const getPlayerOptionLabel = (playerName: string) => (
            jokerPlayerName && playerName === jokerPlayerName
                ? `${playerName} (Joker)`
                : playerName
        );
        const goBackToSetup = () => {
            dispatch({ type: 'BACK_TO_SETUP' });
        };

        return (
            <div className="glass-panel ms-toss-panel">
                <div className="ms-toss-header">
                    <button type="button" className="btn btn-secondary ms-toss-back-btn" onClick={goBackToSetup}>
                        <ArrowLeft size={16} />
                        Back to match setup
                    </button>
                    <h2 className="text-gradient ms-toss-title">Coin Toss</h2>
                </div>

                {!state.toss.winner ? (
                    <div className="flex-col gap-6">
                        <div className="flex-col gap-4 flex-center ms-toss-flip-block">
                            <div className={`ball-bubble ms-toss-coin ${isTossing ? 'animate-pulse' : ''} ${tossResult ? 'has-result' : ''}`}>
                                {isTossing ? '...' : tossResult ? tossResult : '🪙'}
                            </div>
                            <button type="button" className="btn btn-primary" onClick={simulateToss} disabled={isTossing}>
                                {isTossing ? 'Flipping Coin...' : 'Flip Coin (Random)'}
                            </button>
                        </div>

                        <div>
                            <p className="ms-toss-note">Enter Toss Details:</p>
                            <form onSubmit={handleTossSubmit} className="flex-col gap-4 text-left">
                                <div className="flex-col gap-2">
                                    <label>Who won the toss?</label>
                                    <select value={tossWinner} onChange={e => setTossWinner(e.target.value)} required>
                                        <option value="" disabled>Select Team</option>
                                        <option value={state.teams.team1}>{state.teams.team1}</option>
                                        <option value={state.teams.team2}>{state.teams.team2}</option>
                                    </select>
                                </div>
                                <div className="flex-col gap-2">
                                    <label>What did they decide to do?</label>
                                    <select value={tossDecision} onChange={e => setTossDecision(e.target.value as 'bat' | 'bowl')} required>
                                        <option value="bat">Bat</option>
                                        <option value="bowl">Bowl</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-secondary ms-btn-top-sm">
                                    Confirm Manual Toss
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-col gap-6">
                        <div className="glass-card ms-toss-winner-card">
                            <h3 className="ms-toss-winner-title">{state.toss.winner} Won the Toss!</h3>
                            <p className="ms-toss-winner-text">They elected to <strong>{state.toss.decision}</strong> first.</p>
                        </div>

                        <form onSubmit={startMatch} className="flex-col gap-4 text-left ms-start-form">
                            <h4 className="ms-start-heading">Openers ({isBattingFirst})</h4>
                            <div className="flex-col gap-2">
                                <label>Striker</label>
                                <select
                                    value={batter1}
                                    onChange={e => {
                                        const nextStriker = e.target.value;
                                        setBatter1(nextStriker);
                                        if (batter2 && batter2 === nextStriker) {
                                            setBatter2('');
                                        }
                                    }}
                                    required
                                >
                                    <option value="" disabled>Select Player...</option>
                                    {battingFirstSquad.map(p => (
                                        <option key={`b1-${p}`} value={p} disabled={!!batter2 && batter2 === p}>
                                            {getPlayerOptionLabel(p)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-col gap-2">
                                <label>Non-Striker (Optional)</label>
                                <select
                                    value={batter2}
                                    onChange={e => {
                                        const nextNonStriker = e.target.value;
                                        setBatter2(nextNonStriker);
                                        if (nextNonStriker && batter1 === nextNonStriker) {
                                            setBatter1('');
                                        }
                                    }}
                                >
                                    <option value="">None / One Batter Mode</option>
                                    {battingFirstSquad.map(p => (
                                        <option key={`b2-${p}`} value={p} disabled={!!batter1 && batter1 === p}>
                                            {getPlayerOptionLabel(p)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <h4 className="ms-start-heading ms-start-heading-gap">Opening Bowler ({isBowlingFirst})</h4>
                            <div className="flex-col gap-2">
                                <label>Bowler Name</label>
                                <select value={bowler} onChange={e => setBowler(e.target.value)} required>
                                    <option value="" disabled>Select Player...</option>
                                    {openingBowlerOptions.map(p => (
                                        <option key={`bo-${p}`} value={p}>
                                            {getPlayerOptionLabel(p)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary ms-btn-top-lg" disabled={!state.scorerPassword}>
                                Let's Play!
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
