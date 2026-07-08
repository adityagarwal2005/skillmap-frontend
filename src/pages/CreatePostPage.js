import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { createPortfolioItem } from '../api/portfolio';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './CreatePostPage.css';

const TYPES = ['project', 'design', 'photo', 'baked_good', 'artwork', 'video', 'other'];

export default function CreatePostPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', portfolio_type: 'project',
    skills: '', tags: '',
  });
  const [loading, setLoading] = useState(false);

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
    <AppShell>
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
    </AppShell>
  );
}