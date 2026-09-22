import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  deleteUser, updateStatus, getBlockedUsers, unblockUser, getMyReferrals, getUser,
} from '../api/users';
import { pushSupported, isPushEnabled, enablePush, disablePush } from '../push';
import AppShell from '../components/AppShell';
import { cldAvatar } from '../utils/cloudinaryUrl';
import useInstallPrompt from '../hooks/useInstallPrompt';
import './FeedPage.css';
import './SettingsPage.css';

const ic = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const IC = {
  gift:   ic(<><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path d="M12 9S9.5 4 7.5 5s.5 4 4.5 4zM12 9s2.5-5 4.5-4-.5 4-4.5 4z" /></>),
  user:   ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>),
  bell:   ic(<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  wallet: ic(<><rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M2.5 10.5h19M16 15h2" /></>),
  moon:   ic(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  shield: ic(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  doc:    ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>),
  phone:  ic(<><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>),
  danger: ic(<><path d="M12 9v5M12 17.5h.01" /><path d="M10.3 3.9 2.6 17.1A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z" /></>),
};

const STATUSES = [
  { value: 'open_to_freelance', label: 'Taking gigs' },
  { value: 'open_to_work',      label: 'Open to work' },
  { value: 'not_available',     label: 'Not available' },
];

function Section({ icon, title, children }) {
  return (
    <section className="st-card">
      <h2 className="st-card-title"><span className="st-card-ic">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, sub, children }) {
  return (
    <div className="st-row">
      <div className="st-row-text">
        <span className="st-row-label">{label}</span>
        {sub && <span className="st-row-sub">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, busy, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`st-toggle ${on ? 'is-on' : ''}`} disabled={busy} onClick={onChange}>
      <span className="st-toggle-dot" />
    </button>
  );
}

export default function SettingsPage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [theme, setTheme]       = useState(localStorage.getItem('themeV2') || 'dark');
  const [status, setStatus]     = useState(null);   // null until the real one loads
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  useEffect(() => { isPushEnabled().then(setPushOn).catch(() => {}); }, []);

  useEffect(() => {
    getMyReferrals().then(r => setReferrals(r.data.referrals || [])).catch(() => {});
  }, []);

  // The control used to open on "Not available" whatever the account
  // actually said, so it read as a setting that had reset itself.
  useEffect(() => {
    if (!user?.id) return;
    getUser(user.id).then(r => setStatus(r.data.status || 'not_available')).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    getBlockedUsers().then(r => setBlockedUsers(r.data.blocked_users || [])).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('themeV2', theme);
  }, [theme]);

  const inviteLink = `${window.location.origin}/join/${user?.username || ''}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      showToast('Invite link copied!', 'success');
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on DoitHere', url: inviteLink }); } catch {}
      return;
    }
    handleCopyInvite();
  };

  const handleTogglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        showToast('Push notifications turned off', 'success');
      } else {
        await enablePush();
        setPushOn(true);
        showToast('Push notifications on — we’ll ping you even when the app is closed', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Could not change push setting', 'error');
    } finally { setPushBusy(false); }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      await unblockUser(blockedUserId);
      setBlockedUsers(prev => prev.filter(b => b.id !== blockedUserId));
      showToast('Unblocked', 'success');
    } catch { showToast('Failed to unblock', 'error'); }
  };

  const pickStatus = async (val) => {
    const previous = status;
    setStatus(val);
    try {
      await updateStatus(val);
      showToast('Availability updated', 'success');
    } catch {
      setStatus(previous);
      showToast('Failed to update availability', 'error');
    }
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
      <div className="st-wrap">
        <button className="st-back" onClick={() => navigate(-1)}>← Back</button>
        <header className="st-head">
          <h1 className="st-title">Settings</h1>
          <p className="st-sub">Your account, what people can see, and how DoitHere reaches you.</p>
        </header>

        <Section icon={IC.gift} title="Invite friends">
          <p className="st-note">
            The network is only as good as who's on it. Share your link — anyone who joins
            with it shows up here.
          </p>
          <div className="st-invite">
            <input className="st-invite-link" readOnly value={inviteLink}
              aria-label="Your invite link" onFocus={e => e.target.select()} />
            <button type="button" className="st-btn is-primary" onClick={handleCopyInvite}>
              {copiedInvite ? 'Copied ✓' : 'Copy'}
            </button>
            <button type="button" className="st-btn" onClick={handleShareInvite}>Share</button>
          </div>
          {referrals.length > 0 && (
            <div className="st-referrals">
              <span className="st-referrals-count">
                {referrals.length} {referrals.length === 1 ? 'person' : 'people'} joined with your link
              </span>
              <div className="st-referral-avas">
                {referrals.slice(0, 8).map(r => (
                  <button type="button" key={r.id} className="st-referral-ava" title={r.username}
                    onClick={() => navigate(`/profile/${r.id}`)}>
                    {r.profile_image
                      ? <img className="ava-img" src={cldAvatar(r.profile_image)} alt="" />
                      : r.username[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section icon={IC.wallet} title="Availability">
          <Row label="Are you taking work?"
            sub="Shown on your profile and next to your name." />
          <div className="st-choices" role="radiogroup" aria-label="Availability">
            {STATUSES.map(s => (
              <button key={s.value} type="button" role="radio"
                aria-checked={status === s.value}
                className={`st-choice ${status === s.value ? 'is-on' : ''}`}
                disabled={status === null}
                onClick={() => pickStatus(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={IC.user} title="Profile & account">
          <Row label="Edit profile" sub="Name, email, date of birth, password">
            <button type="button" className="st-btn"
              onClick={() => navigate(`/profile/${user.id}/edit`)}>Edit</button>
          </Row>
          <Row label="Sign out" sub="On this device only">
            <button type="button" className="st-btn"
              onClick={() => { logoutUser(); navigate('/login'); }}>Sign out</button>
          </Row>
        </Section>

        {pushSupported() && (
          <Section icon={IC.bell} title="Notifications">
            <Row label="Push notifications"
              sub="Messages, applications and new work nearby — even when the app is closed.">
              <Toggle on={pushOn} busy={pushBusy} onChange={handleTogglePush}
                label="Push notifications" />
            </Row>
          </Section>
        )}

        {(canInstall || installed) && (
          <Section icon={IC.phone} title="App">
            <Row label="Install DoitHere"
              sub={installed ? 'Already installed on this device' : 'Full screen, and faster to open'}>
              {!installed && (
                <button type="button" className="st-btn is-primary" onClick={promptInstall}>Install</button>
              )}
            </Row>
          </Section>
        )}

        <Section icon={IC.moon} title="Appearance">
          <Row label="Theme" sub="Light or dark, on this device." />
          <div className="st-choices" role="radiogroup" aria-label="Theme">
            {['light', 'dark'].map(t => (
              <button key={t} type="button" role="radio" aria-checked={theme === t}
                className={`st-choice ${theme === t ? 'is-on' : ''}`}
                onClick={() => setTheme(t)}>
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={IC.shield} title="Privacy & safety">
          {blockedUsers.length === 0 ? (
            <Row label="Blocked people" sub="You haven't blocked anyone." />
          ) : (
            blockedUsers.map(b => (
              <Row key={b.id} label={b.username} sub="Blocked">
                <button type="button" className="st-btn" onClick={() => handleUnblock(b.id)}>
                  Unblock
                </button>
              </Row>
            ))
          )}
        </Section>

        <Section icon={IC.doc} title="Legal">
          <Row label="Terms of Service">
            <button type="button" className="st-btn" onClick={() => navigate('/terms')}>View</button>
          </Row>
          <Row label="Privacy Policy">
            <button type="button" className="st-btn" onClick={() => navigate('/privacy')}>View</button>
          </Row>
        </Section>

        <section className="st-card is-danger">
          <h2 className="st-card-title"><span className="st-card-ic">{IC.danger}</span>Danger zone</h2>
          {!confirmDelete ? (
            <Row label="Delete account" sub="Your profile, posts, messages and reviews. Permanent.">
              <button type="button" className="st-btn is-danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </Row>
          ) : (
            <div className="st-confirm">
              <p className="st-confirm-text">
                This deletes everything and can't be undone. Are you sure?
              </p>
              <div className="st-confirm-actions">
                <button type="button" className="st-btn" onClick={() => setConfirmDelete(false)}>
                  Keep my account
                </button>
                <button type="button" className="st-btn is-danger-solid" onClick={handleDeleteAccount}>
                  Yes, delete it
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
