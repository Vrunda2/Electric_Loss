import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../services/api';
import { Bolt, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await API.login(username, password);
      API.setToken(res.access_token);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch (err) {
      setError('Invalid admin credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="gradient-sphere" />
        <div className="gradient-sphere-2" />
      </div>
      
      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="login-logo glass-panel">
            <Bolt color="#fff" size={24} />
          </div>
          <h1>Login</h1>
          <p>Electric Loss</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <div className="input-icon-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Admin Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="login-btn primary" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 SmartGrid Systems • Security v1.4.2</p>
        </div>
      </div>

      <style>{`
        .login-page {
          position: fixed;
          inset: 0;
          background: #0d121f;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }
        .login-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .gradient-sphere { 
          position: absolute; top: -10%; right: -10%; width: 600px; height: 600px; 
          background: radial-gradient(circle, rgba(2,132,199,0.15) 0%, transparent 70%); 
          filter: blur(80px);
        }
        .gradient-sphere-2 { 
          position: absolute; bottom: -10%; left: -10%; width: 500px; height: 500px; 
          background: radial-gradient(circle, rgba(234,88,12,0.1) 0%, transparent 70%); 
          filter: blur(80px);
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 48px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-logo { 
          width: 56px; height: 56px; margin: 0 auto 20px; 
          background: linear-gradient(135deg, #0284c7, #06b6d4);
          display: flex; align-items: center; justify-content: center;
          border-radius: 16px;
          box-shadow: 0 8px 16px rgba(2,132,199,0.3);
        }
        .login-header h1 { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -0.02em; }
        .login-header p { font-size: 14px; color: #7b82b0; }

        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .input-icon-wrapper { position: relative; width: 100%; }
        .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .login-form input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 14px 16px 14px 48px;
          border-radius: 14px;
          color: #000;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }
        .login-form input:focus { border-color: #0284c7; background: rgba(2,132,199,0.02); box-shadow: 0 0 0 4px rgba(2,132,199,0.1); }
        
        .login-btn {
          margin-top: 8px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px; border-radius: 14px; border: none;
          cursor: pointer; font-size: 16px; font-weight: 700;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-btn.primary { background: #0284c7; color: #fff; }
        .login-btn.primary:hover { background: #0369a1; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(2,132,199,0.3); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }

        .login-error {
          background: rgba(244,63,94,0.1);
          color: #f43f5e;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(244,63,94,0.2);
        }
        .login-footer { margin-top: 40px; text-align: center; }
        .login-footer p { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
        
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
