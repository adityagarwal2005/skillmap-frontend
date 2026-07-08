import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUser, editUser, getCategories, changePassword } from '../api/users';
import AppShell from '../components/AppShell';
import { LinkedInIcon, GitHubIcon, InstagramIcon } from '../components/SocialIcons';
import './FeedPage.css';
import './EditProfilePage.css';

export default function EditProfilePage() {
  const { userId }                      = useParams();
  const { user: authUser, loginUser }   = useAuth();
  const { showToast }                   = useToast();
  const navigate                        = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', dob: '',
    category_id: '', linkedin_url: '', github_url: '', instagram_url: '',
  });
  const [pwd, setPwd]               = useState({ current: '', next: '' });
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdDone, setPwdDone]       = useState(false);
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
          category_id:  '',
          linkedin_url: u.linkedin_url || '',
          github_url:   u.github_url || '',
          instagram_url: u.instagram_url || '',
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
      if (form.dob)          payload.dob          = form.dob;
      if (form.category_id)  payload.category_id  = form.category_id;
      if (form.linkedin_url)  payload.linkedin_url  = form.linkedin_url;
      if (form.github_url)    payload.github_url    = form.github_url;
      if (form.instagram_url) payload.instagram_url = form.instagram_url;

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

            {/* Social links */}
            <section className="edit-section">
              <div className="edit-section-label">Social links</div>
              <p className="edit-section-hint">These show up as clickable cards on your profile — how people get to know you.</p>

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
                    placeholder="At least 6 characters" />
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