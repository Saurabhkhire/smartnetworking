import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      const data = await api.login({ email: email.trim() });
      login({ personId: data.personId, name: data.name, email: data.email, roles: data.roles, companyName: data.companyName });
      navigate('/events');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', letterSpacing: -1, marginBottom: 8 }}>
            SmartNetworking
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            AI-powered professional networking
          </div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Sign in with your email to continue</p>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit} className="stack">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Demo: try <span style={{ color: 'var(--accent)' }}>saurabhskhire@gmail.com</span> or any seeded attendee email
        </p>
      </div>
    </div>
  );
}
