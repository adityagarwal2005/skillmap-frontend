import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../api/notifications';
import { getUser } from '../api/users';
import '../pages/FeedPage.css';

const SVG = {
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  sun:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

const svg = (children) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const I = {
  home:          svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>),
  people:        svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M17.5 20a5.2 5.2 0 0 0-2.3-4.3" /></>),
  freelance:     svg(<><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8 7.5V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12.5h18" /></>),
  collab:        svg(<><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z" /><path d="M3 12.5l9 4.5 9-4.5" /><path d="M3 17l9 4.5 9-4.5" /></>),
  messages:      svg(<path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.5A8 8 0 1 1 21 11.5z" />),
  profile:       svg(<><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>),
  notifications: svg(<><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14.5 18 8.5z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  settings:      svg(<><line x1="4" y1="21" x2="4" y2="13" /><line x1="4" y1="9" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="15" /><line x1="20" y1="11" x2="20" y2="3" /><line x1="1.5" y1="13" x2="6.5" y2="13" /><line x1="9.5" y1="8" x2="14.5" y2="8" /><line x1="17.5" y1="15" x2="22.5" y2="15" /></>),
  create:        svg(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
};

const NAV = [
  { group: 'Discover', items: [
    { id: 'home',    label: 'Home',    path: '/',       icon: I.home },
    { id: 'people',  label: 'People',  path: '/people', icon: I.people },
  ]},
  { group: 'Work', items: [
    { id: 'freelance', label: 'Freelance', path: '/freelance', icon: I.freelance },
    { id: 'collab',    label: 'Collab',    path: '/collab',    icon: I.collab },
    { id: 'messages',  label: 'Messages',  path: '/messages',  icon: I.messages },
  ]},
  { group: 'You', items: [
    { id: 'profile',       label: 'Profile',       path: null,             icon: I.profile },
    { id: 'notifications', label: 'Notifications', path: '/notifications', icon: I.notifications },
    { id: 'settings',      label: 'Settings',      path: '/settings',      icon: I.settings },
  ]},
];

const MOBILE = [
  { id: 'home',     label: 'Home',     path: '/',            icon: I.home },
  { id: 'people',   label: 'People',   path: '/people',      icon: I.people },
  { id: 'create',   label: 'Post',     path: '/create-post', icon: I.create },
  { id: 'messages', label: 'Messages', path: '/messages',    icon: I.messages },
  { id: 'profile',  label: 'You',      path: null,           icon: I.profile },
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
  const [avatar, setAvatar] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
    if (user?.id) {
      getUser(user.id).then(r => setAvatar(r.data.profile_image || null)).catch(() => {});
    }
  }, [user?.id]);

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
          <button className="topbar-btn topbar-bell" aria-label="Notifications"
            onClick={() => navigate('/notifications')}>
            {I.notifications}
            {unread > 0 && <span className="topbar-bell-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button className="topbar-btn" aria-label="Toggle theme"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVG.sun : SVG.moon}
          </button>
          <div className="topbar-avatar" onClick={() => navigate(`/profile/${user?.id}`)}>
            {avatar
              ? <img className="ava-img" src={avatar} alt="" />
              : user?.username?.[0]?.toUpperCase()}
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
                  <span className="sidebar-link-ic">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                  {item.id === 'notifications' && unread > 0 && (
                    <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
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

      {/* Bottom tab bar — mobile only (CSS hides it on desktop) */}
      <nav className="mobile-nav">
        {MOBILE.map(item => (
          <button key={item.id}
            className={`mobile-nav-btn ${activeId === item.id ? 'active' : ''} ${item.id === 'create' ? 'is-create' : ''}`}
            onClick={() => handleNav(item)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {robot && (
        <img className="feed-robot" src="/robot.png" alt="" aria-hidden="true"
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}
