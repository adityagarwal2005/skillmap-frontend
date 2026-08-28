import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Lazy-loaded routes — each page ships as its own chunk, so the app boots fast.
// lazyRetry: if a chunk fails to load (usually because a new build shipped and
// the old hashed chunk is gone), reload once to fetch the fresh build instead
// of leaving the user stuck on a blank screen. The 10s guard prevents a reload
// loop if it's a real, persistent failure.
const lazyRetry = (importer) => lazy(() =>
  importer().catch((err) => {
    const key = 'chunk-reload-at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
      return new Promise(() => {}); // keep Suspense pending until the reload
    }
    throw err;
  })
);

const LoginPage        = lazyRetry(() => import('./pages/LoginPage'));
const FeedPage         = lazyRetry(() => import('./pages/FeedPage'));
const PostPage         = lazyRetry(() => import('./pages/PostPage'));
const ProfilePage      = lazyRetry(() => import('./pages/ProfilePage'));
const CreatePostPage   = lazyRetry(() => import('./pages/CreatePostPage'));
const PostDetailPage   = lazyRetry(() => import('./pages/PostDetailPage'));
const PeoplePage       = lazyRetry(() => import('./pages/PeoplePage'));
const MessagesPage     = lazyRetry(() => import('./pages/MessagesPage'));
const NotificationsPage = lazyRetry(() => import('./pages/NotificationsPage'));
const SettingsPage     = lazyRetry(() => import('./pages/SettingsPage'));
const SearchPage       = lazyRetry(() => import('./pages/SearchPage'));
const OnboardingPage   = lazyRetry(() => import('./pages/OnboardingPage'));
const EditProfilePage  = lazyRetry(() => import('./pages/EditProfilePage'));
const ApplicationsPage = lazyRetry(() => import('./pages/ApplicationsPage'));
const ApplicantsPage   = lazyRetry(() => import('./pages/ApplicantsPage'));
const JoinPage         = lazyRetry(() => import('./pages/JoinPage'));
const LegalPage        = lazyRetry(() => import('./pages/LegalPage'));
const PublicProfilePage = lazyRetry(() => import('./pages/PublicProfilePage'));
const LandingPage       = lazyRetry(() => import('./pages/LandingPage'));
const ChooseUsernamePage = lazyRetry(() => import('./pages/ChooseUsernamePage'));

const Loader = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '12px',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', color: 'var(--text-2)',
    fontSize: '0.875rem',
  }}>
    <div style={{
      width: 24, height: 24,
      border: '2.5px solid var(--border-md, rgba(0,0,0,0.12))',
      borderTopColor: 'var(--text-2, #6e6e73)',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }} />
  </div>
);

// A brand-new Google sign-in lands with an auto-generated username (from
// their email) and user.needsUsername=true. Force every route except the
// picker itself (and a few always-public pages) through /choose-username
// until they've actually picked one.
function AuthGate({ user, children }) {
  const location = useLocation();
  const allowed = ['/choose-username', '/terms', '/privacy'];
  const isPublicProfile = location.pathname.startsWith('/u/');
  if (user?.needsUsername && !allowed.includes(location.pathname) && !isPublicProfile) {
    return <Navigate to="/choose-username" replace />;
  }
  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
        <AuthGate user={user}>
          <Routes>
            <Route path="/login"                    element={user ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/join/:username"           element={user ? <Navigate to="/" /> : <JoinPage />} />
            <Route path="/terms"                    element={<LegalPage />} />
            <Route path="/privacy"                  element={<LegalPage />} />
            <Route path="/u/:username"              element={<PublicProfilePage />} />
            <Route path="/choose-username"          element={user ? <ChooseUsernamePage /> : <Navigate to="/login" />} />
            <Route path="/onboarding"               element={user ? <OnboardingPage /> : <Navigate to="/login" />} />
            <Route path="/"                         element={user ? <FeedPage /> : <LandingPage />} />
            <Route path="/profile/:userId"          element={user ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/profile/:userId/edit"     element={user ? <EditProfilePage /> : <Navigate to="/login" />} />
            <Route path="/create-post"              element={user ? <CreatePostPage /> : <Navigate to="/login" />} />
            <Route path="/post"                     element={user ? <PostPage /> : <Navigate to="/login" />} />
            <Route path="/post/:itemId"             element={user ? <PostDetailPage /> : <Navigate to="/login" />} />
            <Route path="/people"                   element={user ? <PeoplePage /> : <Navigate to="/login" />} />
            {/* /freelance and /collab are gone — browsing both happens on
                Work (/), and posting/managing on Post (/post). Redirect any
                old links (or a bookmarked board) instead of 404-ing. */}
            <Route path="/freelance"                element={<Navigate to="/post" replace />} />
            <Route path="/collab"                   element={<Navigate to="/post" replace />} />
            <Route path="/messages"                 element={user ? <MessagesPage /> : <Navigate to="/login" />} />
            <Route path="/notifications"            element={user ? <NotificationsPage /> : <Navigate to="/login" />} />
            <Route path="/settings"                 element={user ? <SettingsPage /> : <Navigate to="/login" />} />
            <Route path="/search"                   element={user ? <SearchPage /> : <Navigate to="/login" />} />
            <Route path="/applications"             element={user ? <ApplicationsPage /> : <Navigate to="/login" />} />
            <Route path="/applicants/:kind/:id"     element={user ? <ApplicantsPage /> : <Navigate to="/login" />} />
            <Route path="*"                         element={<Navigate to={user ? "/" : "/login"} />} />
          </Routes>
        </AuthGate>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
