import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../api/notifications';
import { getUser } from '../api/users';
import useInstallPrompt from '../hooks/useInstallPrompt';
import usePageMeta from '../hooks/usePageMeta';
import usePoll from '../hooks/usePoll';
import { pushSupported, isPushEnabled, enablePush } from '../push';
import '../pages/FeedPage.css';

const svg = (children) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const I = {
  home:          svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>),
  people:        svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /><path d="M17.5 20a5.2 5.2 0 0 0-2.3-4.3" /></>),
  freelance:     svg(<><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8 7.5V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12.5h18" /></>),
  collab:        svg(<><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z" /><path d="M3 12.5l9 4.5 9-4.5" /><path d="M3 17l9 4.5 9-4.5" /></>),
  messages:      svg(<path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.5A8 8 0 1 1 21 11.5z" />),
  profile:       svg(<><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>),
  notifications: svg(<><path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14.5 18 8.5z" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  settings:      svg(<><line x1="4" y1="21" x2="4" y2="13" /><line x1="4" y1="9" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="15" /><line x1="20" y1="11" x2="20" y2="3" /><line x1="1.5" y1="13" x2="6.5" y2="13" /><line x1="9.5" y1="8" x2="14.5" y2="8" /><line x1="17.5" y1="15" x2="22.5" y2="15" /></>),
  create:        svg(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
  applications:  svg(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 14l2 2 4-4" /></>),
};

const NAV = [
  { group: 'Discover', items: [
    { id: 'home',    label: 'Home',    path: '/',       icon: I.home },
    { id: 'people',  label: 'People',  path: '/people', icon: I.people },
  ]},
  { group: 'Work', items: [
    // Freelance/Collab no longer have their own board pages — browsing both
    // happens on Work (/), and posting/managing on Post (/post).
    { id: 'post',     label: 'Post',     path: '/post',     icon: I.create },
    { id: 'messages', label: 'Messages', path: '/messages', icon: I.messages },
  ]},
  { group: 'You', items: [
    { id: 'profile',       label: 'Profile',       path: null,             icon: I.profile },
    { id: 'applications',  label: 'Applications',  path: '/applications',  icon: I.applications },
    { id: 'notifications', label: 'Notifications', path: '/notifications', icon: I.notifications },
    { id: 'settings',      label: 'Settings',      path: '/settings',      icon: I.settings },
  ]},
];

// Minimal 4-tab bottom nav (CUFood-style): Work (browse freelance + collab),
// Post (new post + my listings), Messages, Profile. Everything else (search,
// people, notifications, settings) is deferred — surfaced later once there's
// enough volume to need it.
const MOBILE = [
  { id: 'work',     label: 'Work',     path: '/',         icon: I.freelance },
  { id: 'post',     label: 'Post',     path: '/post',     icon: I.create },
  { id: 'messages', label: 'Messages', path: '/messages', icon: I.messages },
  { id: 'profile',  label: 'Profile',  path: null,        icon: I.profile },
];

function deriveActive(pathname) {
  if (pathname === '/') return 'work';
  if (pathname.startsWith('/post'))          return 'post';
  if (pathname.startsWith('/search'))        return 'search';
  if (pathname.startsWith('/people'))        return 'people';
  if (pathname.startsWith('/messages'))      return 'messages';
  if (pathname.startsWith('/profile'))       return 'profile';
  if (pathname.startsWith('/applications'))  return 'applications';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/settings'))      return 'settings';
  return '';
}

/**
 * Shared application chrome: desktop nav rail + mobile bottom tab bar. Every
 * authenticated page renders its content as children. There's no topbar —
 * each page owns its own header row (title + <NotificationBell/>).
 *
 * Props:
 *   active   override the highlighted nav item (else derived from URL)
 *   robot    show the decorative hero robot (Work page only)
 */
export default function AppShell({
  children,
  active,
  robot = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Every page rendered through AppShell requires a logged-in session, so
  // none of it should turn up in Google — it's personalized, gated, and
  // meaningless to a crawler that can't authenticate. The public pages
  // (Landing, public profile, legal) don't use AppShell and set their own
  // indexable meta via the same hook.
  usePageMeta({ noindex: true });

  // Read-only now — the theme toggle lived in the old topbar; this just
  // re-applies whatever was last stored (Settings still writes it).
  const [theme] = useState(localStorage.getItem('themeV2') || 'dark');
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () => localStorage.getItem('smNudgeDismissed') === '1'
  );
  const { canInstall, promptInstall } = useInstallPrompt();
  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem('smInstallDismissed') === '1'
  );
  const [pushPromptDismissed, setPushPromptDismissed] = useState(
    () => localStorage.getItem('smPushDismissed') === '1'
  );
  const [pushAlreadyOn, setPushAlreadyOn] = useState(true);
  const [pushEnabling, setPushEnabling] = useState(false);
  // FeedPage's first-login welcome modal covers this same top-of-page area —
  // without this the two rendered stacked on top of each other, illegibly.
  const [welcomePending, setWelcomePending] = useState(
    () => localStorage.getItem('smWelcomeSeen') !== '1'
  );

  useEffect(() => {
    const onWelcomeDismissed = () => setWelcomePending(false);
    window.addEventListener('sm:welcome-dismissed', onWelcomeDismissed);
    return () => window.removeEventListener('sm:welcome-dismissed', onWelcomeDismissed);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('themeV2', theme);
  }, [theme]);

  useEffect(() => {
    if (user?.id) {
      getUser(user.id).then(r => setProfile(r.data)).catch(() => {});
    }
  }, [user?.id]);

  // Desktop sidebar badge only — <NotificationBell/> fetches the same count
  // for its own badge, so this deliberately runs slowly to avoid doubling
  // the request rate on an endpoint every screen already hits.
  const refreshUnread = () =>
    getUnreadCount().then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
  useEffect(() => { refreshUnread(); }, []);
  usePoll(refreshUnread, 60000);

  const activeId = active || deriveActive(location.pathname);

  // "Finish your profile" nudge — surfaces for anyone missing a category,
  // skills, or a photo (e.g. users whose category was cleared in the campus
  // migration). Hidden while they're actually editing, and dismissible.
  const missing = profile ? [
    !profile.category ? 'a category' : null,
    (profile.skills || []).length === 0 ? 'skills' : null,
    !profile.profile_image ? 'a photo' : null,
  ].filter(Boolean) : [];
  const onEditFlow = location.pathname.includes('/edit') ||
                     location.pathname.startsWith('/onboarding');
  // The welcome modal only ever renders on the feed route ('/'), so only
  // suppress the nudge there — no reason to hold it back on other pages.
  const welcomeShowing = location.pathname === '/' && welcomePending;
  const showNudge = missing.length > 0 && !nudgeDismissed && !onEditFlow && !welcomeShowing;

  const dismissNudge = () => {
    setNudgeDismissed(true);
    localStorage.setItem('smNudgeDismissed', '1');
  };

  // Only one dismissible banner at a time — the profile-completion nudge
  // takes priority since it's about actually using the product.
  const showInstallBanner = canInstall && !installDismissed && !showNudge && !welcomeShowing;

  const dismissInstall = () => {
    setInstallDismissed(true);
    localStorage.setItem('smInstallDismissed', '1');
  };

  const handleInstallClick = async () => { await promptInstall(); };

  useEffect(() => {
    if (pushSupported()) isPushEnabled().then(on => setPushAlreadyOn(on)).catch(() => {});
    else setPushAlreadyOn(true);
  }, []);

  const showPushPrompt = pushSupported() && !pushAlreadyOn && !pushPromptDismissed
    && !showNudge && !showInstallBanner && !welcomeShowing;

  const dismissPush = () => {
    setPushPromptDismissed(true);
    localStorage.setItem('smPushDismissed', '1');
  };

  const handleEnablePush = async () => {
    setPushEnabling(true);
    try {
      await enablePush();
      setPushAlreadyOn(true);
    } catch { /* permission denied or unsupported — just dismiss */ }
    finally { setPushEnabling(false); dismissPush(); }
  };

  const missingText = missing.length === 1
    ? missing[0]
    : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;

  const handleNav = (item) => {
    if (item.id === 'profile') { navigate(`/profile/${user?.id}`); return; }
    if (item.path) navigate(item.path);
  };

  return (
    <div className="app-shell">
      {/* No top bar — the notification bell now lives inline in each page's
          own header row (see <NotificationBell/>), so it lines up with the
          page title instead of floating over content. */}
      <div className="app-body">
        <nav className="sidebar">
          {NAV.map(group => (
            <div className="sidebar-group" key={group.group}>
              <div className="sidebar-group-label">{group.group}</div>
              {group.items.map(item => (
                <button key={item.id}
                  className={`sidebar-link ${activeId === item.id ? 'active' : ''}`}
                  onClick={() => handleNav(item)}>
                  <span className="sidebar-link-ic">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                  {item.id === 'notifications' && unread > 0 && (
                    <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <button className="sidebar-post-btn" onClick={() => navigate('/post')}>
            + Post work
          </button>
        </nav>

        <main className="app-main">
          {showNudge && (
            <div className="profile-nudge">
              <div className="profile-nudge-text">
                <strong>Complete your profile</strong>
                <span>Add {missingText} so people can find and reach you.</span>
              </div>
              <div className="profile-nudge-actions">
                <button className="profile-nudge-cta"
                  onClick={() => navigate(`/profile/${user?.id}/edit`)}>
                  Finish now
                </button>
                <button className="profile-nudge-x" onClick={dismissNudge}
                  aria-label="Dismiss">×</button>
              </div>
            </div>
          )}
          {showInstallBanner && (
            <div className="profile-nudge">
              <div className="profile-nudge-text">
                <strong>Install DoitHere</strong>
                <span>Add it to your home screen for a faster, full-screen experience.</span>
              </div>
              <div className="profile-nudge-actions">
                <button className="profile-nudge-cta" onClick={handleInstallClick}>
                  Install
                </button>
                <button className="profile-nudge-x" onClick={dismissInstall}
                  aria-label="Dismiss">×</button>
              </div>
            </div>
          )}
          {showPushPrompt && (
            <div className="profile-nudge">
              <div className="profile-nudge-text">
                <strong>Turn on notifications</strong>
                <span>Get notified about messages, job matches, and collab invites — even when the app is closed.</span>
              </div>
              <div className="profile-nudge-actions">
                <button className="profile-nudge-cta" onClick={handleEnablePush}
                  disabled={pushEnabling}>
                  {pushEnabling ? 'Enabling…' : 'Enable'}
                </button>
                <button className="profile-nudge-x" onClick={dismissPush}
                  aria-label="Dismiss">×</button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only (CSS hides it on desktop) */}
      <nav className="mobile-nav">
        {MOBILE.map(item => {
          const isActive = activeId === item.id;
          return (
            <button key={item.id}
              className={`mobile-nav-btn ${isActive ? 'active' : ''} ${item.id === 'post' ? 'is-create' : ''}`}
              onClick={() => handleNav(item)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {robot && (
        <img className="feed-robot" src="/robot.png" alt="" aria-hidden="true"
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      )}

    </div>
  );
}
