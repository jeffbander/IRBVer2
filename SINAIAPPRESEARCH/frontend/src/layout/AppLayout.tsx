import { Link, NavLink, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AppLayout.css';

const navItems = [
  { to: '/studies', label: 'Studies' },
];

export const AppLayout = ({ children }: PropsWithChildren) => {
  const { token, setToken } = useAuth();
  const [draftToken, setDraftToken] = useState(token ?? '');
  const location = useLocation();

  const handleApply = () => {
    setToken(draftToken ? draftToken.trim() : null);
  };

  const handleClear = () => {
    setDraftToken('');
    setToken(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <Link to="/studies">Research Study Hub</Link>
          <span className="app-subtitle">IRB, budgets, and start-up control center</span>
        </div>
        <div className="token-input">
          <label htmlFor="token">Bearer token</label>
          <div className="token-controls">
            <input
              id="token"
              value={draftToken}
              onChange={(event) => setDraftToken(event.target.value)}
              placeholder="Optional when dev auth is enabled"
            />
            <button type="button" onClick={handleApply}>
              Apply
            </button>
            <button type="button" className="secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </header>
      <div className="app-body">
        <nav className="app-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="path-hint">Current route: {location.pathname}</div>
        </nav>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};
