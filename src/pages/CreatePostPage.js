import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createPortfolioItem } from '../api/portfolio';
import './FeedPage.css';
import './CreatePostPage.css';

const TYPES = ['project', 'design', 'photo', 'baked_good', 'artwork', 'video', 'other'];

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function CreatePostPage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', portfolio_type: 'project',
    skills: '', tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [theme, setTheme]     = useState(localStorage.getItem('theme') || 'dark');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }
    try {
      setLoading(true);
      await createPortfolioItem(form);
      showToast('Post created successfully!', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create post', 'error');
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
        <div className="topbar-right">
          <button className="topbar-btn"
            onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); }}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="create-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="create-box">
          <h1 className="create-title">Post your work</h1>
          <p className="create-sub">Keep it short and visual. No essays.</p>

          <form onSubmit={handleSubmit} className="create-form">
            <div className="create-field">
              <label className="create-label">Title *</label>
              <input name="title" className="create-input"
                placeholder="What did you build?" maxLength={100}
                value={form.title} onChange={handleChange} required />
              <span className="create-counter">{form.title.length}/100</span>
            </div>

            <div className="create-field">
              <label className="create-label">Description * <span className="create-hint">Max 200 characters — keep it short</span></label>
              <textarea name="description" className="create-textarea"
                placeholder="What is it? What did you use? Keep it to 1-2 lines."
                maxLength={200} rows={3}
                value={form.description} onChange={handleChange} required />
              <span className="create-counter">{form.description.length}/200</span>
            </div>

            <div className="create-field">
              <label className="create-label">Type *</label>
              <select name="portfolio_type" className="create-select"
                value={form.portfolio_type} onChange={handleChange}>
                {TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>

            <div className="create-field">
              <label className="create-label">Skills used <span className="create-hint">comma separated — must exist in your profile</span></label>
              <input name="skills" className="create-input"
                placeholder="React, Python, Figma"
                value={form.skills} onChange={handleChange} />
            </div>

            <div className="create-field">
              <label className="create-label">Tags <span className="create-hint">comma separated</span></label>
              <input name="tags" className="create-input"
                placeholder="dashboard, ai, ecommerce"
                value={form.tags} onChange={handleChange} />
            </div>

            <div className="create-actions">
              <button type="button" className="create-cancel" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="create-submit" disabled={loading}>
                {loading ? 'Posting...' : 'Post Work'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}