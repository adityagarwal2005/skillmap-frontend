import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getFeed, getTrending } from '../api/feed';
import { getDiscoverPeople } from '../api/users';
import { reactToItem, createStatusPost } from '../api/portfolio';
import { PostCardSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import './FeedPage.css';

const SVGext = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

export default function FeedPage() {
  const { showToast }         = useToast();
  const navigate              = useNavigate();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab]         = useState('for-you');
  const [reacted, setReacted] = useState({});
  const [people, setPeople]   = useState([]);
  const [statusText, setStatusText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePostStatus = async e => {
    e.preventDefault();
    const text = statusText.trim();
    if (!text) return;
    try {
      setPosting(true);
      await createStatusPost(text);
      setStatusText('');
      showToast('Posted to the feed', 'success');
      if (tab === 'for-you') loadFeed(); else switchTab('for-you');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to post', 'error');
    } finally { setPosting(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFeed(); }, []);

  // People to discover — keeps the feed from ever looking empty on day one.
  useEffect(() => {
    getDiscoverPeople({ limit: 12 })
      .then(r => setPeople(r.data.results || []))
      .catch(() => {});
  }, []);

  const fetchPage = tab === 'for-you' ? getFeed : getTrending;
  const dataKey = tab === 'for-you' ? 'feed' : 'trending';

  const loadFeed = async () => {
    setLoading(true);
    try {
      const r = await getFeed();
      setItems(r.data.feed || []);
      setHasMore(!!r.data.has_more);
    } catch { showToast('Failed to load feed', 'error'); }
    finally { setLoading(false); }
  };

  const loadTrending = async () => {
    setLoading(true);
    try {
      const r = await getTrending();
      setItems(r.data.trending || []);
      setHasMore(!!r.data.has_more);
    } catch { showToast('Failed to load feed', 'error'); }
    finally { setLoading(false); }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await fetchPage({ offset: items.length });
      const next = r.data[dataKey] || [];
      setItems(prev => [...prev, ...next]);
      setHasMore(!!r.data.has_more);
    } catch { showToast('Failed to load more', 'error'); }
    finally { setLoadingMore(false); }
  };

  const switchTab = t => {
    setTab(t);
    t === 'for-you' ? loadFeed() : loadTrending();
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
    <AppShell active="home" robot>
      <div className="feed-main">
        <div className="feed-hero">
          <h1 className="feed-heading">
            <span className="feed-heading-kicker">// FEED</span>
            {tab === 'for-you' ? 'For You' : 'Trending'}
          </h1>
          <aside className="feed-promo">
            <span className="feed-promo-arrow" aria-hidden="true">↗</span>
            <div className="feed-promo-title">Stay ahead.<br />Build more.<br />Together.</div>
            <div className="feed-promo-meta">SkillMap Ecosystem</div>
          </aside>
        </div>

        <div className="tab-group">
          <button className={`tab-btn ${tab === 'for-you' ? 'active' : ''}`}
            onClick={() => switchTab('for-you')}>For You</button>
          <button className={`tab-btn ${tab === 'trending' ? 'active' : ''}`}
            onClick={() => switchTab('trending')}>Trending</button>
        </div>

        <form className="status-composer" onSubmit={handlePostStatus}>
          <input className="status-composer-input"
            placeholder="Share a quick update — looking for a teammate, a skill, anything…"
            maxLength={200}
            value={statusText}
            onChange={e => setStatusText(e.target.value)} />
          <button type="submit" className="status-composer-btn" disabled={posting || !statusText.trim()}>
            {posting ? '…' : 'Post'}
          </button>
        </form>

        {people.length > 0 && (
          <section className="discover-strip">
            <div className="discover-head">
              <h2 className="discover-title">Discover people</h2>
              <button className="discover-all" onClick={() => navigate('/people')}>See all →</button>
            </div>
            <div className="discover-row">
              {people.map(p => (
                <button key={p.id} className="discover-card"
                  onClick={() => navigate(`/profile/${p.id}`)}>
                  <div className="discover-ava">
                    {p.profile_image
                      ? <img className="ava-img" src={p.profile_image} alt="" />
                      : p.username[0].toUpperCase()}
                  </div>
                  <span className="discover-name">{p.username}</span>
                  <span className="discover-cat">{p.category || 'Independent'}</span>
                </button>
              ))}
            </div>
          </section>
        )}

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
                {item.user.profile_image
                  ? <img className="ava-img" src={item.user.profile_image} alt="" />
                  : item.user.username[0].toUpperCase()}
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
              {item.portfolio_type !== 'status' &&
                <span className="post-type-badge">{item.portfolio_type}</span>}
            </div>

            {item.portfolio_type === 'status' ? (
              <p className="post-status-text">{item.description || item.title}</p>
            ) : (
              <>
                <h2 className="post-title">{item.title}</h2>
                <p className="post-desc">{item.description}</p>
              </>
            )}

            {(() => {
              const imgs = (item.media || []).filter(m => m.media_type === 'image' && m.url);
              const links = (item.media || []).filter(m => m.media_type === 'link' && m.url);
              return (
                <>
                  {imgs.length > 0 && (
                    <div className={`post-gallery count-${Math.min(imgs.length, 4)}`}>
                      {imgs.slice(0, 4).map(m => (
                        <img key={m.id} src={m.url} alt={item.title} className="post-gallery-img" />
                      ))}
                    </div>
                  )}
                  {links.map(m => (
                    <a key={m.id} href={m.url} target="_blank" rel="noreferrer"
                      className="post-ext-link" onClick={e => e.stopPropagation()}>
                      {SVGext} View project
                    </a>
                  ))}
                </>
              );
            })()}

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

        {!loading && hasMore && (
          <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </AppShell>
  );
}
