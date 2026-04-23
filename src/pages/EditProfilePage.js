import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUser, editUser, getCategories } from '../api/users';
import './FeedPage.css';
import './EditProfilePage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function EditProfilePage() {
  const { userId }                      = useParams();
  const { user: authUser, loginUser }   = useAuth();
  const { showToast }                   = useToast();
  const navigate                        = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', password: '',
    category_id: '', linkedin_url: '', github_url: '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [theme, setTheme]           = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (authUser?.id !== parseInt(userId)) {
      navigate(`/profile/${userId}`);
      return;
    }
    const load = async () => {
      try {
        const [uRes, cRes] = await Promise.all([getUser(userId), getCategories()]);
        const u = uRes.data;
        setForm({
          username:     u.username || '',
          email:        u.email || '',
          password:     '',
          category_id:  '',
          linkedin_url: u.linkedin_url || '',
          github_url:   u.github_url || '',
        });
        setCategories(cRes.data.categories || []);
      } catch { showToast('Failed to load profile', 'error'); }
      finally { setLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {};
      if (form.username)     payload.username     = form.username;
      if (form.email)        payload.email        = form.email;
      if (form.password)     payload.password     = form.password;
      if (form.category_id)  payload.category_id  = form.category_id;
      if (form.linkedin_url) payload.linkedin_url = form.linkedin_url;
      if (form.github_url)   payload.github_url   = form.github_url;

      await editUser(userId, payload);

      if (form.username && form.username !== authUser.username) {
        loginUser({ ...authUser, username: form.username },
          localStorage.getItem('access_token'),
          localStorage.getItem('refresh_token'));
      }

      showToast('Profile updated!', 'success');
      navigate(`/profile/${userId}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{padding:'40px',color:'var(--text-2)'}}>Loading...</div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <div className="topbar-right">
          <button className="topbar-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{authUser?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{authUser?.username}</span>
        </div>
      </header>

      <div className="edit-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>

        <div className="edit-box">
          <h1 className="create-title">Edit Profile</h1>
          <p className="create-sub">Update your profile information</p>

          <form onSubmit={handleSubmit} className="create-form">
            <div className="create-field">
              <label className="create-label">Username</label>
              <input className="create-input"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                placeholder="Username" />
            </div>

            <div className="create-field">
              <label className="create-label">Email</label>
              <input className="create-input" type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email address" />
            </div>

            <div className="create-field">
              <label className="create-label">New Password <span className="create-hint">leave blank to keep current</span></label>
              <input className="create-input" type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="New password" />
            </div>

            <div className="create-field">
              <label className="create-label">Category</label>
              <select className="create-select"
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}>
                <option value="">Keep current category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="create-field">
              <label className="create-label">LinkedIn URL</label>
              <input className="create-input" type="url"
                value={form.linkedin_url}
                onChange={e => setForm({...form, linkedin_url: e.target.value})}
                placeholder="https://linkedin.com/in/..." />
            </div>

            <div className="create-field">
              <label className="create-label">GitHub URL</label>
              <input className="create-input" type="url"
                value={form.github_url}
                onChange={e => setForm({...form, github_url: e.target.value})}
                placeholder="https://github.com/..." />
            </div>

            <div className="create-actions">
              <button type="button" className="create-cancel" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="create-submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}