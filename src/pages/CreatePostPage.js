import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { createPortfolioItem, addMedia } from '../api/portfolio';
import { prepareMediaFile } from '../utils/mediaUpload';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import '../styles/forms.css';

const TYPES = ['project', 'design', 'photo', 'artwork', 'video', 'other'];
const MAX_PHOTOS = 4;

export default function CreatePostPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();
  const { user }             = useAuth();

  const [form, setForm] = useState({
    title: '', description: '', portfolio_type: 'project',
    skills: '', tags: '',
  });
  const [photos, setPhotos]   = useState([]);   // File[]
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotos = async e => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    const room = MAX_PHOTOS - photos.length;
    const prepared = [];
    for (const file of picked.slice(0, room)) {
      const result = await prepareMediaFile(file, showToast);
      if (result) prepared.push(result);
    }
    setPhotos(prev => [...prev, ...prepared].slice(0, MAX_PHOTOS));
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

      // Photos upload to the already-created item in parallel and don't
      // block navigation — the item exists as soon as createPortfolioItem
      // resolves, so there's no reason to sit on the create screen waiting
      // for every photo's own Cloudinary round-trip one at a time.
      if (photos.length > 0) {
        Promise.all(photos.map(file => {
          const fd = new FormData();
          fd.append('media_type', 'image');
          fd.append('file', file);
          return addMedia(itemId, fd).catch(() => showToast('A photo failed to upload', 'error'));
        }));
      }

      showToast('Project added', 'success');
      // The feed shows gigs and collabs, not projects; land where this appears.
      navigate(`/profile/${user.id}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not add the project', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="profile">
      <div className="fm-page">
        <button className="fm-back" onClick={() => navigate(-1)}>← Back</button>

        <header className="fm-head">
          <h1 className="fm-title">Add a project</h1>
          <p className="fm-sub">Show what you've made. People hire from proof.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="fm-card">
            <h2 className="fm-card-title">The work</h2>

            <div className="fm-field">
              <label className="fm-label" htmlFor="cp-title">Title</label>
              <input id="cp-title" name="title" className="fm-input"
                placeholder="What did you make?" maxLength={100} required
                value={form.title} onChange={handleChange} />
              <span className="fm-counter">{form.title.length}/100</span>
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="cp-desc">
                Description <span className="fm-hint">one or two lines</span>
              </label>
              <textarea id="cp-desc" name="description" className="fm-input fm-textarea"
                placeholder="What is it, and what did you use?" maxLength={200} rows={3} required
                value={form.description} onChange={handleChange} />
              <span className="fm-counter">{form.description.length}/200</span>
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="cp-type">Type</label>
              <select id="cp-type" name="portfolio_type" className="fm-input fm-select"
                value={form.portfolio_type} onChange={handleChange}>
                {TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-card-title">Photos</h2>
            <div className="fm-field">
              <label className="fm-label">
                Show it <span className="fm-hint">up to {MAX_PHOTOS} — work with a photo gets picked more</span>
              </label>
              <div className="fm-photos">
                {photos.map((file, i) => (
                  <div className="fm-photo" key={i}>
                    <img src={URL.createObjectURL(file)} alt={`upload ${i + 1}`} />
                    <button type="button" className="fm-photo-x"
                      onClick={() => removePhoto(i)} aria-label="Remove photo">×</button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="fm-photo-add">
                    <input type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
                    <span>＋</span>
                    <span className="fm-photo-add-text">Add photo</span>
                  </label>
                )}
              </div>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-card-title">Findability</h2>

            <div className="fm-field">
              <label className="fm-label" htmlFor="cp-skills">
                Skills used <span className="fm-hint">comma separated</span>
              </label>
              <input id="cp-skills" name="skills" className="fm-input"
                placeholder="React, Python, Figma"
                value={form.skills} onChange={handleChange} />
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="cp-tags">
                Tags <span className="fm-hint">comma separated</span>
              </label>
              <input id="cp-tags" name="tags" className="fm-input"
                placeholder="dashboard, ai, ecommerce"
                value={form.tags} onChange={handleChange} />
            </div>
          </section>

          <div className="fm-actions">
            <button type="button" className="fm-cancel" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="fm-submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add project'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
