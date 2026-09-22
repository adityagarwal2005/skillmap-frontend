import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUser, editUser, getCategories, changePassword, uploadAvatar } from '../api/users';
import { prepareMediaFile } from '../utils/mediaUpload';
import AppShell from '../components/AppShell';
import { cldAvatar } from '../utils/cloudinaryUrl';
import './FeedPage.css';
import '../styles/forms.css';

export default function EditProfilePage() {
  const { userId }                      = useParams();
  const { user: authUser, loginUser }   = useAuth();
  const { showToast }                   = useToast();
  const navigate                        = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', dob: '', headline: '', bio: '', category_id: '',
  });
  const [pwd, setPwd]               = useState({ current: '', next: '' });
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdDone, setPwdDone]       = useState(false);
  const [avatar, setAvatar]         = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

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
          dob:          u.dob || '',
          headline:     u.headline || '',
          bio:          u.bio || '',
          category_id:  '',
        });
        setAvatar(u.profile_image || null);
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
      if (form.dob)          payload.dob          = form.dob;
      if (form.category_id)  payload.category_id  = form.category_id;
      // Always send these so they can also be cleared.
      payload.headline = form.headline;
      payload.bio      = form.bio;

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

  const handleAvatar = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const prepared = await prepareMediaFile(file, showToast, { maxDimension: 800 });
    if (!prepared) return;
    setAvatar(URL.createObjectURL(prepared)); // instant preview
    try {
      setAvatarSaving(true);
      await uploadAvatar(userId, prepared);
      showToast('Photo updated', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload photo', 'error');
    } finally { setAvatarSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwd.current || !pwd.next) {
      showToast('Enter your current and new password', 'error');
      return;
    }
    try {
      setPwdSaving(true);
      await changePassword(userId, pwd.current, pwd.next);
      setPwd({ current: '', next: '' });
      setPwdDone(true);
      showToast('Password updated', 'success');
      setTimeout(() => setPwdDone(false), 3000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update password', 'error');
    } finally { setPwdSaving(false); }
  };

  if (loading) return (
    <AppShell active="profile">
      <div className="fm-page"><div className="fm-loading">Loading…</div></div>
    </AppShell>
  );

  return (
    <AppShell active="profile">
      <div className="fm-page">
        <button className="fm-back" onClick={() => navigate(-1)}>← Back</button>

        <header className="fm-head">
          <h1 className="fm-title">Edit profile</h1>
          <p className="fm-sub">This is what people see before they hire you.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="fm-card">
            <h2 className="fm-card-title">Photo</h2>
            <div className="fm-avatar">
              <span className="fm-avatar-pic">
                {avatar
                  ? <img src={cldAvatar(avatar, 200)} alt="" />
                  : (form.username[0] || '?').toUpperCase()}
              </span>
              <label className="fm-avatar-btn">
                <input type="file" accept="image/*" hidden onChange={handleAvatar} />
                {avatarSaving ? 'Uploading…' : 'Change photo'}
              </label>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-card-title">Account</h2>

            <div className="fm-field">
              <label className="fm-label" htmlFor="ep-username">Username</label>
              <input id="ep-username" className="fm-input" placeholder="yourname"
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="ep-email">Email</label>
              <input id="ep-email" className="fm-input" type="email" placeholder="you@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="ep-headline">
                Headline <span className="fm-hint">one line, shown under your name</span>
              </label>
              <input id="ep-headline" className="fm-input" maxLength={120}
                placeholder="e.g. Designer · posters, decks, brand kits"
                value={form.headline}
                onChange={e => setForm({ ...form, headline: e.target.value })} />
              <span className="fm-counter">{form.headline.length}/120</span>
            </div>

            <div className="fm-field">
              <label className="fm-label" htmlFor="ep-bio">Bio</label>
              <textarea id="ep-bio" className="fm-input fm-textarea" rows={3}
                placeholder="A sentence or two about what you do and what you're looking for."
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>

            <div className="fm-row">
              <div className="fm-field">
                <label className="fm-label" htmlFor="ep-dob">Date of birth</label>
                <input id="ep-dob" className="fm-input" type="date"
                  value={form.dob}
                  onChange={e => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div className="fm-field">
                <label className="fm-label" htmlFor="ep-cat">Category</label>
                <select id="ep-cat" className="fm-input fm-select"
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Keep current</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-card-title">Password</h2>
            <div className="fm-row">
              <div className="fm-field">
                <label className="fm-label" htmlFor="ep-pw-now">Current password</label>
                <input id="ep-pw-now" className="fm-input" type="password"
                  autoComplete="current-password" placeholder="Your current password"
                  value={pwd.current}
                  onChange={e => setPwd({ ...pwd, current: e.target.value })} />
              </div>
              <div className="fm-field">
                <label className="fm-label" htmlFor="ep-pw-new">New password</label>
                <input id="ep-pw-new" className="fm-input" type="password"
                  autoComplete="new-password" placeholder="At least 8 characters"
                  value={pwd.next}
                  onChange={e => setPwd({ ...pwd, next: e.target.value })} />
              </div>
            </div>
            <button type="button"
              className={`fm-inline-btn ${pwdDone ? 'is-done' : ''}`}
              onClick={handleChangePassword} disabled={pwdSaving}>
              {pwdSaving ? 'Updating…' : pwdDone ? 'Updated ✓' : 'Update password'}
            </button>
          </section>

          <div className="fm-actions">
            <button type="button" className="fm-cancel" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="fm-submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
