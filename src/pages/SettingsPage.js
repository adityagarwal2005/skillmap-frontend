import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { deleteUser, updateStatus, getBlockedUsers, unblockUser } from '../api/users';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [theme, setTheme]       = useState(localStorage.getItem('theme') || 'light');
  const [status, setStatus]     = useState('not_available');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    getBlockedUsers().then(r => setBlockedUsers(r.data.blocked_users || [])).catch(() => {});
  }, []);

  const handleUnblock = async (blockedUserId) => {
    try {
      await unblockUser(blockedUserId);
      setBlockedUsers(prev => prev.filter(b => b.id !== blockedUserId));
      showToast('Unblocked', 'success');
    } catch { showToast('Failed to unblock', 'error'); }
  };

  const handleStatusChange = async e => {
    const val = e.target.value;
    setStatus(val);
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
    <AppShell active="settings">
      <div className="settings-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="settings-title">Settings</h1>

        {/* Profile & account — everything editable lives on one page now */}
        <div className="settings-section">
          <h2 className="settings-section-title">Profile & account</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Edit profile</span>
              <span className="settings-row-sub">Name, email, date of birth, password, and social links</span>
            </div>
            <button className="settings-save-btn"
              onClick={() => navigate(`/profile/${user.id}/edit`)}>
              Edit →
            </button>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Sign out</span>
              <span className="settings-row-sub">Sign out of SkillMap on this device</span>
            </div>
            <button className="settings-save-btn" onClick={() => { logoutUser(); navigate('/login'); }}>
              Sign out
            </button>
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
            <select className="settings-select" value={status} onChange={handleStatusChange}>
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

        {/* Privacy & Safety */}
        <div className="settings-section">
          <h2 className="settings-section-title">Privacy & safety</h2>
          {blockedUsers.length === 0 ? (
            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-label">Blocked users</span>
                <span className="settings-row-sub">You haven't blocked anyone</span>
              </div>
            </div>
          ) : (
            blockedUsers.map(b => (
              <div className="settings-row" key={b.id}>
                <div className="settings-row-info">
                  <span className="settings-row-label">{b.username}</span>
                  <span className="settings-row-sub">Blocked</span>
                </div>
                <button className="settings-save-btn" onClick={() => handleUnblock(b.id)}>
                  Unblock
                </button>
              </div>
            ))
          )}
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
    </AppShell>
  );
}
