import { useState, useEffect } from 'react';
import { Trophy, Medal, Target, Zap, TrendingUp } from 'lucide-react';

interface PlayerStats {
    id: number;
    name: string;
    total_runs: number;
    total_wickets: number;
    balls_faced: number;
    legal_balls_bowled: number;
    runs_conceded: number;
    is_active?: number;
}

export default function Rankings() {
    const [stats, setStats] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/players/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '50vh' }}>
                <div className="animate-pulse" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Calculating Rankings...</div>
            </div>
        );
    }

    // Top Batters by Runs
    const topBatters = [...stats]
        .filter(s => s.total_runs > 0)
        .sort((a, b) => b.total_runs - a.total_runs)
        .slice(0, 10);

    // Top Bowlers by Wickets
    const topBowlers = [...stats]
        .filter(s => s.total_wickets > 0)
        .sort((a, b) => {
            if (b.total_wickets !== a.total_wickets) return b.total_wickets - a.total_wickets;
            // Tie breaker: Economy Rate (lower is better)
            const economyA = a.legal_balls_bowled > 0 ? (a.runs_conceded / (a.legal_balls_bowled / 6)) : 99;
            const economyB = b.legal_balls_bowled > 0 ? (b.runs_conceded / (b.legal_balls_bowled / 6)) : 99;
            return economyA - economyB;
        })
        .slice(0, 10);

    // Best Strike Rate (min 20 balls faced)
    const bestStrikeRate = [...stats]
        .filter(s => s.balls_faced >= 10)
        .map(s => ({ ...s, sr: (s.total_runs / s.balls_faced) * 100 }))
        .sort((a, b) => b.sr - a.sr)
        .slice(0, 5);

    return (
        <div className="flex-col gap-8" style={{ paddingBottom: '4rem' }}>
            <div className="flex-center flex-col gap-2">
                <div className="flex-center" style={{ gap: '0.65rem' }}>
                    <Trophy size={42} color="var(--accent-warning)" className="animate-pulse" />
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Player Rankings</h1>
                </div>
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', paddingTop: '0.7rem' }}>

                {/* Batting Leaderboard */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                        <h3 className="flex gap-2">
                            <Target color="var(--accent-primary)" /> Top Batters
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BY TOTAL RUNS</span>
                    </div>
                    <div className="flex-col gap-3 rk-leaderboard-list">
                        {topBatters.map((p, i) => (
                            <div key={p.id} className="glass-card flex-between rk-leaderboard-card" style={{ borderLeft: i === 0 ? '4px solid var(--accent-warning)' : '1px solid var(--border-light)' }}>
                                <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, color: i < 3 ? 'var(--accent-warning)' : 'var(--text-muted)', width: '20px' }}>{i + 1}</span>
                                    <div className="flex-col">
                                        <span style={{ fontWeight: 600 }}>
                                            {p.name} {p.is_active === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Inactive)</span>}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.balls_faced} balls faced</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{p.total_runs}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SR: {((p.total_runs / (p.balls_faced || 1)) * 100).toFixed(1)}</div>
                                </div>
                            </div>
                        ))}
                        {topBatters.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No batting data yet</p>}
                    </div>
                </div>

                {/* Bowling Leaderboard */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                        <h3 className="flex gap-2">
                            <Zap color="var(--accent-secondary)" /> Top Bowlers
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BY WICKETS</span>
                    </div>
                    <div className="flex-col gap-3 rk-leaderboard-list">
                        {topBowlers.map((p, i) => {
                            const overs = (Math.floor(p.legal_balls_bowled / 6) + (p.legal_balls_bowled % 6) / 10).toFixed(1);
                            const econ = p.legal_balls_bowled > 0 ? (p.runs_conceded / (p.legal_balls_bowled / 6)).toFixed(2) : '0.00';
                            return (
                                <div key={p.id} className="glass-card flex-between rk-leaderboard-card" style={{ borderLeft: i === 0 ? '4px solid var(--accent-primary)' : '1px solid var(--border-light)' }}>
                                    <div className="flex gap-4" style={{ alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, color: i < 3 ? 'var(--accent-primary)' : 'var(--text-muted)', width: '20px' }}>{i + 1}</span>
                                        <div className="flex-col">
                                            <span style={{ fontWeight: 600 }}>
                                                {p.name} {p.is_active === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Inactive)</span>}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{overs} overs bowled</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{p.total_wickets}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ECON: {econ}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {topBowlers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bowling data yet</p>}
                    </div>
                </div>

            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {/* Highlight Sections */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 className="flex gap-2" style={{ marginBottom: '1rem', color: 'var(--accent-success)' }}>
                        <TrendingUp size={20} /> High Impact Strike Rates
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Min. 10 balls faced</p>
                    <div className="flex-col gap-2">
                        {bestStrikeRate.map(p => (
                            <div key={p.id} className="flex-between" style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-light)', opacity: p.is_active === 0 ? 0.6 : 1 }}>
                                <span style={{ fontSize: '0.9rem' }}>
                                    {p.name} {p.is_active === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(Inact.)</span>}
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--accent-success)' }}>{p.sr.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 className="flex gap-2" style={{ marginBottom: '1rem', color: 'var(--accent-warning)' }}>
                        <Medal size={20} /> Most Consistent
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Top All-Round Value</p>
                    {stats.length > 0 ? (
                        <div className="glass-card flex-col gap-2" style={{ padding: '1rem', textAlign: 'center', opacity: stats[0].is_active === 0 ? 0.7 : 1 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                {stats[0].name} {stats[0].is_active === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Inactive)</span>}
                            </div>
                            <div className="flex-center gap-4" style={{ fontSize: '0.8rem' }}>
                                <span>{stats[0].total_runs} Runs</span>
                                <span>{stats[0].total_wickets} Wickets</span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</p>
                    )}
                </div>
            </div>
        </div>
    );
}
