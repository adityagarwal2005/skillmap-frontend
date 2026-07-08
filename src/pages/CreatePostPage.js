import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { createPortfolioItem, addMedia } from '../api/portfolio';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './CreatePostPage.css';

const TYPES = ['project', 'design', 'photo', 'baked_good', 'artwork', 'video', 'other'];
const MAX_PHOTOS = 4;

export default function CreatePostPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', portfolio_type: 'project',
    skills: '', tags: '',
  });
  const [photos, setPhotos]   = useState([]);   // File[]
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotos = e => {
    const picked = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...picked].slice(0, MAX_PHOTOS));
    e.target.value = ''; // allow re-selecting the same file
  };

  const removePhoto = i => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await createPortfolioItem(form);
      const itemId = res.data.item_id;

      // Upload each photo to the new item (Cloudinary via the media endpoint)
      for (const file of photos) {
        const fd = new FormData();
        fd.append('media_type', 'image');
        fd.append('file', file);
        try { await addMedia(itemId, fd); }
        catch { showToast('A photo failed to upload', 'error'); }
      }

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
              <label className="create-label">Skills used <span className="create-hint">comma separated — unknown ones become tags</span></label>
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

            <div className="create-field">
              <label className="create-label">Photos <span className="create-hint">up to {MAX_PHOTOS} — show your work</span></label>
              <div className="photo-grid">
                {photos.map((file, i) => (
                  <div className="photo-thumb" key={i}>
                    <img src={URL.createObjectURL(file)} alt={`upload ${i + 1}`} />
                    <button type="button" className="photo-remove"
                      onClick={() => removePhoto(i)} aria-label="Remove photo">×</button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="photo-add">
                    <input type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
                    <span>＋</span>
                    <span className="photo-add-text">Add photo</span>
                  </label>
                )}
              </div>
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