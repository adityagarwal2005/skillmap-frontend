import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getFeed, getTrending } from '../api/feed';
import { reactToItem } from '../api/portfolio';
import { PostCardSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import './FeedPage.css';

const SVGext = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

export default function FeedPage() {
  const { showToast }         = useToast();
  const navigate              = useNavigate();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('for-you');
  const [reacted, setReacted] = useState({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFeed(); }, []);

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
                  {SVGext} View project
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
      </div>
    </AppShell>
  );
}
