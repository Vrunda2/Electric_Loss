import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Bolt, LayoutGrid, House, AlertTriangle, TrendingUp, CircleDollarSign, BarChart3, LogOut } from 'lucide-react';
import './index.css';

import { API } from './services/api';
import Dashboard from './pages/Dashboard';
import Households from './pages/Households';
import Anomalies from './pages/Anomalies';
import Forecast from './pages/Forecast';
import Cost from './pages/Cost';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import ChatbotWidget from './components/ChatbotWidget';

function Sidebar({ onLogout }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo-icon glass-panel">
            <Bolt color="#fff" size={20} />
          </div>
          <div>
            <div className="logo-name" style={{fontWeight: 700, fontSize: '15px'}}>Electric Loss</div>
            <div className="logo-sub" style={{fontSize: '11px', color: 'var(--muted)'}}>Analytics Platform</div>
          </div>
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label" style={{fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, padding: '16px 20px 8px'}}>Navigation</div>
        
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><LayoutGrid size={16}/></span> Dashboard
        </NavLink>
        <NavLink to="/households" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><House size={16}/></span> Households
        </NavLink>
        <NavLink to="/anomalies" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><AlertTriangle size={16}/></span> Anomalies
        </NavLink>
        <NavLink to="/forecast" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><TrendingUp size={16}/></span> Forecast
        </NavLink>
        <NavLink to="/cost" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><CircleDollarSign size={16}/></span> Cost & Benchmark
        </NavLink>
        <NavLink to="/analytics" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <span className="icon"><BarChart3 size={16}/></span> Analytics
        </NavLink>

        <div className="nav-label" style={{fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, padding: '32px 20px 8px'}}>System</div>
        <button onClick={onLogout} className="nav-link logout-btn" style={{border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', textAlign: 'left'}}>
          <span className="icon"><LogOut size={16} color="#f43f5e"/></span> 
          <span style={{color: '#f43f5e'}}>Logout (Admin)</span>
        </button>

      </div>
      {/* Removed API status footer */}

      
      <style>{`
        .sidebar { width: 260px; height: 100vh; position: fixed; top: 0; left: 0; background: var(--sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; backdrop-filter: var(--glass); z-index: 100; }
        .sidebar-header { padding: 24px 20px; border-bottom: 1px solid var(--border2); }
        .logo-row { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; border-radius: 10px; }
        .nav-link { display: flex; align-items: center; gap: 12px; padding: 10px 20px; margin: 2px 10px; border-radius: 10px; text-decoration: none; color: var(--text2); font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .nav-link:hover { background: var(--border2); color: var(--text); }
        .nav-link.active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
        .nav-link .icon { display: flex; align-items: center; justify-content: center; width: 20px; opacity: 0.8; }
        .nav-link.active .icon { opacity: 1; }
        .logout-btn:hover { background: rgba(244, 63, 94, 0.05) !important; }
      `}</style>
    </nav>
  );
}

function TopBar() {
  const curDate = new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
  const location = useLocation();
  const pageTitle = location.pathname === '/' ? 'Dashboard' : location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="topbar">
      <div className="topbar-title">{pageTitle}</div>
      {/* Removed Admin: Active */}


      <style>{`
        .topbar { position: fixed; top: 0; left: 260px; right: 0; height: 72px; background: var(--surface); backdrop-filter: var(--glass); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 32px; z-index: 99; transition: left 0.3s ease; }
        .topbar-title { font-size: 18px; font-weight: 600; flex: 1; letter-spacing: -0.02em; }
        @media (max-width: 800px) { .topbar { left: 0; } }
      `}</style>
    </div>
  );
}

function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [auth, setAuth] = useState(API.isAuthenticated());

  useEffect(() => {
    const handleAuth = () => setAuth(API.isAuthenticated());
    window.addEventListener('auth-change', handleAuth);
    window.addEventListener('auth-expired', handleAuth);
    return () => {
      window.removeEventListener('auth-change', handleAuth);
      window.removeEventListener('auth-expired', handleAuth);
    }
  }, []);

  const handleLogout = () => {
    API.logout();
    setAuth(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={auth ? <Navigate to="/" replace /> : <Login />} />
        
        <Route path="*" element={
          <ProtectedRoute isAuthenticated={auth}>
            <div className="app-container">
              <Sidebar onLogout={handleLogout} />
              <TopBar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/households" element={<Households />} />
                  <Route path="/anomalies" element={<Anomalies />} />
                  <Route path="/forecast" element={<Forecast />} />
                  <Route path="/cost" element={<Cost />} />
                  <Route path="/analytics" element={<Analytics />} />
                </Routes>
              </main>
              <ChatbotWidget />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
