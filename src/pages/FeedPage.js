import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getFeed, getTrending } from '../api/feed';
import { reactToItem } from '../api/portfolio';
import { getUnreadCount } from '../api/notifications';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';

const SIDEBAR = [
  { group: 'Discover', items: [
    { id: 'feed',      label: 'Feed',      path: '/' },
    { id: 'trending',  label: 'Trending',  path: '/' },
    { id: 'search',    label: 'Search',    path: '/search' },
    { id: 'people',    label: 'People',    path: '/people' },
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

const SVG = {
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  sun:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  ext:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

export default function FeedPage() {
  const { user, logoutUser }    = useAuth();
  const { showToast }           = useToast();
  const navigate                = useNavigate();
  const location                = useLocation();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState('');
  const [tab, setTab]           = useState('for-you');
  const [active, setActive]     = useState('feed');
  const [theme, setTheme]       = useState(localStorage.getItem('theme') || 'dark');
  const [reacted, setReacted]   = useState({});
  const [unread, setUnread]     = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFeed(); loadUnread(); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/')             setActive('feed');
    if (path === '/search')       setActive('search');
    if (path === '/people')       setActive('people');
    if (path === '/freelance')    setActive('freelance');
    if (path === '/collab')       setActive('collab');
    if (path === '/messages')     setActive('messages');
    if (path === '/notifications')setActive('notifications');
    if (path === '/settings')     setActive('settings');
  }, [location]);

  const loadUnread = async () => {
    try {
      const r = await getUnreadCount();
      setUnread(r.data.unread_count || 0);
    } catch {}
  };

  const load = async fn => {
    setLoading(true);
    try { return await fn(); }
    catch (e) { showToast('Failed to load feed', 'error'); }
    finally { setLoading(false); }
  };

  const loadFeed = async () => {
    const r = await load(() => getFeed());
    if (r) setItems(r.data.feed || []);
  };

  const loadTrending = async () => {
    const r = await load(() => getTrending());
    if (r) setItems(r.data.trending || []);
  };

  const handleSearch = async e => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const switchTab = t => {
    setTab(t);
    setActive(t === 'for-you' ? 'feed' : 'trending');
    t === 'for-you' ? loadFeed() : loadTrending();
  };

  const handleSidebar = (item) => {
   setActive(item.id);
   if (item.id === 'feed')     { setTab('for-you'); loadFeed(); return; }
   if (item.id === 'trending') { setTab('trending'); loadTrending(); return; }
   if (item.id === 'profile')  { navigate(`/profile/${user.id}`); return; }
   if (item.id === 'portfolio'){ navigate(`/profile/${user.id}`); return; }
   if (item.path)              { navigate(item.path); }
};

  const handleReact = async (e, itemId) => {
    e.stopPropagation();
    try {
      await reactToItem(itemId, 'fire');
      setReacted(prev => ({ ...prev, [itemId]: !prev[itemId] }));
      setItems(prev => prev.map(i =>
        i.id === itemId
          ? { ...i, reactions: reacted[itemId] ? i.reactions - 1 : i.reactions + 1 }
          : i
      ));
    } catch { showToast('Failed to react', 'error'); }
  };

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>

        <form onSubmit={handleSearch} className="topbar-search">
          <span className="topbar-search-icon">{SVG.search}</span>
          <input className="topbar-search-input"
            placeholder="Search skills, people, projects..."
            value={q} onChange={e => setQ(e.target.value)} />
          <button type="submit" className="topbar-search-btn">Go</button>
        </form>

        <div className="topbar-right">
          <button className="topbar-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVG.sun : SVG.moon}
          </button>
          <div className="topbar-avatar"
            onClick={() => navigate(`/profile/${user?.id}`)}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <nav className="sidebar">
          {SIDEBAR.map(group => (
            <div className="sidebar-group" key={group.group}>
              <div className="sidebar-group-label">{group.group}</div>
              {group.items.map(item => (
                <button key={item.id}
                  className={`sidebar-link ${active === item.id ? 'active' : ''}`}
                  onClick={() => handleSidebar(item)}>
                  <span className="sidebar-link-dot" />
                  {item.label}
                  {item.id === 'notifications' && unread > 0 && (
                    <span className="sidebar-badge">{unread}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Feed */}
        <main className="feed-main">
          <div className="feed-toprow">
            <h1 className="feed-heading">
              {tab === 'for-you' ? 'For You' : 'Trending'}
            </h1>
            <div className="tab-group">
              <button className={`tab-btn ${tab === 'for-you' ? 'active' : ''}`}
                onClick={() => switchTab('for-you')}>For You</button>
              <button className={`tab-btn ${tab === 'trending' ? 'active' : ''}`}
                onClick={() => switchTab('trending')}>Trending</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-row">
              <PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton />
            </div>
          ) : items.length === 0 ? (
            <div className="state-box">
              <h3>Nothing here yet</h3>
              <p>Add skills to your profile to personalise your feed.</p>
            </div>
          ) : items.map((item, i) => (
            <article key={item.id} className="post-card"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/post/${item.id}`)}>

              <div className="post-top">
                <div className="post-ava"
                  onClick={e => { e.stopPropagation(); navigate(`/profile/${item.user.id}`); }}>
                  {item.user.username[0].toUpperCase()}
                </div>
                <div className="post-meta">
                  <span className="post-author"
                    onClick={e => { e.stopPropagation(); navigate(`/profile/${item.user.id}`); }}>
                    {item.user.username}
                  </span>
                  <span className="post-author-cat">
                    {item.user.category || 'Independent'}
                  </span>
                </div>
                <span className="post-type-badge">{item.portfolio_type}</span>
              </div>

              <h2 className="post-title">{item.title}</h2>
              <p className="post-desc">{item.description}</p>

              {item.media?.map(m =>
                m.media_type === 'image' && m.url ? (
                  <img key={m.id} src={m.url} alt={item.title} className="post-img" />
                ) : m.media_type === 'link' && m.url ? (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer"
                    className="post-ext-link"
                    onClick={e => e.stopPropagation()}>
                    {SVG.ext} View project
                  </a>
                ) : null
              )}

              {(item.skills.length > 0 || item.tags.length > 0) && (
                <div className="post-tags">
                  {item.skills.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
                  {item.tags.map(t => <span key={t} className="tag tag-plain">{t}</span>)}
                </div>
              )}

              <div className="post-actions">
                <button className={`action-btn fire ${reacted[item.id] ? 'reacted' : ''}`}
                  onClick={e => handleReact(e, item.id)}>
                  🔥 {item.reactions}
                </button>
                <button className="action-btn"
                  onClick={e => { e.stopPropagation(); navigate(`/post/${item.id}`); }}>
                  💬 {item.comments}
                </button>
                {item.verified && <span className="verified-pill">✓ Verified</span>}
              </div>
            </article>
          ))}
        </main>

        {/* Right Panel */}
        <aside className="right-panel">
          <div className="panel-card">
            <div className="panel-card-title">Your activity</div>
            <div className="panel-stat">
              <span className="panel-stat-label">Portfolio items</span>
              <span className="panel-stat-val">—</span>
            </div>
            <div className="panel-stat">
              <span className="panel-stat-label">Work completed</span>
              <span className="panel-stat-val">—</span>
            </div>
            <div className="panel-stat">
              <span className="panel-stat-label">Rating</span>
              <span className="panel-stat-val">—</span>
            </div>
          </div>
          <button className="post-btn" onClick={() => navigate('/create-post')}>
            + Post work
          </button>
        </aside>
      </div>
    </div>
  );
}