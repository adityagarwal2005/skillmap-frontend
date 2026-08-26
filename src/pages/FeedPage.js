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
  const [workFilter, setWorkFilter] = useState('all');
  const [range, setRange]     = useState('5'); // 0.5 | 1 | 2 | 5 | 10 (km)
  const [people, setPeople]   = useState([]);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('smWelcomeSeen') !== '1'
  );
  const [newIds, setNewIds] = useState(new Set());
  const [viewItem, setViewItem] = useState(null);
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
    <AppShell active="work" robot>
      <div className="feed-main">
        <div className="work-head">
          <h1 className="feed-heading work-heading">Work</h1>
          <label className="range-pill">
            <span className="range-dot" />
            <span className="range-cap">Near me</span>
            <select className="range-select" value={range} onChange={e => setRange(e.target.value)}>
              <option value="0.5">500 m</option>
              <option value="1">1 km</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
            </select>
          </label>
        </div>

        <div className="work-filter">
          {['all', 'freelance', 'collab'].map(f => (
            <button key={f}
              className={`work-filter-chip ${workFilter === f ? 'active' : ''}`}
              onClick={() => setWorkFilter(f)}>
              {f === 'all' ? 'All' : f === 'freelance' ? 'Freelance' : 'Collab'}
            </button>
          ))}
        </div>

        {(() => {
          const shown = items.filter(it =>
            (workFilter === 'all' || it.kind === workFilter) &&
            (it.distance_km == null || it.distance_km <= parseFloat(range))
          );
          if (loading) return (
            <div className="loading-row">
              <PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton />
            </div>
          );
          if (shown.length === 0) return (
          <div className="state-box">
            <h3>Nothing here yet</h3>
            <p>Post a freelance job or start a collab — or check back soon.</p>
            <div className="state-box-actions">
              <button className="opp-cta" onClick={() => navigate('/freelance?new=1')}>Post a job</button>
              <button className="opp-cta ghost" onClick={() => navigate('/collab?new=1')}>Start a collab</button>
            </div>
          </div>
          );
          return (
            <div className="work-grid">
              {shown.map((item, i) => {
                const isNew = newIds.has(`${item.kind}-${item.id}`);
                const applied = item.kind === 'freelance' ? item.responses_count : item.applicants;
                const near = item.distance_km != null && item.distance_km <= 2;
                return (
                  <button key={`${item.kind}-${item.id}`}
                    className={`work-card ${item.kind} ${isNew ? 'is-new' : ''}`}
                    style={{ animationDelay: `${i * 45}ms` }}
                    onClick={() => setViewItem(item)}>
                    <div className="work-card-head">
                      <span className={`work-kind-tag ${item.kind}`}>
                        <span className="work-kind-dot" />
                        {item.kind === 'freelance' ? 'Freelance' : 'Collab'}
                      </span>
                      {item.kind === 'freelance' && <span className="work-price">₹{item.payment_amount}</span>}
                    </div>

                    <h2 className="work-card-title">{item.title}</h2>

                    {item.skills?.length > 0 && (
                      <div className="work-tags">
                        {item.skills.slice(0, 3).map(s => <span key={s} className="work-tag">{s}</span>)}
                        {item.skills.length > 3 && <span className="work-tag more">+{item.skills.length - 3}</span>}
                      </div>
                    )}

                    <div className="work-card-foot">
                      <span className="work-poster">
                        <span className="work-ava">
                          {item.user.profile_image
                            ? <img className="ava-img" src={cldAvatar(item.user.profile_image)} alt="" />
                            : item.user.username[0].toUpperCase()}
                        </span>
                        <span className="work-poster-name">{item.user.username}</span>
                      </span>
                      <span className="work-meta">
                        {item.distance_km != null && (
                          <span className={`work-dist ${near ? 'is-near' : ''}`}>
                            <span className="work-dot" />{item.distance_km} km
                          </span>
                        )}
                        {item.kind === 'freelance' && item.gender_preference && item.gender_preference !== 'any' && (
                          <span className="work-metaitem">{item.gender_preference === 'male' ? 'Male' : 'Female'}</span>
                        )}
                        {applied > 0 && <span className="work-metaitem">{applied} applied</span>}
                        {item.kind === 'freelance' && timeLeft(item.expires_at) &&
                          <span className="work-metaitem">{timeLeft(item.expires_at)}</span>}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {!loading && hasMore && workFilter === 'all' && (
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

      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="post-top" style={{ marginBottom: 14 }}>
              <div className="post-ava"
                onClick={() => { setViewItem(null); navigate(`/profile/${viewItem.user.id}`); }}>
                {viewItem.user.profile_image
                  ? <img className="ava-img" src={cldAvatar(viewItem.user.profile_image)} alt="" />
                  : viewItem.user.username[0].toUpperCase()}
              </div>
              <div className="post-meta">
                <span className="post-author"
                  onClick={() => { setViewItem(null); navigate(`/profile/${viewItem.user.id}`); }}>
                  {viewItem.user.username}
                </span>
                <span className="post-author-cat">{viewItem.user.category || 'Independent'}</span>
              </div>
              <span className={`opp-kind ${viewItem.kind}`}>
                {viewItem.kind === 'freelance' ? 'Freelance' : 'Collab'}
              </span>
            </div>

            <h2 className="modal-title" style={{ marginBottom: 8 }}>{viewItem.title}</h2>

            {viewItem.description && viewItem.description !== viewItem.title && (
              <p className="wr-desc" style={{ marginBottom: 14 }}>{viewItem.description}</p>
            )}

            {viewItem.media && (
              <div className="post-media" style={{ marginBottom: 14 }}>
                {viewItem.media_type === 'video'
                  ? <video className="post-media-el" src={viewItem.media} controls playsInline />
                  : <img className="post-media-el" src={cldThumb(viewItem.media)} alt=""
                      onClick={() => setLightboxSrc(viewItem.media)} />}
              </div>
            )}

            {viewItem.skills?.length > 0 && (
              <div className="post-tags" style={{ marginBottom: 14 }}>
                {viewItem.skills.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
            )}

            <div className="opp-meta" style={{ marginBottom: 18 }}>
              {viewItem.kind === 'freelance' ? (
                <>
                  <span className="opp-pay">₹{viewItem.payment_amount}</span>
                  {timeLeft(viewItem.expires_at) && <span className="opp-sub">{timeLeft(viewItem.expires_at)}</span>}
                  {viewItem.responses_count > 0 && <span className="opp-heat">{viewItem.responses_count} applied</span>}
                </>
              ) : (
                viewItem.applicants > 0 && <span className="opp-heat">{viewItem.applicants} people joined</span>
              )}
              {viewItem.distance_km != null && <span className="opp-sub">📍 {viewItem.distance_km} km away</span>}
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={() => setViewItem(null)}>Close</button>
              <button type="button" className="modal-submit"
                onClick={() => navigate(viewItem.kind === 'freelance' ? '/freelance' : '/collab')}>
                {viewItem.kind === 'freelance' ? 'Apply on Freelance board' : 'Apply on Collab board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
