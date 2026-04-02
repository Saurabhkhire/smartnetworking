import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sn_user') || 'null'); } catch { return null; }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('sn_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sn_theme', theme);
  }, [theme]);

  const login = (userData) => {
    localStorage.setItem('sn_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sn_user');
    setUser(null);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <AuthContext.Provider value={{ user, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
