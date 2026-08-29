import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getFeed } from '../api/feed';
import { respondToWorkRequest } from '../api/work';
import { applyToCollab } from '../api/collab';
import { PostCardSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import Lightbox from '../components/Lightbox';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
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
  const [workFilter, setWorkFilter] = useState('all');
  const [range, setRange]     = useState('5'); // 0.5 | 1 | 2 | 5 | 10 (km)
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('smWelcomeSeen') !== '1'
  );
  const [newIds, setNewIds] = useState(new Set());
  const [viewItem, setViewItem] = useState(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied]   = useState(false);
  const seenIds = useRef(new Set());
  const pollRef = useRef(null);

  // Reset the apply form each time a different opportunity is opened.
  useEffect(() => { setApplyMsg(''); setApplied(false); }, [viewItem?.kind, viewItem?.id]);

  const handleApply = async () => {
    if (!viewItem) return;
    try {
      setApplying(true);
      if (viewItem.kind === 'freelance') {
        await respondToWorkRequest(viewItem.id, 'accepted', applyMsg);
      } else {
        await applyToCollab(viewItem.id, applyMsg);
      }
      setApplied(true);
      showToast('Application sent!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not apply', 'error');
    } finally {
      setApplying(false);
    }
  };

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

  // Quietly poll for brand-new posts (freelance + collab) and prepend/flash
  // anything that wasn't there before. No WebSocket, no manual-refresh
  // requirement, no infra change.
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await getFeed({ offset: items.length });
      setItems(prev => [...prev, ...(r.data.feed || [])]);
      setHasMore(!!r.data.has_more);
    } catch { showToast('Failed to load more', 'error'); }
    finally { setLoadingMore(false); }
  };

  return (
    <AppShell active="work" robot>
      <div className="feed-main">
        <div className="work-head">
          <div className="page-title-row">
            <h1 className="feed-heading work-heading">Work</h1>
            <NotificationBell />
          </div>
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

        {/* Live market pulse — makes the page read as an active marketplace
            rather than a static list. All derived from what's already loaded. */}
        {!loading && items.length > 0 && (() => {
          const paid = items.filter(it => it.kind === 'freelance');
          const pot  = paid.reduce((s, it) => s + (Number(it.payment_amount) || 0), 0);
          const near = items
            .map(it => it.distance_km)
            .filter(d => d != null)
            .sort((a, b) => a - b)[0];
          return (
            <div className="market-pulse">
              <div className="mp-stat">
                <span className="mp-val"><span className="ds-live" />{items.length}</span>
                <span className="mp-label">Open now</span>
              </div>
              <div className="mp-stat">
                <span className="mp-val is-money">₹{pot.toLocaleString('en-IN')}</span>
                <span className="mp-label">On the table</span>
              </div>
              <div className="mp-stat">
                <span className="mp-val">{near != null ? `${near} km` : '—'}</span>
                <span className="mp-label">Nearest</span>
              </div>
            </div>
          );
        })()}

        <div className="work-filter">
          {['all', 'freelance', 'collab'].map(f => (
            <button key={f}
              className={`work-filter-chip ${workFilter === f ? 'active' : ''}`}
              onClick={() => setWorkFilter(f)}>
              {f === 'all' ? 'All work' : f === 'freelance' ? 'Paid gigs' : 'Collabs'}
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
              <button className="opp-cta" onClick={() => navigate('/post')}>Post a job</button>
              <button className="opp-cta ghost" onClick={() => navigate('/post')}>Start a collab</button>
            </div>
          </div>
          );
          return (
            <div className="work-grid">
              {shown.map((item, i) => {
                const isNew = newIds.has(`${item.kind}-${item.id}`);
                const appliedCount = item.kind === 'freelance' ? item.responses_count : item.applicants;
                const near = item.distance_km != null && item.distance_km <= 2;
                const left = timeLeft(item.expires_at);
                const urgent = left && (left.endsWith('h left') || left === 'Expired');
                const desc = item.description && item.description !== item.title ? item.description : null;
                return (
                  <article key={`${item.kind}-${item.id}`}
                    className={`work-card ${item.kind} ${isNew ? 'is-new' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    tabIndex={0} role="button"
                    onClick={() => setViewItem(item)}
                    onKeyDown={e => { if (e.key === 'Enter') setViewItem(item); }}>

                    <div className="wc-top">
                      <span className={`wc-kind ${item.kind}`}>
                        {item.kind === 'freelance' ? 'Paid gig' : 'Collab'}
                      </span>
                      {isNew && <span className="wc-new">New</span>}
                      {left && (
                        <span className={`wc-left ${urgent ? 'is-urgent' : ''}`}>{left}</span>
                      )}
                    </div>

                    <h2 className="wc-title">{item.title}</h2>
                    {desc && <p className="wc-desc">{desc}</p>}

                    {item.skills?.length > 0 && (
                      <div className="wc-skills">
                        {item.skills.slice(0, 4).map(s => <span key={s} className="wc-skill">{s}</span>)}
                        {item.skills.length > 4 && <span className="wc-skill more">+{item.skills.length - 4}</span>}
                      </div>
                    )}

                    <div className="wc-deal">
                      <div className="wc-budget">
                        <span className="wc-budget-label">
                          {item.kind === 'freelance' ? 'Budget' : 'Looking for'}
                        </span>
                        <span className="wc-budget-val">
                          {item.kind === 'freelance' ? `₹${item.payment_amount}` : 'Teammates'}
                        </span>
                      </div>
                      <span className="wc-cta">
                        {item.kind === 'freelance' ? 'Apply' : 'Join'} <span className="wc-cta-arrow">→</span>
                      </span>
                    </div>

                    <div className="wc-foot">
                      <span className="wc-poster">
                        <span className="wc-ava">
                          {item.user.profile_image
                            ? <img className="ava-img" src={cldAvatar(item.user.profile_image)} alt="" />
                            : item.user.username[0].toUpperCase()}
                        </span>
                        <span className="wc-poster-text">
                          <span className="wc-poster-name">{item.user.username}</span>
                          <span className="wc-poster-cat">{item.user.category || 'Independent'}</span>
                        </span>
                      </span>

                      <span className="wc-signals">
                        {item.distance_km != null && (
                          <span className={`wc-dist ${near ? 'is-near' : ''}`}>
                            <span className="wc-dot" />{item.distance_km} km
                          </span>
                        )}
                        {appliedCount > 0 && (
                          <span className="wc-applied">{appliedCount} applied</span>
                        )}
                        {item.kind === 'freelance' && item.gender_preference && item.gender_preference !== 'any' && (
                          <span className="wc-pref">{item.gender_preference === 'male' ? 'Male only' : 'Female only'}</span>
                        )}
                      </span>
                    </div>
                  </article>
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
            <Logo size={2.2} className="welcome-badge-logo" />
            <h2 className="welcome-title">Welcome 👋</h2>
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

            {/* Applying happens right here — the separate Freelance/Collab
                board pages the old flow linked out to are gone. */}
            {applied ? (
              <p className="apply-done">✓ Applied — you'll hear back in Messages.</p>
            ) : (
              <div className="modal-field">
                <label className="modal-label">
                  Message <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>optional</span>
                </label>
                <textarea className="modal-textarea" rows={2}
                  placeholder="Why are you a good fit?"
                  value={applyMsg} onChange={e => setApplyMsg(e.target.value)} />
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={() => setViewItem(null)}>Close</button>
              {!applied && (
                <button type="button" className="modal-submit"
                  onClick={handleApply} disabled={applying}>
                  {applying ? 'Applying…' : viewItem.kind === 'freelance' ? 'Apply for job' : 'Join collab'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
