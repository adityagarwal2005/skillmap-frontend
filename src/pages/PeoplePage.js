import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { searchUsers, getCategories, getCategorySkills } from '../api/users';
import AppShell from '../components/AppShell';
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
  const [searched, setSearched]       = useState(false);

  const [form, setForm] = useState({
    category_id: '',
    radius: 10,
    skills: [],
    latitude: '',
    longitude: '',
  });

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
    <AppShell active="people">
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
                {form.latitude ? '📍 Using your current location' : 'Getting your location…'}
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
    </AppShell>
  );
}