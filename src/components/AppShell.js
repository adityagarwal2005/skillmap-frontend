import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../api/notifications';
import '../pages/FeedPage.css';

const SVG = {
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  sun:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

const NAV = [
  { group: 'Discover', items: [
    { id: 'home',    label: 'Home',    path: '/' },
    { id: 'people',  label: 'People',  path: '/people' },
  ]},
  { group: 'Work', items: [
    { id: 'freelance', label: 'Freelance', path: '/freelance' },
    { id: 'collab',    label: 'Collab',    path: '/collab' },
    { id: 'messages',  label: 'Messages',  path: '/messages' },
  ]},
  { group: 'You', items: [
    { id: 'profile',       label: 'Profile',       path: null },
    { id: 'notifications', label: 'Notifications', path: '/notifications' },
    { id: 'settings',      label: 'Settings',      path: '/settings' },
  ]},
];

function deriveActive(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/search'))        return 'search';
  if (pathname.startsWith('/people'))        return 'people';
  if (pathname.startsWith('/freelance'))     return 'freelance';
  if (pathname.startsWith('/collab'))        return 'collab';
  if (pathname.startsWith('/messages'))      return 'messages';
  if (pathname.startsWith('/profile'))       return 'profile';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/settings'))      return 'settings';
  return '';
}

/**
 * Shared application chrome: dark frosted topbar + dark editorial nav rail +
 * signature robot. Every authenticated page renders its content as children,
 * which float as a steel panel on the dark chrome.
 *
 * Props:
 *   active        override the highlighted nav item (else derived from URL)
 *   searchValue   controlled value for the topbar search (optional)
 *   onSearchChange(value)  controlled onChange (optional)
 *   onSearchSubmit(e)      controlled submit (optional; default navigates to /search)
 */
export default function AppShell({
  children,
  active,
  robot = false,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
  }, []);

  const activeId = active || deriveActive(location.pathname);

  const handleNav = (item) => {
    if (item.id === 'profile') { navigate(`/profile/${user?.id}`); return; }
    if (item.path) navigate(item.path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) { onSearchSubmit(e); return; }
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const searchVal = searchValue !== undefined ? searchValue : q;
  const handleSearchChange = (e) =>
    onSearchChange ? onSearchChange(e.target.value) : setQ(e.target.value);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="topbar-search">
          <span className="topbar-search-icon">{SVG.search}</span>
          <input className="topbar-search-input"
            placeholder="Search work, skills, or @username…"
            value={searchVal} onChange={handleSearchChange} />
          <button type="submit" className="topbar-search-btn">Go</button>
        </form>

        <div className="topbar-right">
          <button className="topbar-btn" aria-label="Toggle theme"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVG.sun : SVG.moon}
          </button>
          <div className="topbar-avatar" onClick={() => navigate(`/profile/${user?.id}`)}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          {NAV.map(group => (
            <div className="sidebar-group" key={group.group}>
              <div className="sidebar-group-label">{group.group}</div>
              {group.items.map(item => (
                <button key={item.id}
                  className={`sidebar-link ${activeId === item.id ? 'active' : ''}`}
                  onClick={() => handleNav(item)}>
                  <span className="sidebar-link-dot" />
                  {item.label}
                  {item.id === 'notifications' && unread > 0 && (
                    <span className="sidebar-badge">{unread}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <button className="sidebar-post-btn" onClick={() => navigate('/create-post')}>
            + Post work
          </button>
        </nav>

        <main className="app-main">
          {children}
        </main>
      </div>

      {robot && (
        <img className="feed-robot" src="/robot.png" alt="" aria-hidden="true"
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}
