import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import { createWorkRequest } from '../api/work';
import { createCollabPost } from '../api/collab';
import './CreateWorkModal.css';

export const VISIBILITY_OPTIONS = [
  { label: '1 hour',   hours: 1 },
  { label: '2 hours',  hours: 2 },
  { label: '6 hours',  hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
];

const RANGE_OPTIONS = [0.5, 1, 2, 5, 10, 50];

/**
 * Create a freelance job or a collab, in place.
 *
 * Lives as a modal wherever it's opened (the Post tab) rather than being a
 * page of its own — cancelling just closes it and leaves you where you were,
 * instead of stranding you on a separate board page.
 *
 * kind: 'freelance' | 'collab'
 */
export default function CreateWorkModal({ kind, onClose, onCreated }) {
  const { showToast } = useToast();
  const isFreelance = kind === 'freelance';

  const [form, setForm] = useState({
    // freelance
    description: '', payment_amount: '', gender_preference: 'any',
    // collab
    title: '',
    // shared
    skills: '', time_limit_hours: 24, range_km: 5,
  });
  const [media, setMedia]       = useState(null);
  const [location, setLocation] = useState({ lat: '', lon: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = isFreelance
      ? {
          description: form.description,
          payment_amount: form.payment_amount,
          time_limit_hours: form.time_limit_hours,
          gender_preference: form.gender_preference,
          skills: form.skills,
          range_km: form.range_km,
        }
      : {
          title: form.title,
          description: form.description,
          skills: form.skills,
          time_limit_hours: form.time_limit_hours,
          range_km: form.range_km,
        };
    if (location.lat) {
      payload.latitude  = location.lat;
      payload.longitude = location.lon;
    }
    if (media) payload.media = media;

    try {
      setSubmitting(true);
      if (isFreelance) await createWorkRequest(payload);
      else             await createCollabPost(payload);
      showToast(isFreelance ? 'Job posted!' : 'Collab created!', 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pickMedia = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const prepared = await prepareMediaFile(f, showToast);
    if (prepared) setMedia(prepared);
  };

  return (
    <div className="cw-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <div className="cw-head">
          <h2 className="cw-title">{isFreelance ? 'New freelance job' : 'New collab'}</h2>
          <button type="button" className="cw-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="cw-form">
          {!isFreelance && (
            <div className="cw-field">
              <label className="cw-label">Title</label>
              <input className="cw-input" required placeholder="What are you building?"
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
          )}

          <div className="cw-field">
            <label className="cw-label">{isFreelance ? 'What do you need done?' : 'Description'}</label>
            <textarea className="cw-input cw-textarea" required rows={3}
              placeholder={isFreelance ? 'Describe the job…' : 'Tell people about your project idea…'}
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {isFreelance && (
            <div className="cw-field">
              <label className="cw-label">Payment (₹)</label>
              <input className="cw-input" type="number" required placeholder="e.g. 2000"
                value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)} />
            </div>
          )}

          <div className="cw-field">
            <label className="cw-label">
              Skills {isFreelance ? '' : <span className="cw-hint">optional</span>}
              <span className="cw-hint">comma separated</span>
            </label>
            <input className="cw-input" required={isFreelance} placeholder="React, Python, Figma"
              value={form.skills} onChange={e => set('skills', e.target.value)} />
          </div>

          <div className="cw-row">
            <div className="cw-field">
              <label className="cw-label">Visible for</label>
              <select className="cw-input cw-select" value={form.time_limit_hours}
                onChange={e => set('time_limit_hours', e.target.value)}>
                {VISIBILITY_OPTIONS.map(o => (
                  <option key={o.hours} value={o.hours}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="cw-field">
              <label className="cw-label">Visible within</label>
              <select className="cw-input cw-select" value={form.range_km}
                onChange={e => set('range_km', e.target.value)}>
                {RANGE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r < 1 ? `${r * 1000} m` : `${r} km`}</option>
                ))}
              </select>
            </div>
          </div>

          {isFreelance && (
            <div className="cw-field">
              <label className="cw-label">Preferred gender</label>
              <select className="cw-input cw-select" value={form.gender_preference}
                onChange={e => set('gender_preference', e.target.value)}>
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          )}

          <div className="cw-field">
            <label className="cw-label">Image / video <span className="cw-hint">optional</span></label>
            {media ? (
              <div className="cw-media-chip">
                <span className="cw-media-name">{media.name}</span>
                <button type="button" onClick={() => setMedia(null)}>×</button>
              </div>
            ) : (
              <label className="cw-media-pick">
                <input type="file" accept="image/*,video/*" hidden onChange={pickMedia} />
                + Attach image or video
              </label>
            )}
          </div>

          <div className="cw-actions">
            <button type="button" className="cw-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-submit" disabled={submitting}>
              {submitting ? 'Posting…' : isFreelance ? 'Post job' : 'Create collab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
