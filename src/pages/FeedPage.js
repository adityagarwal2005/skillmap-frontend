import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getFeed } from '../api/feed';
import { respondToWorkRequest } from '../api/work';
import { applyToCollab } from '../api/collab';
import { editUser } from '../api/users';
import AppShell from '../components/AppShell';
import Lightbox from '../components/Lightbox';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { cldThumb } from '../utils/cloudinaryUrl';
import { ICONS as I, money, distance, parseTs, Bookmark, Avatar, Seats, Skills, MetaChips, GigCard, TeamCard } from '../components/ListingCard';
import { SKILL_CATEGORIES, categoriesOf, categoryById } from '../utils/skillCategories';
import usePoll from '../hooks/usePoll';
import useNow from '../hooks/useNow';
import './FeedPage.css';
import './Marketplace.css';

const RANGES = [
  { value: '0.5', label: '500 m' },
  { value: '1', label: '1 km' },
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
];
const RANGE_LABEL = Object.fromEntries(RANGES.map(r => [r.value, r.label]));

// One position fix, resolved to null on refusal or timeout rather than thrown.
function locateDevice() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: +pos.coords.latitude.toFixed(5), lon: +pos.coords.longitude.toFixed(5) }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}

// "today 6:40 pm", "tomorrow 9:00 am", "Wed 11:30 am"
function closesAt(ts) {
  const d = new Date(parseTs(ts));
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === new Date().toDateString()) return `today ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
}

export default function FeedPage() {
  const { showToast }         = useToast();
  const { user }              = useAuth();
  const navigate              = useNavigate();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [kind, setKind]       = useState('all');     // all | freelance | collab
  const [savedOnly, setSavedOnly] = useState(false);
  const [range, setRange]     = useState(() => {
    try { const v = localStorage.getItem('smRange'); return RANGE_LABEL[v] ? v : '5'; }
    catch { return '5'; }
  });
  const [query, setQuery]     = useState('');
  const [sort, setSort]       = useState('match');   // match | soon | pay | near
  const [category, setCategory] = useState('');      // SKILL_CATEGORIES id
  const [saved, setSaved]     = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('smSaved') || '[]')); }
    catch { return new Set(); }
  });
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
  const [origin, setOrigin] = useState(null);         // a fresh device fix; null → profile location
  const [originChecked, setOriginChecked] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const now = useNow(30000);

  useEffect(() => { try { localStorage.setItem('smRange', range); } catch {} }, [range]);

  // Reset the apply form each time a different opportunity is opened.
  useEffect(() => { setApplyMsg(''); setApplied(false); }, [viewItem?.kind, viewItem?.id]);

  useEffect(() => {
    if (!viewItem) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setViewItem(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewItem]);

  // Saved listings live in localStorage — a shortlist you can build while
  // browsing without committing to applying yet.
  const toggleSave = (item, e) => {
    e.stopPropagation();
    const key = `${item.kind}-${item.id}`;
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem('smSaved', JSON.stringify([...next]));
      return next;
    });
  };

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

  const toast = useRef(showToast);
  toast.current = showToast;
  const request = useRef(0);

  // Read the device on load only when the browser already allows it, so the
  // feed never opens on a permission prompt. Otherwise the server falls back
  // to the location saved on the profile.
  useEffect(() => {
    let alive = true;
    const settle = (fix) => {
      if (!alive) return;
      if (fix) setOrigin(fix);
      setOriginChecked(true);
    };
    let query = null;
    try { query = navigator.permissions?.query({ name: 'geolocation' }); } catch { query = null; }
    if (!query) settle(null);
    else query.then(s => (s.state === 'granted' ? locateDevice().then(settle) : settle(null)))
      .catch(() => settle(null));
    return () => { alive = false; };
  }, []);

  const feedParams = useMemo(
    () => (origin ? { radius: range, lat: origin.lat, lon: origin.lon } : { radius: range }),
    [range, origin],
  );

  // A new range or location refetches; `request` drops any response that
  // lands after a newer one was asked for.
  const loadFeed = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const r = await getFeed(feedParams);
      if (id !== request.current) return;
      const fresh = r.data.feed || [];
      setNeedsLocation(!!r.data.location_required);
      setItems(fresh);
      setHasMore(!!r.data.has_more);
      // Baseline of what we've seen — a full (re)load never flashes anything.
      seenIds.current = new Set(fresh.map(it => `${it.kind}-${it.id}`));
      setNewIds(new Set());
    } catch {
      if (id === request.current) toast.current('Failed to load feed', 'error');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [feedParams]);

  useEffect(() => { if (originChecked) loadFeed(); }, [originChecked, loadFeed]);

  // Quietly pick up brand-new posts and prepend/flash anything that wasn't
  // there before. usePoll pauses while the tab is hidden and catches up on
  // return, so a backgrounded app costs the API nothing. 20s rather than 5s:
  // the feed is not a chat, and this is the single most-hit endpoint.
  usePoll(async () => {
    if (!originChecked || loading || needsLocation) return;
    const id = request.current;
    try {
      const r = await getFeed(feedParams);
      if (id !== request.current) return;
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
  }, 20000);

  const handleLoadMore = async () => {
    const id = request.current;
    setLoadingMore(true);
    try {
      const r = await getFeed({ ...feedParams, offset: items.length });
      if (id !== request.current) return;
      // Posts picked up by polling shift the offsets; skip any repeats.
      setItems(prev => {
        const have = new Set(prev.map(it => `${it.kind}-${it.id}`));
        return [...prev, ...(r.data.feed || []).filter(it => !have.has(`${it.kind}-${it.id}`))];
      });
      setHasMore(!!r.data.has_more);
    } catch { showToast('Failed to load more', 'error'); }
    finally { setLoadingMore(false); }
  };

  const shareLocation = async () => {
    setLocating(true);
    const fix = await locateDevice();
    setLocating(false);
    if (!fix) {
      showToast('Location is blocked. Allow it for this site in your browser settings.', 'error');
      return;
    }
    setOrigin(fix);
    // Saved to the profile as well, so the next visit works without asking.
    if (user?.id) editUser(user.id, { latitude: fix.lat, longitude: fix.lon }).catch(() => {});
  };

  // Everything on the page — the headline, the tile counts, the skill rail —
  // describes what's inside the chosen radius, not the whole loaded feed.
  // The server already cuts to the range and to listings whose window is
  // open; this keeps the page honest between refreshes, as windows close
  // while you're looking.
  const km = parseFloat(range);
  const inRange = useMemo(
    () => items.filter(it => it.distance_km != null && it.distance_km <= km
      && parseTs(it.expires_at) > now),
    [items, km, now],
  );
  const gigs = inRange.filter(it => it.kind === 'freelance');
  const teams = inRange.filter(it => it.kind === 'collab');
  const pot = gigs.reduce((s, it) => s + (Number(it.payment_amount) || 0), 0);
  const nearest = inRange.map(it => it.distance_km).filter(d => d != null).sort((a, b) => a - b)[0];

  const catCounts = useMemo(() => {
    const counts = {};
    inRange.forEach(it => categoriesOf(it).forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
    return counts;
  }, [inRange]);
  // Busiest categories first; the sort is stable, so empty ones keep the
  // taxonomy's own order at the end.
  const rail = useMemo(
    () => [...SKILL_CATEGORIES].sort((a, b) => (catCounts[b.id] || 0) - (catCounts[a.id] || 0)),
    [catCounts],
  );

  const q = query.trim().toLowerCase();
  const shown = inRange.filter(it => {
    if (savedOnly && !saved.has(`${it.kind}-${it.id}`)) return false;
    if (kind !== 'all' && it.kind !== kind) return false;
    if (category && !categoriesOf(it).has(category)) return false;
    if (q) {
      const hay = [it.title, it.description, it.user?.username, it.user?.category, ...(it.skills || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'pay') return (Number(b.payment_amount) || 0) - (Number(a.payment_amount) || 0);
    if (sort === 'near') return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
    if (sort === 'soon') return parseTs(a.expires_at) - parseTs(b.expires_at);
    return 0; // 'match' — the server's ranking: your skills and category first
  });

  const clearAll = () => { setKind('all'); setCategory(''); setSavedOnly(false); setQuery(''); };
  const tokens = [
    kind !== 'all' && { key: 'kind', label: kind === 'freelance' ? 'Paid gigs' : 'Teams', clear: () => setKind('all') },
    category && { key: 'cat', label: categoryById(category)?.label, clear: () => setCategory('') },
    savedOnly && { key: 'saved', label: 'Saved', clear: () => setSavedOnly(false) },
  ].filter(Boolean);

  const resultsTitle = savedOnly ? 'Saved'
    : category ? categoryById(category)?.label
    : kind === 'freelance' ? 'Paid gigs'
    : kind === 'collab' ? 'Teams forming'
    : sort === 'soon' ? 'Ending soon'
    : sort === 'pay' ? 'Best paying'
    : sort === 'near' ? 'Closest to you'
    : 'Live near you';

  const renderEmpty = () => {
    if (needsLocation) return (
      <div className="mk-locate">
        <span className="mk-radar" aria-hidden="true"><i /><i />{I.pin}</span>
        <h3>Where should we look?</h3>
        <p>DoitHere only shows gigs and collabs within your range, so it needs your location. People see how far away you are, never where.</p>
        <button type="button" className="mk-apply is-gig mk-locate-btn" onClick={shareLocation} disabled={locating}>
          {locating ? 'Finding you…' : 'Use my location'}
        </button>
      </div>
    );
    const filtered = !!(q || category || kind !== 'all');
    const wider = RANGES[RANGES.findIndex(r => r.value === range) + 1];
    const widen = wider && (
      <button className="opp-cta ghost" onClick={() => setRange(wider.value)}>Widen to {wider.label}</button>
    );
    if (savedOnly && !filtered) return (
      <div className="state-box">
        <h3>Nothing saved yet</h3>
        <p>Tap the bookmark on any listing to shortlist it here while you decide.</p>
        <div className="state-box-actions">
          <button className="opp-cta" onClick={() => setSavedOnly(false)}>Browse everything</button>
        </div>
      </div>
    );
    if (filtered || savedOnly) return (
      <div className="state-box">
        <h3>Nothing matches that</h3>
        <p>
          {q ? <>No listings matching “{query}”</> : 'No listings'}
          {category && <> in <strong>{categoryById(category)?.label}</strong></>} within {RANGE_LABEL[range]}.
        </p>
        <div className="state-box-actions">
          <button className="opp-cta" onClick={clearAll}>Clear filters</button>
          {widen}
        </div>
      </div>
    );
    return (
      <div className="state-box">
        <h3>Nothing live within {RANGE_LABEL[range]}</h3>
        <p>Listings only show while their window is open. Post a gig or start a team and people nearby will see it.</p>
        <div className="state-box-actions">
          <button className="opp-cta" onClick={() => navigate('/post')}>Post a gig</button>
          {widen}
        </div>
      </div>
    );
  };

  const isGigView = viewItem?.kind === 'freelance';
  const viewNeeded = viewItem?.people_needed || 1;
  const viewFilled = viewItem?.hired_count || 0;
  const viewClosed = !!viewItem && !(parseTs(viewItem.expires_at) > now);

  return (
    <AppShell active="work">
      <div className="feed-main mk">
        <header className="mk-top">
          <label className="mk-loc">
            <span className="mk-loc-ic">{I.pin}</span>
            <span className="mk-loc-text">
              <span className="mk-loc-eyebrow">Work near you</span>
              <span className="mk-loc-value">Within {RANGE_LABEL[range]} {I.chevron}</span>
            </span>
            <select className="mk-loc-select" value={range} aria-label="Distance"
              onChange={e => setRange(e.target.value)}>
              {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <div className="mk-top-actions">
            <button type="button" className={`mk-icon-btn ${savedOnly ? 'is-on' : ''}`}
              onClick={() => setSavedOnly(v => !v)} aria-pressed={savedOnly}
              aria-label={`Saved listings (${saved.size})`}>
              <Bookmark on={savedOnly} />
              {saved.size > 0 && <span className="mk-icon-badge">{saved.size}</span>}
            </button>
            <NotificationBell />
          </div>
        </header>

        <div className="mk-lead">
          <section className="mk-hero">
            <h1 className="mk-hero-title">
              {loading ? 'Finding work near you…'
                : needsLocation ? 'See what’s around you'
                : pot > 0 ? <><span className="mk-hero-money">{money(pot)}</span> in paid gigs near you</>
                : inRange.length > 0 ? 'Work is waiting near you'
                : 'Your area is wide open'}
            </h1>
            {!loading && (
              <p className="mk-hero-sub">
                {needsLocation ? 'Share your location to see gigs and collabs in your range'
                  : inRange.length > 0
                    ? <>
                        <span className="mk-live" aria-hidden="true" />
                        <strong>{inRange.length}</strong> live within {RANGE_LABEL[range]}
                        {nearest != null && <> · closest <strong>{distance(nearest)}</strong> away</>}
                      </>
                    : 'Post the first listing around here and people nearby will see it'}
              </p>
            )}
          </section>

          <div className="mk-intents">
            <button type="button" className={`mk-intent is-gig ${kind === 'freelance' ? 'is-on' : ''}`}
              aria-pressed={kind === 'freelance'}
              onClick={() => setKind(k => (k === 'freelance' ? 'all' : 'freelance'))}>
              <span className="mk-intent-ic">{I.wallet}</span>
              <span className="mk-intent-text">
                <span className="mk-intent-name">Earn</span>
                <span className="mk-intent-sub">
                  {loading ? 'Paid gigs' : `${gigs.length} paid ${gigs.length === 1 ? 'gig' : 'gigs'}`}
                </span>
              </span>
            </button>
            <button type="button" className={`mk-intent is-team ${kind === 'collab' ? 'is-on' : ''}`}
              aria-pressed={kind === 'collab'}
              onClick={() => setKind(k => (k === 'collab' ? 'all' : 'collab'))}>
              <span className="mk-intent-ic">{I.team}</span>
              <span className="mk-intent-text">
                <span className="mk-intent-name">Team up</span>
                <span className="mk-intent-sub">
                  {loading ? 'Teams forming' : `${teams.length} ${teams.length === 1 ? 'team' : 'teams'} forming`}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="mk-section-head">
          <h2 className="mk-section-title">Browse by skill</h2>
          {category && <button type="button" className="mk-link" onClick={() => setCategory('')}>Clear</button>}
        </div>
        <div className="mk-rail">
          {rail.map(c => {
            const n = catCounts[c.id] || 0;
            const on = category === c.id;
            return (
              <button key={c.id} type="button" style={{ '--cat': c.hue }} aria-pressed={on}
                className={`mk-cat ${on ? 'is-on' : ''} ${n ? '' : 'is-empty'}`}
                onClick={() => setCategory(on ? '' : c.id)}>
                <span className="mk-cat-ic">
                  {c.icon}
                  {n > 0 && <span className="mk-cat-n">{n}</span>}
                </span>
                <span className="mk-cat-name">{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and sort stick on scroll; whatever filters are switched on
            ride along underneath, so you can always see and undo them. */}
        <div className="mk-bar">
          <div className="mk-bar-row">
            <label className="mk-search">
              <span className="mk-search-ic">{I.search}</span>
              <input className="mk-search-input" type="text" aria-label="Search listings"
                placeholder="Search gigs or skills"
                value={query} onChange={e => setQuery(e.target.value)} />
              {query && (
                <button type="button" className="mk-search-clear" onClick={() => setQuery('')}
                  aria-label="Clear search">{I.x}</button>
              )}
            </label>
            <select className="mk-sort" value={sort} aria-label="Sort" onChange={e => setSort(e.target.value)}>
              <option value="match">For you</option>
              <option value="soon">Ending soon</option>
              <option value="pay">Top pay</option>
              <option value="near">Nearest</option>
            </select>
          </div>
          {tokens.length > 0 && (
            <div className="mk-tokens">
              {tokens.map(t => (
                <button key={t.key} type="button" className="mk-token" onClick={t.clear}
                  aria-label={`Remove filter: ${t.label}`}>
                  {t.label}{I.x}
                </button>
              ))}
              {tokens.length > 1 && <button type="button" className="mk-link" onClick={clearAll}>Clear all</button>}
            </div>
          )}
        </div>

        <div className="mk-results-head">
          <h2 className="mk-section-title">{resultsTitle}</h2>
          {!loading && <span className="mk-results-n">{shown.length} live</span>}
        </div>

        {loading ? (
          <div className="mk-grid">
            {[0, 1, 2].map(n => (
              <div key={n} className="mk-skel-card" style={{ animationDelay: `${n * 90}ms` }}>
                <div className="ds-skel sk-lg" />
                <div className="ds-skel sk-md" />
                <div className="ds-skel sk-sm" />
                <div className="ds-skel sk-foot" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? renderEmpty() : (
          <div className="mk-grid">
            {shown.map((item, i) => {
              const key = `${item.kind}-${item.id}`;
              const props = {
                item,
                now,
                isNew: newIds.has(key),
                saved: saved.has(key),
                onSave: (e) => toggleSave(item, e),
                onOpen: () => setViewItem(item),
                style: { animationDelay: `${Math.min(i, 8) * 45}ms` },
              };
              return item.kind === 'freelance'
                ? <GigCard key={key} {...props} />
                : <TeamCard key={key} {...props} />;
            })}
          </div>
        )}

        {!loading && hasMore && !savedOnly && (
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
            <p className="welcome-sub">Your local talent network. Here are 3 quick ways to start:</p>

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
                <span className="welcome-step-name">Find people near you</span>
                <span className="welcome-step-desc">Look people up by username and message them</span>
              </span>
              <span className="welcome-step-arrow">→</span>
            </button>

            <button className="welcome-step" onClick={() => welcomeGo('/post')}>
              <span className="welcome-step-num">3</span>
              <span className="welcome-step-text">
                <span className="welcome-step-name">Post a gig or start a team</span>
                <span className="welcome-step-desc">Hire someone nearby, or find people to build with</span>
              </span>
              <span className="welcome-step-arrow">→</span>
            </button>

            <button className="welcome-skip" onClick={dismissWelcome}>Maybe later</button>
          </div>
        </div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {viewItem && (
        <div className="mk-sheet-overlay" onClick={() => setViewItem(null)}>
          <div className={`mk-sheet ${isGigView ? 'is-gig' : 'is-team'}`} role="dialog" aria-modal="true"
            aria-labelledby="mk-sheet-title" onClick={e => e.stopPropagation()}>
            <button type="button" className="mk-sheet-x" onClick={() => setViewItem(null)}
              aria-label="Close">{I.x}</button>

            {isGigView ? (
              <div className="mk-sheet-hero">
                <span className="mk-kind is-gig">Paid gig</span>
                <span className="mk-sheet-payout">{money(viewItem.payment_amount)}</span>
                <span className="mk-eyebrow">Payout</span>
              </div>
            ) : (
              <div className="mk-sheet-hero">
                <span className="mk-kind is-team">Team forming</span>
                <Seats host={viewItem.user} needed={viewNeeded} filled={viewFilled} />
                <span className="mk-eyebrow">
                  {Math.max(0, viewNeeded - viewFilled)} of {viewNeeded} {viewNeeded === 1 ? 'seat' : 'seats'} open
                </span>
              </div>
            )}

            <div className="mk-sheet-meta">
              <MetaChips item={viewItem} now={now} />
              {viewItem.expires_at && <span className="mk-chip">Closes {closesAt(viewItem.expires_at)}</span>}
              {isGigView && viewNeeded > 1 && (
                <span className="mk-chip">
                  Hiring {viewNeeded} · {Math.max(0, viewNeeded - viewFilled)} left
                </span>
              )}
              {isGigView && viewItem.gender_preference && viewItem.gender_preference !== 'any' && (
                <span className="mk-chip">
                  {viewItem.gender_preference === 'male' ? 'Male applicants only' : 'Female applicants only'}
                </span>
              )}
            </div>

            <h2 id="mk-sheet-title" className="mk-sheet-title">
              {isGigView ? (viewItem.description || viewItem.title) : viewItem.title}
            </h2>
            {!isGigView && viewItem.description && viewItem.description !== viewItem.title && (
              <p className="mk-sheet-desc">{viewItem.description}</p>
            )}

            {viewItem.media && (
              <div className="mk-sheet-media">
                {viewItem.media_type === 'video'
                  ? <video src={viewItem.media} controls playsInline />
                  : <img src={cldThumb(viewItem.media)} alt=""
                      onClick={() => setLightboxSrc(viewItem.media)} />}
              </div>
            )}

            <Skills skills={viewItem.skills} limit={12} />

            <button type="button" className="mk-sheet-poster"
              onClick={() => { setViewItem(null); navigate(`/profile/${viewItem.user.id}`); }}>
              <Avatar user={viewItem.user} className="is-lg" />
              <span className="mk-poster-text">
                <span className="mk-poster-sub">{isGigView ? 'Posted by' : 'Hosted by'}</span>
                <span className="mk-poster-name">{viewItem.user.username}</span>
                <span className="mk-poster-sub">{viewItem.user.category || 'Independent'}</span>
              </span>
              <span className="mk-sheet-poster-go">{I.arrow}</span>
            </button>

            {applied ? (
              <div className="mk-applied">
                <span className="mk-applied-ic">{I.check}</span>
                <span className="mk-applied-text">
                  <strong>Application sent</strong>
                  <span>Track where it stands anytime.</span>
                </span>
                <button type="button" className="mk-link" onClick={() => navigate('/applications')}>
                  Track →
                </button>
              </div>
            ) : (
              <>
                <label className="mk-field-label" htmlFor="mk-pitch">
                  Your pitch <span>optional</span>
                </label>
                <textarea id="mk-pitch" className="mk-pitch" rows={3}
                  placeholder={isGigView ? 'Why are you the right person for this?' : 'What would you bring to the team?'}
                  value={applyMsg} onChange={e => setApplyMsg(e.target.value)} />
                <button type="button" className={`mk-apply ${isGigView ? 'is-gig' : 'is-team'}`}
                  onClick={handleApply} disabled={applying || viewClosed}>
                  {viewClosed ? 'This listing has closed'
                    : applying ? 'Sending…' : isGigView ? `Apply · ${money(viewItem.payment_amount)}` : 'Apply to collab'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
