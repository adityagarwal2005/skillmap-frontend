import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../api/notifications';
import { getUser } from '../api/users';
import { cldAvatar } from '../utils/cloudinaryUrl';
import useInstallPrompt from '../hooks/useInstallPrompt';
import usePageMeta from '../hooks/usePageMeta';
import { pushSupported, isPushEnabled, enablePush } from '../push';
import '../pages/FeedPage.css';

const SVG = {
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  sun:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

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
    { id: 'freelance', label: 'Freelance', path: '/freelance', icon: I.freelance },
    { id: 'collab',    label: 'Collab',    path: '/collab',    icon: I.collab },
    { id: 'messages',  label: 'Messages',  path: '/messages',  icon: I.messages },
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
  if (pathname.startsWith('/freelance'))     return 'work';
  if (pathname.startsWith('/collab'))        return 'work';
  if (pathname.startsWith('/messages'))      return 'messages';
  if (pathname.startsWith('/profile'))       return 'profile';
  if (pathname.startsWith('/applications'))  return 'applications';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/settings'))      return 'settings';
  return '';
}

/**
 * Shared application chrome: dark frosted topbar + dark editorial nav rail +
 * signature robot. Every authenticated page renders its content as children,
 * which float as a steel panel on the dark chrome.
 *
 * Props:
 *   active        override the highlighted nav item (else derived from URL)
 *   searchValue   controlled value for the topbar search (optional)
 *   onSearchChange(value)  controlled onChange (optional)
 *   onSearchSubmit(e)      controlled submit (optional; default navigates to /search)
 */
export default function AppShell({
  children,
  active,
  robot = false,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Every page rendered through AppShell requires a logged-in session, so
  // none of it should turn up in Google — it's personalized, gated, and
  // meaningless to a crawler that can't authenticate. The public pages
  // (Landing, public profile, legal) don't use AppShell and set their own
  // indexable meta via the same hook.
  usePageMeta({ noindex: true });

  const [theme, setTheme] = useState(localStorage.getItem('themeV2') || 'dark');
  const [unread, setUnread] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [q, setQ] = useState('');
  const [profile, setProfile] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () => localStorage.getItem('smNudgeDismissed') === '1'
  );
  const [showPostSheet, setShowPostSheet] = useState(false);
  const [showWorkSheet, setShowWorkSheet] = useState(false);
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
      getUser(user.id).then(r => {
        setAvatar(r.data.profile_image || null);
        setAvatarBroken(false);
        setProfile(r.data);
      }).catch(() => {});
    }
  }, [user?.id]);

  // Poll the unread count so the bell badge updates without a page refresh.
  useEffect(() => {
    const refresh = () => getUnreadCount().then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

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
    if (item.id === 'create') { setShowPostSheet(true); return; }
    if (item.path) navigate(item.path);
  };

  const choosePost = (path) => {
    setShowPostSheet(false);
    navigate(path);
  };

  const chooseWork = (path) => {
    setShowWorkSheet(false);
    navigate(path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) { onSearchSubmit(e); return; }
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const searchVal = searchValue !== undefined ? searchValue : q;
  const handleSearchChange = (e) =>
    onSearchChange ? onSearchChange(e.target.value) : setQ(e.target.value);

  return (
    <div className="app-shell">
      {/* Minimal top bar — just the wordmark + a notifications bell. Search,
          theme, avatar, sign-out were removed per the CUFood-minimal direction;
          those live in Profile/Settings now. */}
      <header className="topbar topbar-minimal">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <img className="topbar-icon" src="/icon-192.png" alt="" />
          <span className="topbar-name">DoitHere</span>
        </div>

        <div className="topbar-right">
          <button className="topbar-btn topbar-bell" aria-label="Notifications"
            onClick={() => navigate('/notifications')}>
            {I.notifications}
            {unread > 0 && <span className="topbar-bell-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
        </div>
      </header>

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
          <button className="sidebar-post-btn" onClick={() => setShowPostSheet(true)}>
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

      {showPostSheet && (
        <div className="post-sheet-overlay" onClick={() => setShowPostSheet(false)}>
          <div className="post-sheet" onClick={e => e.stopPropagation()}>
            <div className="post-sheet-grip" />
            <h2 className="post-sheet-title">What do you want to post?</h2>
            <p className="post-sheet-sub">Pick where this goes.</p>

            <button className="post-option" onClick={() => choosePost('/freelance?new=1')}>
              <span className="post-option-ic">{I.freelance}</span>
              <span className="post-option-text">
                <span className="post-option-name">Post a freelance job</span>
                <span className="post-option-desc">Hire someone for paid work</span>
              </span>
              <span className="post-option-arrow">→</span>
            </button>

            <button className="post-option" onClick={() => choosePost('/collab?new=1')}>
              <span className="post-option-ic">{I.collab}</span>
              <span className="post-option-text">
                <span className="post-option-name">Start a collab</span>
                <span className="post-option-desc">Find teammates to build something together</span>
              </span>
              <span className="post-option-arrow">→</span>
            </button>

            <button className="post-sheet-cancel" onClick={() => setShowPostSheet(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showWorkSheet && (
        <div className="post-sheet-overlay" onClick={() => setShowWorkSheet(false)}>
          <div className="post-sheet" onClick={e => e.stopPropagation()}>
            <div className="post-sheet-grip" />
            <h2 className="post-sheet-title">Work</h2>
            <p className="post-sheet-sub">Browse paid gigs or find collaborators.</p>

            <button className="post-option" onClick={() => chooseWork('/freelance')}>
              <span className="post-option-ic">{I.freelance}</span>
              <span className="post-option-text">
                <span className="post-option-name">Freelance</span>
                <span className="post-option-desc">Paid jobs from people on campus</span>
              </span>
              <span className="post-option-arrow">→</span>
            </button>

            <button className="post-option" onClick={() => chooseWork('/collab')}>
              <span className="post-option-ic">{I.collab}</span>
              <span className="post-option-text">
                <span className="post-option-name">Collab</span>
                <span className="post-option-desc">Team up on something together</span>
              </span>
              <span className="post-option-arrow">→</span>
            </button>

            <button className="post-sheet-cancel" onClick={() => setShowWorkSheet(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
