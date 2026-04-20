import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useMatch } from './store/MatchContext';
import MatchSetup from './pages/MatchSetup';
import LiveScoring from './pages/LiveScoring';
import MatchSummary from './pages/MatchSummary';
import PlayerRoster from './pages/PlayerRoster';
import MatchHistory from './pages/MatchHistory';
import Rankings from './pages/Rankings';
import { Activity, Users, History, Trophy, Lock, Unlock, Menu, X } from 'lucide-react';

function MatchFlow() {
  const { state } = useMatch();

  return (
    <>
      {(state.status === 'SETUP' || state.status === 'TOSS') && <MatchSetup />}
      {(state.status === 'IN_PROGRESS' || state.status === 'INNINGS_BREAK') && <LiveScoring />}
      {state.status === 'FINISHED' && <MatchSummary />}
    </>
  );
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const { state, dispatch } = useMatch();

  const handlePasswordChange = (val: string) => {
    dispatch({ type: 'SET_ADMIN_PASSWORD', payload: val });
    localStorage.setItem('admin_password', val);
  };

  const menuItems = [
    { path: '/', label: 'Match', icon: <Activity size={20} /> },
    { path: '/players', label: 'Players', icon: <Users size={20} /> },
    { path: '/history', label: 'Match History', icon: <History size={20} /> },
    { path: '/rankings', label: 'Rankings', icon: <Trophy size={20} /> },
  ];

  return (
    <>
      <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header flex-between">
          <h2 style={{ color: 'var(--accent-primary)', margin: 0, fontSize: '1.05rem' }}>CricScore</h2>
          <button className="menu-btn" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-col">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer flex-col gap-4">
          <div className="flex-col gap-2">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {state.adminPassword ? <Unlock size={14} color="var(--accent-success)" /> : <Lock size={14} color="var(--accent-danger)" />}
              ADMIN PIN (Delete)
            </span>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Admin PIN"
                value={state.adminPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            CricScore Pro v1.0.0
          </p>
        </div>
      </div>
    </>
  );
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="container" style={{ paddingTop: '3.75rem' }}>
        <header className="flex-between" style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 900,
          padding: '0.3rem 1rem',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          background: 'rgba(244, 249, 255, 0.92)',
          backdropFilter: 'blur(4px)'
        }}>
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)} style={{ border: 'none', background: 'transparent', width: '40px', height: '40px' }}>
            <Menu size={24} />
          </button>

          <h1 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>CricScore</h1>
        </header>

        <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        <main>
          <Routes>
            <Route path="/" element={<MatchFlow />} />
            <Route path="/players" element={<PlayerRoster />} />
            <Route path="/history" element={<MatchHistory />} />
            <Route path="/history/:matchId" element={<MatchSummary />} />
            <Route path="/rankings" element={<Rankings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
