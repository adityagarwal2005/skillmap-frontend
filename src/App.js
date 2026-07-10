import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';

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
const ProfilePage      = lazyRetry(() => import('./pages/ProfilePage'));
const CreatePostPage   = lazyRetry(() => import('./pages/CreatePostPage'));
const PostDetailPage   = lazyRetry(() => import('./pages/PostDetailPage'));
const PeoplePage       = lazyRetry(() => import('./pages/PeoplePage'));
const FreelancePage    = lazyRetry(() => import('./pages/FreelancePage'));
const CollabPage       = lazyRetry(() => import('./pages/CollabPage'));
const MessagesPage     = lazyRetry(() => import('./pages/MessagesPage'));
const NotificationsPage = lazyRetry(() => import('./pages/NotificationsPage'));
const SettingsPage     = lazyRetry(() => import('./pages/SettingsPage'));
const SearchPage       = lazyRetry(() => import('./pages/SearchPage'));
const OnboardingPage   = lazyRetry(() => import('./pages/OnboardingPage'));
const EditProfilePage  = lazyRetry(() => import('./pages/EditProfilePage'));
const ApplicationsPage = lazyRetry(() => import('./pages/ApplicationsPage'));

const Loader = () => (
  <div style={{
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', color: 'var(--text-2)',
    fontSize: '0.875rem',
  }}>Loading…</div>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login"                    element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/onboarding"               element={user ? <OnboardingPage /> : <Navigate to="/login" />} />
          <Route path="/"                         element={user ? <FeedPage /> : <Navigate to="/login" />} />
          <Route path="/profile/:userId"          element={user ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/profile/:userId/edit"     element={user ? <EditProfilePage /> : <Navigate to="/login" />} />
          <Route path="/create-post"              element={user ? <CreatePostPage /> : <Navigate to="/login" />} />
          <Route path="/post/:itemId"             element={user ? <PostDetailPage /> : <Navigate to="/login" />} />
          <Route path="/people"                   element={user ? <PeoplePage /> : <Navigate to="/login" />} />
          <Route path="/freelance"                element={user ? <FreelancePage /> : <Navigate to="/login" />} />
          <Route path="/collab"                   element={user ? <CollabPage /> : <Navigate to="/login" />} />
          <Route path="/messages"                 element={user ? <MessagesPage /> : <Navigate to="/login" />} />
          <Route path="/notifications"            element={user ? <NotificationsPage /> : <Navigate to="/login" />} />
          <Route path="/settings"                 element={user ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/search"                   element={user ? <SearchPage /> : <Navigate to="/login" />} />
          <Route path="/applications"             element={user ? <ApplicationsPage /> : <Navigate to="/login" />} />
          <Route path="*"                         element={<Navigate to={user ? "/" : "/login"} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
