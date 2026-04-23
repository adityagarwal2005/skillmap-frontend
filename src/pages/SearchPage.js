import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { searchFeed } from '../api/feed';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './SearchPage.css';

const TYPES = ['all', 'project', 'design', 'photo', 'baked_good', 'artwork', 'video'];
const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const SVGsearch = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

export default function SearchPage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();

  const [q, setQ]           = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [theme, setTheme]   = useState(localStorage.getItem('theme') || 'light');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) { setQ(query); runSearch(query, 'all'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (query, type) => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const params = { q: query };
      if (type && type !== 'all') params.type = type;
      const res = await searchFeed(params);
      setResults(res.data.results || []);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    runSearch(q, typeFilter);
  };

  const handleTypeFilter = t => {
    setTypeFilter(t);
    if (q.trim()) runSearch(q, t);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <form onSubmit={handleSearch} className="topbar-search">
          <span className="topbar-search-icon">{SVGsearch}</span>
          <input className="topbar-search-input"
            placeholder="Search skills, people, projects..."
            value={q} onChange={e => setQ(e.target.value)} />
          <button type="submit" className="topbar-search-btn">Go</button>
        </form>
        <div className="topbar-right">
          <button className="topbar-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="search-wrapper">
        <div className="search-header">
          <h1 className="search-heading">
            {searched ? `${results.length} results${q ? ` for "${q}"` : ''}` : 'Search'}
          </h1>
          <div className="type-filters">
            {TYPES.map(t => (
              <button key={t}
                className={`type-filter-btn ${typeFilter === t ? 'active' : ''}`}
                onClick={() => handleTypeFilter(t)}>
                {t === 'all' ? 'All' : t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-row">
            <PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton />
          </div>
        ) : !searched ? (
          <div className="state-box">
            <h3>Start searching</h3>
            <p>Search for skills, projects, people and more</p>
          </div>
        ) : results.length === 0 ? (
          <div className="state-box">
            <h3>No results found</h3>
            <p>Try different keywords or remove filters</p>
          </div>
        ) : results.map((item, i) => (
          <article key={item.id} className="post-card"
            style={{ animationDelay: `${i * 30}ms` }}
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
                <span className="post-author-cat">{item.user.category || 'Independent'}</span>
              </div>
              <span className="post-type-badge">{item.portfolio_type}</span>
            </div>
            <h2 className="post-title">{item.title}</h2>
            <p className="post-desc">{item.description}</p>
            {(item.skills?.length > 0 || item.tags?.length > 0) && (
              <div className="post-tags">
                {item.skills?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
                {item.tags?.map(t => <span key={t} className="tag tag-plain">{t}</span>)}
              </div>
            )}
            <div className="post-actions">
              <button className="action-btn fire" onClick={e => e.stopPropagation()}>🔥 {item.reactions}</button>
              <button className="action-btn" onClick={e => e.stopPropagation()}>💬 {item.comments}</button>
              {item.verified && <span className="verified-pill">✓ Verified</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}