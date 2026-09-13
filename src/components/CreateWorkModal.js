import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import { createWorkRequest } from '../api/work';
import { createCollabPost } from '../api/collab';
import { getUser } from '../api/users';
import { GigCard, TeamCard, money } from './ListingCard';
import { SKILL_CATEGORIES, categoriesOf } from '../utils/skillCategories';
import './CreateWorkModal.css';

const VISIBILITY_OPTIONS = [
  { label: '2 hours',  hours: 2 },
  { label: '6 hours',  hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
];
const RANGE_OPTIONS = [0.5, 1, 2, 5, 10, 50];
const BUDGETS = [300, 500, 1000, 2000, 5000];
// Shown until what's been typed points at a category.
const STARTER_SKILLS = ['Poster Design', 'Video Editing', 'Web Development', 'Photography', 'Social Media', 'Copywriting'];

const splitSkills = (text) => text.split(',').map(s => s.trim()).filter(Boolean);
const noop = () => {};

/**
 * Create a gig or a collab, in place.
 *
 * Lives as a modal wherever it's opened (the Post tab) rather than being a
 * page of its own — cancelling just closes it and leaves you where you were.
 * A live preview renders the exact feed card as you type, so the poster
 * sees what people nearby will see before it goes up.
 *
 * kind: 'freelance' | 'collab'
 */
export default function CreateWorkModal({ kind, onClose, onCreated }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isFreelance = kind === 'freelance';

  const [form, setForm] = useState({
    // freelance
    description: '', payment_amount: '', gender_preference: 'any',
    // collab
    title: '',
    // shared
    skills: '', time_limit_hours: 48, range_km: 5, people_needed: 1,
  });
  const [media, setMedia]       = useState(null);
  const [location, setLocation] = useState({ lat: '', lon: '' });
  const [submitting, setSubmitting] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Your own avatar and category, so the preview's footer is really you.
  useEffect(() => {
    if (!user?.id) return;
    getUser(user.id).then(r => setMe(r.data)).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const skillList = splitSkills(form.skills);
  const hasSkill = (s) => skillList.some(x => x.toLowerCase() === s.toLowerCase());
  const toggleSkill = (s) => set('skills', (hasSkill(s)
    ? skillList.filter(x => x.toLowerCase() !== s.toLowerCase())
    : [...skillList, s]
  ).join(', '));

  // Suggestions follow what the post is about: mention a poster and design
  // skills surface, mention a reel and video ones do.
  const suggestions = useMemo(() => {
    const ids = categoriesOf({
      title: form.title, description: form.description, skills: splitSkills(form.skills),
    });
    // Take turns across the matched categories, so "a poster and a reel"
    // suggests video skills too, not eight design ones.
    const lists = SKILL_CATEGORIES.filter(c => ids.has(c.id)).map(c => c.skills);
    const pool = [];
    for (let i = 0; lists.some(l => i < l.length); i++) {
      lists.forEach(l => { if (i < l.length) pool.push(l[i]); });
    }
    return [...new Set(pool.length ? pool : STARTER_SKILLS)].slice(0, 8);
  }, [form.title, form.description, form.skills]);

  const budget = Number(form.payment_amount) || 0;
  const previewItem = {
    kind: isFreelance ? 'freelance' : 'collab',
    title: isFreelance
      ? (form.description.trim().slice(0, 70) || 'Describe what you need done')
      : (form.title.trim() || 'Name your collab'),
    description: isFreelance
      ? (form.description.trim() || 'Describe what you need done')
      : (form.description.trim() || null),
    skills: skillList,
    payment_amount: budget,
    people_needed: Number(form.people_needed) || 1,
    hired_count: 0,
    // A minute's slack so a fresh 48-hour post previews as "48h left", not 47.
    expires_at: new Date(Date.now() + Number(form.time_limit_hours) * 3600000 + 60000).toISOString(),
    distance_km: null,
    gender_preference: form.gender_preference,
    user: {
      username: me?.username || user?.username || 'you',
      category: me?.category || null,
      profile_image: me?.profile_image || null,
    },
  };

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
          people_needed: form.people_needed,
        }
      : {
          title: form.title,
          description: form.description,
          skills: form.skills,
          time_limit_hours: form.time_limit_hours,
          range_km: form.range_km,
          people_needed: form.people_needed,
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
      showToast(isFreelance ? 'Gig posted!' : 'Collab created!', 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      // Surface the status when the server didn't send a usable message —
      // a bare "Failed to post" on a 500 gives no clue what went wrong.
      const status = err.response?.status;
      showToast(
        err.response?.data?.error
          || (status >= 500 ? `Server error (${status}) — please try again`
              : status ? `Failed to post (${status})` : 'Network error — check your connection'),
        'error',
      );
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
      <div className={`cw-modal ${isFreelance ? 'is-gig' : 'is-team'}`} role="dialog" aria-modal="true"
        aria-labelledby="cw-title" onClick={e => e.stopPropagation()}>
        <div className="cw-head">
          <div>
            <span className="cw-eyebrow">{isFreelance ? 'Hire someone nearby' : 'Find people to build with'}</span>
            <h2 id="cw-title" className="cw-title">{isFreelance ? 'New gig' : 'New collab'}</h2>
          </div>
          <button type="button" className="cw-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="cw-form">
          <div className="cw-fields">
            {!isFreelance && (
              <div className="cw-field">
                <label className="cw-label" htmlFor="cw-name">Title</label>
                <input id="cw-name" className="cw-input" required placeholder="What are you building?"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
            )}

            <div className="cw-field">
              <label className="cw-label" htmlFor="cw-desc">
                {isFreelance ? 'What do you need done?' : 'Description'}
              </label>
              <textarea id="cw-desc" className="cw-input cw-textarea" required rows={3}
                placeholder={isFreelance ? 'e.g. Design a poster for our fest by Friday' : 'Tell people about your project idea…'}
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            {isFreelance && (
              <div className="cw-field">
                <label className="cw-label" htmlFor="cw-pay">Budget</label>
                <div className="cw-money-wrap">
                  <input id="cw-pay" className="cw-input cw-money" type="number" inputMode="numeric"
                    min="1" required placeholder="2000"
                    value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)} />
                </div>
                <div className="cw-chips">
                  {BUDGETS.map(b => (
                    <button key={b} type="button" aria-pressed={budget === b}
                      className={`cw-chip ${budget === b ? 'is-on' : ''}`}
                      onClick={() => set('payment_amount', String(b))}>
                      {money(b)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="cw-field">
              <label className="cw-label" htmlFor="cw-skills">
                Skills {isFreelance ? null : <span className="cw-hint">optional</span>}
                <span className="cw-hint">comma separated</span>
              </label>
              <input id="cw-skills" className="cw-input" required={isFreelance}
                placeholder="React, Figma, Video editing"
                value={form.skills} onChange={e => set('skills', e.target.value)} />
              <div className="cw-chips">
                <span className="cw-chip-label">Suggested</span>
                {suggestions.map(s => (
                  <button key={s} type="button" aria-pressed={hasSkill(s)}
                    className={`cw-chip ${hasSkill(s) ? 'is-on' : ''}`}
                    onClick={() => toggleSkill(s)}>
                    {hasSkill(s) ? '✓' : '+'} {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="cw-field">
              <span className="cw-label" id="cw-people">
                {isFreelance ? 'People needed' : 'Teammates needed'}
                <span className="cw-hint">up to 5</span>
              </span>
              <div className="cw-seg" role="radiogroup" aria-labelledby="cw-people">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" role="radio" aria-checked={form.people_needed === n}
                    className={form.people_needed === n ? 'is-on' : ''}
                    onClick={() => set('people_needed', n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="cw-row">
              <div className="cw-field">
                <label className="cw-label" htmlFor="cw-for">Visible for</label>
                <select id="cw-for" className="cw-input cw-select" value={form.time_limit_hours}
                  onChange={e => set('time_limit_hours', e.target.value)}>
                  {VISIBILITY_OPTIONS.map(o => (
                    <option key={o.hours} value={o.hours}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="cw-field">
                <label className="cw-label" htmlFor="cw-within">Visible within</label>
                <select id="cw-within" className="cw-input cw-select" value={form.range_km}
                  onChange={e => set('range_km', e.target.value)}>
                  {RANGE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r < 1 ? `${r * 1000} m` : `${r} km`}</option>
                  ))}
                </select>
              </div>
            </div>

            {isFreelance && (
              <div className="cw-field">
                <label className="cw-label" htmlFor="cw-gender">Preferred gender</label>
                <select id="cw-gender" className="cw-input cw-select" value={form.gender_preference}
                  onChange={e => set('gender_preference', e.target.value)}>
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            )}

            <div className="cw-field">
              <span className="cw-label">Image / video <span className="cw-hint">optional</span></span>
              {media ? (
                <div className="cw-media-chip">
                  <span className="cw-media-name">{media.name}</span>
                  <button type="button" onClick={() => setMedia(null)} aria-label="Remove attachment">×</button>
                </div>
              ) : (
                <label className="cw-media-pick">
                  <input type="file" accept="image/*,video/*" hidden onChange={pickMedia} />
                  + Attach image or video
                </label>
              )}
            </div>
          </div>

          <aside className="cw-preview">
            <span className="cw-preview-label">Live preview</span>
            <div className="cw-preview-card" aria-hidden="true">
              {isFreelance
                ? <GigCard item={previewItem} interactive={false} onOpen={noop} onSave={noop} />
                : <TeamCard item={previewItem} interactive={false} onOpen={noop} onSave={noop} />}
            </div>
          </aside>

          <div className="cw-actions">
            <button type="button" className="cw-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="cw-submit" disabled={submitting}>
              {submitting ? 'Posting…'
                : isFreelance ? `Post gig${budget > 0 ? ` · ${money(budget)}` : ''}`
                : 'Start collab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
