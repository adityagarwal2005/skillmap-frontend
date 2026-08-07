import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUser, editUser, getCategories, changePassword, uploadAvatar } from '../api/users';
import { prepareMediaFile } from '../utils/mediaUpload';
import AppShell from '../components/AppShell';
import { LinkedInIcon, GitHubIcon, InstagramIcon } from '../components/SocialIcons';
import { cldAvatar } from '../utils/cloudinaryUrl';
import './FeedPage.css';
import './EditProfilePage.css';

export default function EditProfilePage() {
  const { userId }                      = useParams();
  const { user: authUser, loginUser }   = useAuth();
  const { showToast }                   = useToast();
  const navigate                        = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', dob: '', headline: '', bio: '',
    category_id: '', linkedin_url: '', github_url: '', instagram_url: '', whatsapp: '',
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
          linkedin_url: u.linkedin_url || '',
          github_url:   u.github_url || '',
          instagram_url: u.instagram_url || '',
          whatsapp:     u.whatsapp || '',
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
      if (form.linkedin_url)  payload.linkedin_url  = form.linkedin_url;
      if (form.github_url)    payload.github_url    = form.github_url;
      if (form.instagram_url) payload.instagram_url = form.instagram_url;
      // Always send these so they can also be cleared.
      payload.whatsapp = form.whatsapp;
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
      <div className="edit-wrapper"><div className="edit-loading">Loading…</div></div>
    </AppShell>
  );

  const socials = [
    { key: 'linkedin_url',  label: 'LinkedIn',  brand: 'linkedin',  icon: LinkedInIcon,  placeholder: 'linkedin.com/in/username' },
    { key: 'github_url',    label: 'GitHub',    brand: 'github',    icon: GitHubIcon,    placeholder: 'github.com/username' },
    { key: 'instagram_url', label: 'Instagram', brand: 'instagram', icon: InstagramIcon, placeholder: 'instagram.com/username' },
  ];

  return (
    <AppShell active="profile">
      <div className="edit-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>

        <div className="edit-box">
          <header className="edit-head">
            <h1 className="edit-title">Edit profile</h1>
            <p className="edit-sub">Update your details and where people can find you.</p>
          </header>

          <form onSubmit={handleSubmit} className="edit-form">
            {/* Photo */}
            <section className="edit-section">
              <div className="edit-section-label">Photo</div>
              <div className="avatar-edit">
                <div className="avatar-edit-preview">
                  {avatar
                    ? <img src={cldAvatar(avatar, 160)} alt="avatar" />
                    : (form.username[0] || '?').toUpperCase()}
                </div>
                <label className="avatar-edit-btn">
                  <input type="file" accept="image/*" hidden onChange={handleAvatar} />
                  {avatarSaving ? 'Uploading…' : 'Change photo'}
                </label>
              </div>
            </section>

            {/* Account */}
            <section className="edit-section">
              <div className="edit-section-label">Account</div>

              <div className="edit-field">
                <label className="edit-label">Username</label>
                <input className="edit-input"
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="yourname" />
              </div>

              <div className="edit-field">
                <label className="edit-label">Email</label>
                <input className="edit-input" type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="you@email.com" />
              </div>

              <div className="edit-field">
                <label className="edit-label">Headline</label>
                <input className="edit-input" maxLength={120}
                  value={form.headline}
                  onChange={e => setForm({...form, headline: e.target.value})}
                  placeholder="e.g. 2nd-yr CSE · React & IoT" />
              </div>

              <div className="edit-field">
                <label className="edit-label">Bio</label>
                <textarea className="edit-input edit-textarea" rows={3}
                  value={form.bio}
                  onChange={e => setForm({...form, bio: e.target.value})}
                  placeholder="A sentence or two about what you do and what you're looking for." />
              </div>

              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Date of birth</label>
                  <input className="edit-input" type="date"
                    value={form.dob}
                    onChange={e => setForm({...form, dob: e.target.value})} />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Category</label>
                  <select className="edit-input edit-select"
                    value={form.category_id}
                    onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">Keep current</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Social & contact links */}
            <section className="edit-section">
              <div className="edit-section-label">Social &amp; contact</div>
              <p className="edit-section-hint">
                At least one of GitHub, LinkedIn, or Instagram is <strong>required</strong> to
                post or accept work — it's how people verify who they're dealing with.
              </p>

              {socials.map(s => (
                <div className="edit-field" key={s.key}>
                  <label className="edit-label">{s.label}</label>
                  <div className="edit-input-group">
                    <span className={`edit-input-icon ${s.brand}`}>{s.icon}</span>
                    <input className="edit-input has-icon" type="url"
                      value={form[s.key]}
                      onChange={e => setForm({...form, [s.key]: e.target.value})}
                      placeholder={s.placeholder} />
                  </div>
                </div>
              ))}

              <div className="edit-field">
                <label className="edit-label">WhatsApp number</label>
                <input className="edit-input" type="tel"
                  value={form.whatsapp}
                  onChange={e => setForm({...form, whatsapp: e.target.value})}
                  placeholder="e.g. 919876543210 (with country code)" />
              </div>
            </section>

            {/* Password */}
            <section className="edit-section">
              <div className="edit-section-label">Password</div>
              <p className="edit-section-hint">Enter your current password, then a new one.</p>
              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Current password</label>
                  <input className="edit-input" type="password"
                    value={pwd.current}
                    onChange={e => setPwd({...pwd, current: e.target.value})}
                    placeholder="••••••••" />
                </div>
                <div className="edit-field">
                  <label className="edit-label">New password</label>
                  <input className="edit-input" type="password"
                    value={pwd.next}
                    onChange={e => setPwd({...pwd, next: e.target.value})}
                    placeholder="At least 8 characters" />
                </div>
              </div>
              <button type="button"
                className={`pwd-update-btn ${pwdDone ? 'is-done' : ''}`}
                onClick={handleChangePassword} disabled={pwdSaving}>
                {pwdSaving ? 'Updating…' : pwdDone ? 'Updated ✓' : 'Update password'}
              </button>
            </section>

            <div className="edit-actions">
              <button type="button" className="create-cancel" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="create-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}