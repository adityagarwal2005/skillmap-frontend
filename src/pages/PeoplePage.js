import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  searchUsers, discoverUsers,
  getFriendRequests, respondFriendRequest, sendFriendRequest,
} from '../api/users';
import AppShell from '../components/AppShell';
import { cldAvatar } from '../utils/cloudinaryUrl';
import { categoryByBackendName } from '../utils/skillCategories';
import './PeoplePage.css';

const AVAILABILITY = {
  open_to_freelance: { label: 'Taking gigs',  tone: 'gig' },
  open_to_work:      { label: 'Open to work', tone: 'work' },
};

function Ava({ person }) {
  return (
    <span className="pp-ava">
      {person.profile_image
        ? <img className="ava-img" src={cldAvatar(person.profile_image)} alt="" />
        : (person.username?.[0] || '?').toUpperCase()}
    </span>
  );
}

function PersonCard({ person, action, onOpen, style }) {
  const meta  = person.category ? categoryByBackendName(person.category) : null;
  const avail = AVAILABILITY[person.status];
  const rating = Number(person.rating) || 0;
  return (
    <article className="pp-card" style={style} role="link" tabIndex={0}
      aria-label={`${person.username}'s profile`}
      onClick={onOpen}
      onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') onOpen(); }}>
      <div className="pp-card-top">
        <Ava person={person} />
        <div className="pp-id">
          <span className="pp-name">{person.username}</span>
          <span className="pp-cat" style={meta ? { '--hue': meta.hue } : undefined}>
            {meta && <span className="pp-cat-icon">{meta.icon}</span>}
            {meta?.label || person.category || 'Independent'}
          </span>
        </div>
        {rating > 0 && <span className="pp-rating">★ {rating.toFixed(1)}</span>}
      </div>
      {person.headline && <p className="pp-headline">{person.headline}</p>}
      {person.skills?.length > 0 && (
        <div className="pp-skills">
          {person.skills.slice(0, 4).map(s => <span key={s} className="pp-skill">{s}</span>)}
        </div>
      )}
      <div className="pp-card-foot">
        {avail
          ? <span className={`pp-avail is-${avail.tone}`}><i aria-hidden="true" />{avail.label}</span>
          : <span className="pp-avail is-off">Not taking work</span>}
        {action || <span className="pp-view" aria-hidden="true">View →</span>}
      </div>
    </article>
  );
}

const Skeletons = ({ n }) => Array.from({ length: n }, (_, i) => <div key={i} className="pp-card is-loading" />);

export default function PeoplePage() {
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState([]);
  const [searchedFor, setSearchedFor] = useState('');   // the query `results` belong to
  const [searching, setSearching]     = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fresh, setFresh]             = useState(null); // null while loading
  const [friendReqs, setFriendReqs]   = useState([]);
  const [cardStatus, setCardStatus]   = useState({});   // per-person friendship override
  const [friendBusyId, setFriendBusyId] = useState(null);

  // showToast may not be referentially stable; reading it through a ref keeps
  // the search-as-you-type effect from re-firing on every render.
  const toast = useRef(showToast);
  toast.current = showToast;
  const latest = useRef(0);

  useEffect(() => {
    getFriendRequests().then(r => setFriendReqs(r.data.requests || [])).catch(() => {});
    discoverUsers({ limit: 12 }).then(r => setFresh(r.data.results || [])).catch(() => setFresh([]));
  }, []);

  const runSearch = useCallback(async (q) => {
    const id = ++latest.current;
    setSearching(true);
    try {
      const res = await searchUsers({ q });
      if (id !== latest.current) return;   // a newer search superseded this one
      setResults(res.data.results || []);
      setHasMore(!!res.data.has_more);
      setSearchedFor(q);
    } catch {
      if (id === latest.current) toast.current('Search failed', 'error');
    } finally {
      if (id === latest.current) setSearching(false);
    }
  }, []);

  // Search as you type once there are two characters to go on; Enter
  // searches a single character too.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      latest.current++;
      setSearching(false);
      setSearchedFor('');
      return undefined;
    }
    const t = setTimeout(() => runSearch(q), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) runSearch(q);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await searchUsers({ q: searchedFor, offset: results.length });
      setResults(prev => [...prev, ...(res.data.results || [])]);
      setHasMore(!!res.data.has_more);
    } catch {
      showToast('Failed to load more', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const statusOf = (person) => cardStatus[person.id] || person.friendship_status || 'none';

  const handleAddFriend = async (e, person) => {
    e.stopPropagation();
    try {
      setFriendBusyId(person.id);
      const r = await sendFriendRequest(person.id);
      setCardStatus(s => ({ ...s, [person.id]: r.data.status }));
      showToast(r.data.message || 'Friend request sent', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not send request', 'error');
    } finally { setFriendBusyId(null); }
  };

  const handleRespondReq = async (person, action) => {
    try {
      setFriendBusyId(person.id);
      await respondFriendRequest(person.id, action);
      setFriendReqs(prev => prev.filter(r => r.id !== person.id));
      setCardStatus(s => ({ ...s, [person.id]: action === 'accept' ? 'friends' : 'none' }));
      showToast(
        action === 'accept' ? `You and ${person.username} are now friends` : 'Request declined',
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.error || 'Something went wrong', 'error');
    } finally { setFriendBusyId(null); }
  };

  // Search results carry friendship state; the "new" list doesn't, so those
  // cards just open the profile rather than guess.
  const friendAction = (person) => {
    const st = statusOf(person);
    const busy = friendBusyId === person.id;
    if (st === 'friends')      return <span className="pp-btn is-quiet">✓ Friends</span>;
    if (st === 'request_sent') return <span className="pp-btn is-quiet">Requested</span>;
    if (st === 'request_received') {
      return (
        <button type="button" className="pp-btn is-accept" disabled={busy}
          onClick={e => { e.stopPropagation(); handleRespondReq(person, 'accept'); }}>
          {busy ? '…' : 'Accept'}
        </button>
      );
    }
    return (
      <button type="button" className="pp-btn" disabled={busy} onClick={e => handleAddFriend(e, person)}>
        {busy ? '…' : '+ Add friend'}
      </button>
    );
  };

  const inSearch = query.trim().length >= 2 || !!searchedFor;
  const open = (person) => navigate(`/profile/${person.id}`);

  return (
    <AppShell active="people">
      <div className="pp-wrap">
        <header className="pp-hero">
          <span className="pp-eyebrow">People</span>
          <h1 className="pp-title">Who's on DoitHere</h1>
          <p className="pp-sub">Look someone up by username, or meet the people who just joined.</p>
        </header>

        <form className="pp-search" onSubmit={onSubmit} role="search">
          <svg className="pp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input className="pp-search-input" type="search" enterKeyHint="search"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            placeholder="Search by username" aria-label="Search by username"
            value={query} onChange={e => setQuery(e.target.value)} />
          {searching && <span className="pp-spinner" aria-label="Searching" />}
          {!searching && query && (
            <button type="button" className="pp-clear" aria-label="Clear search" onClick={() => setQuery('')}>×</button>
          )}
        </form>

        {friendReqs.length > 0 && !inSearch && (
          <section className="pp-reqs">
            <h2 className="pp-section-title">
              Friend requests <span className="pp-count">{friendReqs.length}</span>
            </h2>
            <div className="pp-reqs-list">
              {friendReqs.map(req => (
                <div key={req.id} className="pp-req">
                  <button type="button" className="pp-req-person" onClick={() => open(req)}>
                    <Ava person={req} />
                    <span className="pp-req-text">
                      <span className="pp-name">{req.username}</span>
                      {req.headline && <span className="pp-req-sub">{req.headline}</span>}
                    </span>
                  </button>
                  <div className="pp-req-actions">
                    <button type="button" className="pp-btn is-accept" disabled={friendBusyId === req.id}
                      onClick={() => handleRespondReq(req, 'accept')}>
                      {friendBusyId === req.id ? '…' : 'Accept'}
                    </button>
                    <button type="button" className="pp-btn is-quiet" disabled={friendBusyId === req.id}
                      onClick={() => handleRespondReq(req, 'reject')}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {inSearch ? (
          <section>
            <div className="pp-section-head">
              <h2 className="pp-section-title">
                {searchedFor
                  ? `${results.length}${hasMore ? '+' : ''} ${results.length === 1 ? 'match' : 'matches'} for “${searchedFor}”`
                  : 'Searching…'}
              </h2>
            </div>
            {!searchedFor ? (
              <div className="pp-grid"><Skeletons n={3} /></div>
            ) : results.length === 0 ? (
              <div className="pp-empty">
                <strong>No one called “{searchedFor}”</strong>
                <span>Usernames are a single word, so try part of one.</span>
              </div>
            ) : (
              <>
                <div className="pp-grid">
                  {results.map((person, i) => (
                    <PersonCard key={person.id} person={person} action={friendAction(person)}
                      onOpen={() => open(person)} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} />
                  ))}
                </div>
                {hasMore && (
                  <button type="button" className="pp-more" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </section>
        ) : (
          <section>
            <div className="pp-section-head">
              <h2 className="pp-section-title">New on DoitHere</h2>
              <span className="pp-section-sub">Newest first</span>
            </div>
            {fresh === null ? (
              <div className="pp-grid"><Skeletons n={6} /></div>
            ) : fresh.length === 0 ? (
              <div className="pp-empty">
                <strong>It's just you so far</strong>
                <span>Share DoitHere with friends who make things, and they'll show up here.</span>
              </div>
            ) : (
              <div className="pp-grid">
                {fresh.map((person, i) => (
                  <PersonCard key={person.id} person={person} onOpen={() => open(person)}
                    style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
