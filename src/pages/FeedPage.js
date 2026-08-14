import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getFeed, getTrending } from '../api/feed';
import { getDiscoverPeople } from '../api/users';
import { PostCardSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import Lightbox from '../components/Lightbox';
import { cldAvatar, cldThumb } from '../utils/cloudinaryUrl';
import './FeedPage.css';

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export default function FeedPage() {
  const { showToast }         = useToast();
  const { user }              = useAuth();
  const navigate              = useNavigate();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab]         = useState('for-you');
  const [people, setPeople]   = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('smWelcomeSeen') !== '1'
  );
  const [newIds, setNewIds] = useState(new Set());
  const seenIds = useRef(new Set());
  const pollRef = useRef(null);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('smWelcomeSeen', '1');
    // Let AppShell know it can show the "complete your profile" nudge now —
    // both were popping up stacked on top of each other on first login.
    window.dispatchEvent(new Event('sm:welcome-dismissed'));
  };
  const welcomeGo = (path) => { dismissWelcome(); navigate(path); };

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
      const fresh = r.data.feed || [];
      setItems(fresh);
      setHasMore(!!r.data.has_more);
      // Baseline of what we've seen — a full (re)load never flashes anything.
      seenIds.current = new Set(fresh.map(it => `${it.kind}-${it.id}`));
      setNewIds(new Set());
    } catch { showToast('Failed to load feed', 'error'); }
    finally { setLoading(false); }
  };

  // Quietly poll for brand-new posts (freelance + collab) while on the For
  // You tab, and prepend/flash anything that wasn't there before — same
  // approach as the Freelance job board's live poll. No WebSocket, no
  // manual-refresh requirement, no infra change.
  useEffect(() => {
    if (tab !== 'for-you') return undefined;
    const poll = async () => {
      try {
        const r = await getFeed();
        const fresh = r.data.feed || [];
        const arrived = fresh.filter(it => !seenIds.current.has(`${it.kind}-${it.id}`));
        if (arrived.length) {
          arrived.forEach(it => seenIds.current.add(`${it.kind}-${it.id}`));
          setItems(prev => [...arrived, ...prev]);
          setNewIds(prev => {
            const n = new Set(prev);
            arrived.forEach(it => n.add(`${it.kind}-${it.id}`));
            return n;
          });
          showToast(`${arrived.length} new post${arrived.length > 1 ? 's' : ''}`, 'success');
        }
      } catch { /* silent — polling shouldn't nag */ }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [tab]);

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
            <div className="feed-promo-meta">DoitHere Ecosystem</div>
          </aside>
        </div>

        <div className="tab-group">
          <button className={`tab-btn ${tab === 'for-you' ? 'active' : ''}`}
            onClick={() => switchTab('for-you')}>For You</button>
          <button className={`tab-btn ${tab === 'trending' ? 'active' : ''}`}
            onClick={() => switchTab('trending')}>Trending</button>
        </div>

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
                      ? <img className="ava-img" src={cldAvatar(p.profile_image)} alt="" />
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
            <h3>No open opportunities yet</h3>
            <p>Post a freelance job or start a collab — or check back soon.</p>
            <div className="state-box-actions">
              <button className="opp-cta" onClick={() => navigate('/freelance?new=1')}>Post a job</button>
              <button className="opp-cta ghost" onClick={() => navigate('/collab?new=1')}>Start a collab</button>
            </div>
          </div>
        ) : items.map((item, i) => {
          const to = item.kind === 'freelance' ? '/freelance' : '/collab';
          const isNew = newIds.has(`${item.kind}-${item.id}`);
          return (
            <article key={`${item.kind}-${item.id}`} className={`opp-card ${item.kind} ${isNew ? 'is-new' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(to)}>

              <div className="post-top">
                <div className="post-ava"
                  onClick={e => { e.stopPropagation(); navigate(`/profile/${item.user.id}`); }}>
                  {item.user.profile_image
                    ? <img className="ava-img" src={cldAvatar(item.user.profile_image)} alt="" />
                    : item.user.username[0].toUpperCase()}
                </div>
                <div className="post-meta">
                  <span className="post-author"
                    onClick={e => { e.stopPropagation(); navigate(`/profile/${item.user.id}`); }}>
                    {item.user.username}
                  </span>
                  <span className="post-author-cat">{item.user.category || 'Independent'}</span>
                </div>
                <span className={`opp-kind ${item.kind}`}>
                  {item.kind === 'freelance' ? 'Freelance' : 'Collab'}
                </span>
              </div>

              <h2 className="opp-title">{item.title}</h2>
              {item.kind === 'collab' && item.description && item.description !== item.title && (
                <p className="opp-desc">{item.description}</p>
              )}

              {item.media && (
                <div className="post-media">
                  {item.media_type === 'video'
                    ? <video className="post-media-el" src={item.media} controls playsInline
                        onClick={e => e.stopPropagation()} />
                    : <img className="post-media-el" src={cldThumb(item.media)} alt=""
                        onClick={e => { e.stopPropagation(); setLightboxSrc(item.media); }} />}
                </div>
              )}

              {item.skills?.length > 0 && (
                <div className="post-tags">
                  {item.skills.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
                </div>
              )}

              <div className="opp-footer">
                <div className="opp-meta">
                  {item.kind === 'freelance' ? (
                    <>
                      <span className="opp-pay">₹{item.payment_amount}</span>
                      {timeLeft(item.expires_at) && <span className="opp-sub">{timeLeft(item.expires_at)}</span>}
                      {item.responses_count > 0 && <span className="opp-heat">🔥 {item.responses_count} applied</span>}
                    </>
                  ) : (
                    <>
                      {item.applicants > 0 && <span className="opp-heat">🔥 {item.applicants} applied</span>}
                    </>
                  )}
                  {item.distance_km != null && <span className="opp-sub">📍 {item.distance_km} km</span>}
                </div>
                <button className="opp-cta" onClick={e => { e.stopPropagation(); navigate(to); }}>
                  {item.kind === 'freelance' ? 'View job' : 'View collab'}
                </button>
              </div>
            </article>
          );
        })}

        {!loading && hasMore && (
          <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {showWelcome && (
        <div className="welcome-overlay" onClick={dismissWelcome}>
          <div className="welcome-card" onClick={e => e.stopPropagation()}>
            <img className="welcome-badge" src="/icon-192.png" alt="" />
            <h2 className="welcome-title">Welcome to DoitHere 👋</h2>
            <p className="welcome-sub">Your campus talent network. Here are 3 quick ways to start:</p>

            <button className="welcome-step" onClick={() => welcomeGo(`/profile/${user?.id}/edit`)}>
              <span className="welcome-step-num">1</span>
              <span className="welcome-step-text">
                <span className="welcome-step-name">Complete your profile</span>
                <span className="welcome-step-desc">Add a category, skills, and a photo so people can find you</span>
              </span>
              <span className="welcome-step-arrow">→</span>
            </button>

            <button className="welcome-step" onClick={() => welcomeGo('/people')}>
              <span className="welcome-step-num">2</span>
              <span className="welcome-step-text">
                <span className="welcome-step-name">Find people on campus</span>
                <span className="welcome-step-desc">Search by name or skill, and message anyone</span>
              </span>
              <span className="welcome-step-arrow">→</span>
            </button>

            <button className="welcome-step" onClick={dismissWelcome}>
              <span className="welcome-step-num">3</span>
              <span className="welcome-step-text">
                <span className="welcome-step-name">Post an update</span>
                <span className="welcome-step-desc">Share what you're working on or looking for</span>
              </span>
              <span className="welcome-step-arrow">→</span>
            </button>

            <button className="welcome-skip" onClick={dismissWelcome}>Maybe later</button>
          </div>
        </div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </AppShell>
  );
}
