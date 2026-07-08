import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { searchFeed } from '../api/feed';
import { PostCardSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './SearchPage.css';

const TYPES = ['all', 'project', 'design', 'photo', 'baked_good', 'artwork', 'video'];

export default function SearchPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();

  const [q, setQ]           = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searched, setSearched] = useState(false);

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
      // "@username" is just a friendly way to search by person — strip the @
      const params = { q: query.trim().replace(/^@+/, '') };
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
    <AppShell active="search"
      searchValue={q}
      onSearchChange={setQ}
      onSearchSubmit={handleSearch}>
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
          <p className="search-hint">
            Tip: search <strong>@username</strong> to find a specific person
          </p>
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
    </AppShell>
  );
}