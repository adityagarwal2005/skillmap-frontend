import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  searchUsers, getCategories, getCategorySkills,
  getFriendRequests, respondFriendRequest, sendFriendRequest,
} from '../api/users';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './PeoplePage.css';

const RADII = [
  { label: '1 km',   value: 1 },
  { label: '5 km',   value: 5 },
  { label: '10 km',  value: 10 },
  { label: '50 km',  value: 50 },
  { label: 'India',  value: 5000 },
];

const STATUS_LABELS = {
  open_to_freelance: 'Open to Freelance',
  open_to_work:      'Open to Work',
  not_available:     'Not Available',
};

const STATUS_COLORS = {
  open_to_freelance: 'status-orange',
  open_to_work:      'status-green',
  not_available:     'status-gray',
};

export default function PeoplePage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [categories, setCategories]   = useState([]);
  const [skills, setSkills]           = useState([]);
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [lastParams, setLastParams]   = useState(null);
  const [query, setQuery]             = useState('');
  const [friendReqs, setFriendReqs]   = useState([]);   // incoming friend requests
  const [cardStatus, setCardStatus]   = useState({});   // per-person status override
  const [friendBusyId, setFriendBusyId] = useState(null);

  const [form, setForm] = useState({
    category_id: '',
    radius: 10,
    skills: [],
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || [])).catch(() => {});
    getFriendRequests().then(r => setFriendReqs(r.data.requests || [])).catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleCategoryChange = async e => {
    const catId = e.target.value;
    setForm(f => ({ ...f, category_id: catId, skills: [] }));
    if (catId) {
      try {
        const res = await getCategorySkills(catId);
        setSkills(res.data.skills || []);
      } catch { setSkills([]); }
    } else {
      setSkills([]);
    }
  };

  const toggleSkill = skill => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter(s => s !== skill)
        : [...f.skills, skill],
    }));
  };

  const buildParams = () => {
    const q = query.trim();
    const params = { radius: form.radius };
    if (q) params.q = q;
    if (form.category_id) params.category_id = form.category_id;
    if (form.skills.length > 0) params.skills = form.skills.join(',');
    // Location is optional — only send it (for distance/radius) when we have it.
    if (form.latitude && form.longitude) {
      params.latitude = form.latitude;
      params.longitude = form.longitude;
    }
    return params;
  };

  const handleSearch = async e => {
    e.preventDefault();
    if (!query.trim() && !form.category_id && form.skills.length === 0) {
      showToast('Type a username, or pick a category', 'error');
      return;
    }
    try {
      setLoading(true);
      setSearched(true);
      const params = buildParams();
      setLastParams(params);
      const res = await searchUsers(params);
      setResults(res.data.results || []);
      setHasMore(!!res.data.has_more);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastParams) return;
    setLoadingMore(true);
    try {
      const res = await searchUsers({ ...lastParams, offset: results.length });
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

  const FriendButton = ({ person }) => {
    const st = statusOf(person);
    const busy = friendBusyId === person.id;
    if (st === 'friends') {
      return <span className="person-friend-btn is-friends">✓ Friends</span>;
    }
    if (st === 'request_sent') {
      return <span className="person-friend-btn is-pending">Requested</span>;
    }
    if (st === 'request_received') {
      return (
        <button className="person-friend-btn is-accept" disabled={busy}
          onClick={e => { e.stopPropagation(); handleRespondReq(person, 'accept'); }}>
          {busy ? '…' : '✓ Accept'}
        </button>
      );
    }
    return (
      <button className="person-friend-btn" disabled={busy}
        onClick={e => handleAddFriend(e, person)}>
        {busy ? '…' : '＋ Add friend'}
      </button>
    );
  };

  return (
    <AppShell active="people">
      <div className="people-wrapper">
        {friendReqs.length > 0 && (
          <div className="friend-reqs">
            <h2 className="friend-reqs-title">
              Friend requests <span className="friend-reqs-count">{friendReqs.length}</span>
            </h2>
            <div className="friend-reqs-list">
              {friendReqs.map(req => (
                <div key={req.id} className="friend-req-card">
                  <div className="friend-req-person" onClick={() => navigate(`/profile/${req.id}`)}>
                    <div className="person-ava">
                      {req.profile_image
                        ? <img className="ava-img" src={req.profile_image} alt="" />
                        : req.username[0].toUpperCase()}
                    </div>
                    <div className="friend-req-info">
                      <span className="person-name">{req.username}</span>
                      {req.headline && <span className="person-headline">{req.headline}</span>}
                    </div>
                  </div>
                  <div className="friend-req-actions">
                    <button className="person-friend-btn is-accept"
                      disabled={friendBusyId === req.id}
                      onClick={() => handleRespondReq(req, 'accept')}>
                      {friendBusyId === req.id ? '…' : 'Accept'}
                    </button>
                    <button className="person-friend-btn is-decline"
                      disabled={friendBusyId === req.id}
                      onClick={() => handleRespondReq(req, 'reject')}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="people-hero">
          <h1 className="people-heading">Find People</h1>
          <p className="people-sub">
            Discover people on campus — search by username, or browse by category.
          </p>
        </div>

        <form className="people-search" onSubmit={handleSearch}>
          <div className="people-search-row">
            <span className="people-search-icon" aria-hidden="true">⌕</span>
            <input
              className="people-search-input"
              placeholder="Search by username…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="people-search-btn" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="people-filter-row">
            <select className="people-cat-select"
              value={form.category_id} onChange={handleCategoryChange}>
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="radius-btns">
              {RADII.map(r => (
                <button key={r.value} type="button"
                  className={`radius-btn ${form.radius === r.value ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, radius: r.value }))}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {skills.length > 0 && (
            <div className="people-skill-row">
              {skills.map(s => (
                <button key={s.id} type="button"
                  className={`skill-chip ${form.skills.includes(s.name) ? 'active' : ''}`}
                  onClick={() => toggleSkill(s.name)}>
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <p className="people-loc-note">
            {form.latitude
              ? '📍 Using your location to show distance'
              : 'Location off — showing everyone, no distance filter'}
          </p>
        </form>

        {!searched ? (
          <div className="state-box">
            <h3>Find skilled people near you</h3>
            <p>Search by username, or pick a category to start browsing.</p>
          </div>
        ) : loading ? (
          <div className="people-grid">
            <PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton />
          </div>
        ) : results.length === 0 ? (
          <div className="state-box">
            <h3>No people found</h3>
            <p>Try a different keyword, category, or a larger radius.</p>
          </div>
        ) : (
          <>
            <p className="people-count">{results.length} {results.length === 1 ? 'person' : 'people'} found</p>
            <div className="people-grid">
              {results.map(person => (
                <div key={person.id} className="person-card"
                  onClick={() => navigate(`/profile/${person.id}`)}>
                  <div className="person-card-top">
                    <div className="person-ava">
                      {person.profile_image
                        ? <img className="ava-img" src={person.profile_image} alt="" />
                        : person.username[0].toUpperCase()}
                    </div>
                    <div className="person-info">
                      <span className="person-name">{person.username}</span>
                      <span className="person-cat">{person.category || 'Independent'}</span>
                      {person.headline && <span className="person-headline">{person.headline}</span>}
                    </div>
                    <span className={`profile-status-badge ${STATUS_COLORS[person.status] || 'status-gray'}`}>
                      {STATUS_LABELS[person.status] || 'Not Available'}
                    </span>
                  </div>
                  {person.skills?.length > 0 && (
                    <div className="person-skills">
                      {person.skills.slice(0, 4).map(s => (
                        <span key={s} className="tag tag-skill">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="person-footer">
                    <span className="person-stat">⭐ {person.rating > 0 ? person.rating.toFixed(1) : '—'}</span>
                    <span className="person-stat">
                      📍 {person.distance_km != null ? `${person.distance_km} km` : '—'}
                    </span>
                  </div>
                  <div className="person-card-actions">
                    <FriendButton person={person} />
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
