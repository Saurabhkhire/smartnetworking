import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import EventsCalendar from './pages/EventsCalendar.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import EventJoin from './pages/EventJoin.jsx';
import EventRoom from './pages/EventRoom.jsx';
import MyEvents from './pages/MyEvents.jsx';
import Checkin from './pages/Checkin.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import Results from './pages/Results.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function NavLink({ to, children, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link to={to} style={{
      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
      textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 500,
      padding: '6px 14px', borderRadius: 8, transition: 'all 0.15s',
      background: isActive ? 'var(--accent-soft)' : 'transparent',
      display: 'flex', alignItems: 'center', gap: 6,
      border: isActive ? '1px solid rgba(124,111,255,0.25)' : '1px solid transparent',
    }}
    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; } }}
    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </Link>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const { user, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Navigation */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '10px 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)',
        position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <Link to={user ? '/events' : '/'} style={{ textDecoration: 'none', marginRight: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', boxShadow: '0 2px 8px rgba(124,111,255,0.4)' }}>
            SN
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>
            Smart<span style={{ color: 'var(--accent)' }}>Networking</span>
          </span>
        </Link>

        {user && (
          <div style={{ display: 'flex', gap: 2 }}>
            <NavLink to="/events" icon="🗓">Events</NavLink>
            <NavLink to="/my-events" icon="⭐">My Events</NavLink>
            <NavLink to="/create-event" icon="✚">Create</NavLink>
            <NavLink to="/checkin" icon="✓">Check-in</NavLink>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s', color: 'var(--text-secondary)' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <Link to="/profile" style={{
              display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
              padding: '6px 14px 6px 8px', borderRadius: 100, background: 'var(--bg-card)',
              border: '1px solid var(--border)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {(user.name || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name?.split(' ')[0]}</span>
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, transition: 'all 0.15s' }}>
                Sign In
              </Link>
              <Link to="/register" style={{ padding: '7px 18px', borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--info))', fontSize: 13, color: '#fff', textDecoration: 'none', fontWeight: 600, boxShadow: '0 2px 8px rgba(124,111,255,0.3)' }}>
                Get Started →
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/events" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/events" replace /> : <RegisterPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={user ? '/events' : '/login'} replace />} />

        {/* Protected routes */}
        <Route path="/events" element={<ProtectedRoute><EventsCalendar /></ProtectedRoute>} />
        <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
        <Route path="/event/:id/join" element={<ProtectedRoute><EventJoin /></ProtectedRoute>} />
        <Route path="/event/:id/room" element={<ProtectedRoute><EventRoom /></ProtectedRoute>} />
        <Route path="/my-events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />
        <Route path="/organizer" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Legacy routes */}
        <Route path="/results/:eventName/:personName" element={<Results />} />
        <Route path="/chat/:eventId/:personId" element={<Results />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? '/events' : '/login'} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
