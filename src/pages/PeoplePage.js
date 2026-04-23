import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { searchUsers, getCategories, getCategorySkills } from '../api/users';
import './FeedPage.css';
import './PeoplePage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const SVGsearch = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

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
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [categories, setCategories]   = useState([]);
  const [skills, setSkills]           = useState([]);
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [theme, setTheme]             = useState(localStorage.getItem('theme') || 'dark');

  const [form, setForm] = useState({
    category_id: '',
    radius: 10,
    skills: [],
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || [])).catch(() => {});
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      });
    }
  }, []);

  const handleCategoryChange = async e => {
    const catId = e.target.value;
    setForm(f => ({ ...f, category_id: catId, skills: [] }));
    if (catId) {
      try {
        const res = await getCategorySkills(catId);
        setSkills(res.data.skills || []);
      } catch {}
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

  const handleSearch = async e => {
    e.preventDefault();
    if (!form.category_id) { showToast('Please select a category', 'error'); return; }
    if (!form.latitude || !form.longitude) { showToast('Location not available', 'error'); return; }
    try {
      setLoading(true);
      setSearched(true);
      const params = {
        category_id: form.category_id,
        latitude:    form.latitude,
        longitude:   form.longitude,
        radius:      form.radius,
      };
      if (form.skills.length > 0) params.skills = form.skills.join(',');
      const res = await searchUsers(params);
      setResults(res.data.results || []);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <form className="topbar-search" onSubmit={e => e.preventDefault()}>
          <span className="topbar-search-icon">{SVGsearch}</span>
          <input className="topbar-search-input" placeholder="Search skills, people, projects..."
            onKeyDown={e => { if (e.key === 'Enter') navigate(`/search?q=${e.target.value}`); }} />
          <button type="button" className="topbar-search-btn"
            onClick={e => { const v = e.target.previousSibling?.value; if (v) navigate(`/search?q=${v}`); }}>Go</button>
        </form>
        <div className="topbar-right">
          <button className="topbar-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="people-layout">
        {/* Filters sidebar */}
        <aside className="people-filters">
          <h2 className="people-filters-title">Find People</h2>
          <form onSubmit={handleSearch}>
            <div className="filter-field">
              <label className="filter-label">Category *</label>
              <select className="filter-select"
                value={form.category_id} onChange={handleCategoryChange}>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label className="filter-label">Radius</label>
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
              <div className="filter-field">
                <label className="filter-label">Skills</label>
                <div className="skill-chips">
                  {skills.map(s => (
                    <button key={s.id} type="button"
                      className={`skill-chip ${form.skills.includes(s.name) ? 'active' : ''}`}
                      onClick={() => toggleSkill(s.name)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-field">
              <label className="filter-label">Location</label>
              <p className="filter-location-text">
                {form.latitude ? `📍 ${parseFloat(form.latitude).toFixed(4)}, ${parseFloat(form.longitude).toFixed(4)}` : 'Getting your location...'}
              </p>
            </div>

            <button type="submit" className="filter-search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search People'}
            </button>
          </form>
        </aside>

        {/* Results */}
        <main className="people-results">
          {!searched ? (
            <div className="state-box">
              <h3>Find skilled people near you</h3>
              <p>Select a category and radius to start searching</p>
            </div>
          ) : loading ? (
            <div className="people-loading">Searching...</div>
          ) : results.length === 0 ? (
            <div className="state-box">
              <h3>No people found</h3>
              <p>Try a different category or increase the radius</p>
            </div>
          ) : (
            <>
              <p className="people-count">{results.length} people found</p>
              <div className="people-grid">
                {results.map(person => (
                  <div key={person.id} className="person-card"
                    onClick={() => navigate(`/profile/${person.id}`)}>
                    <div className="person-card-top">
                      <div className="person-ava">{person.username[0].toUpperCase()}</div>
                      <div className="person-info">
                        <span className="person-name">{person.username}</span>
                        <span className="person-cat">{person.category || 'Independent'}</span>
                      </div>
                      <span className={`profile-status-badge ${STATUS_COLORS[person.status] || 'status-gray'}`}>
                        {STATUS_LABELS[person.status] || 'Not Available'}
                      </span>
                    </div>
                    <div className="person-skills">
                      {person.skills?.slice(0, 4).map(s => (
                        <span key={s} className="tag tag-skill">{s}</span>
                      ))}
                    </div>
                    <div className="person-footer">
                      <span className="person-stat">⭐ {person.rating > 0 ? person.rating.toFixed(1) : '—'}</span>
                      <span className="person-stat">📍 {person.distance_km} km</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}