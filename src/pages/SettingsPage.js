import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { editUser, deleteUser, updateStatus } from '../api/users';
import './FeedPage.css';
import './SettingsPage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function SettingsPage() {
  const { user, logoutUser, loginUser } = useAuth();
  const { showToast }                   = useToast();
  const navigate                        = useNavigate();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [saving, setSaving] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [fields, setFields] = useState({
    username:     user?.username || '',
    email:        '',
    password:     '',
    linkedin_url: '',
    github_url:   '',
    status:       'not_available',
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const saveField = async (fieldName, value) => {
    if (!value.trim()) return;
    try {
      setSaving(s => ({ ...s, [fieldName]: true }));
      await editUser(user.id, { [fieldName]: value });
      showToast(`${fieldName.replace('_', ' ')} updated`, 'success');
      if (fieldName === 'username') {
        loginUser({ ...user, username: value },
          localStorage.getItem('access_token'),
          localStorage.getItem('refresh_token'));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(s => ({ ...s, [fieldName]: false }));
    }
  };

  const handleStatusChange = async e => {
    const val = e.target.value;
    setFields(f => ({ ...f, status: val }));
    try {
      await updateStatus(val);
      showToast('Status updated', 'success');
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user.id);
      logoutUser();
      navigate('/login');
    } catch { showToast('Failed to delete account', 'error'); }
  };

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
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="settings-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="settings-title">Settings</h1>

        {/* Account */}
        <div className="settings-section">
          <h2 className="settings-section-title">Account</h2>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Username</span>
              <span className="settings-row-sub">Change your display name</span>
            </div>
            <div className="settings-row-action">
              <input className="settings-input"
                value={fields.username}
                onChange={e => setFields(f => ({ ...f, username: e.target.value }))}
                placeholder="Username" />
              <button className="settings-save-btn"
                onClick={() => saveField('username', fields.username)}
                disabled={saving.username}>
                {saving.username ? '...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Email</span>
              <span className="settings-row-sub">Update your email address</span>
            </div>
            <div className="settings-row-action">
              <input className="settings-input" type="email"
                value={fields.email}
                onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
                placeholder="new@email.com" />
              <button className="settings-save-btn"
                onClick={() => saveField('email', fields.email)}
                disabled={saving.email}>
                {saving.email ? '...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Password</span>
              <span className="settings-row-sub">Set a new password</span>
            </div>
            <div className="settings-row-action">
              <input className="settings-input" type="password"
                value={fields.password}
                onChange={e => setFields(f => ({ ...f, password: e.target.value }))}
                placeholder="New password" />
              <button className="settings-save-btn"
                onClick={() => saveField('password', fields.password)}
                disabled={saving.password}>
                {saving.password ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Links */}
        <div className="settings-section">
          <h2 className="settings-section-title">Profile Links</h2>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">LinkedIn</span>
              <span className="settings-row-sub">Your LinkedIn profile URL</span>
            </div>
            <div className="settings-row-action">
              <input className="settings-input" type="url"
                value={fields.linkedin_url}
                onChange={e => setFields(f => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..." />
              <button className="settings-save-btn"
                onClick={() => saveField('linkedin_url', fields.linkedin_url)}
                disabled={saving.linkedin_url}>
                {saving.linkedin_url ? '...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">GitHub</span>
              <span className="settings-row-sub">Your GitHub profile URL</span>
            </div>
            <div className="settings-row-action">
              <input className="settings-input" type="url"
                value={fields.github_url}
                onChange={e => setFields(f => ({ ...f, github_url: e.target.value }))}
                placeholder="https://github.com/..." />
              <button className="settings-save-btn"
                onClick={() => saveField('github_url', fields.github_url)}
                disabled={saving.github_url}>
                {saving.github_url ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="settings-section">
          <h2 className="settings-section-title">Availability</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Status</span>
              <span className="settings-row-sub">Let people know if you're available</span>
            </div>
            <select className="settings-select"
              value={fields.status} onChange={handleStatusChange}>
              <option value="not_available">Not Available</option>
              <option value="open_to_freelance">Open to Freelance</option>
              <option value="open_to_work">Open to Work</option>
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Theme</span>
              <span className="settings-row-sub">Choose your preferred theme</span>
            </div>
            <div className="theme-toggle-row">
              <button className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}>Light</button>
              <button className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}>Dark</button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <h2 className="settings-section-title danger-title">Danger Zone</h2>
          {!confirmDelete ? (
            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-label">Delete Account</span>
                <span className="settings-row-sub">Permanently delete your account and all data</span>
              </div>
              <button className="delete-btn" onClick={() => setConfirmDelete(true)}>
                Delete Account
              </button>
            </div>
          ) : (
            <div className="delete-confirm">
              <p className="delete-confirm-text">Are you sure? This cannot be undone.</p>
              <div className="delete-confirm-actions">
                <button className="create-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="delete-btn-confirm" onClick={handleDeleteAccount}>
                  Yes, delete my account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}