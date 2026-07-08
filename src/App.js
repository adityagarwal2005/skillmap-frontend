import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';

// Lazy-loaded routes — each page ships as its own chunk, so the app boots fast.
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const FeedPage         = lazy(() => import('./pages/FeedPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const CreatePostPage   = lazy(() => import('./pages/CreatePostPage'));
const PostDetailPage   = lazy(() => import('./pages/PostDetailPage'));
const PeoplePage       = lazy(() => import('./pages/PeoplePage'));
const FreelancePage    = lazy(() => import('./pages/FreelancePage'));
const CollabPage       = lazy(() => import('./pages/CollabPage'));
const MessagesPage     = lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const SearchPage       = lazy(() => import('./pages/SearchPage'));
const OnboardingPage   = lazy(() => import('./pages/OnboardingPage'));
const EditProfilePage  = lazy(() => import('./pages/EditProfilePage'));

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
          <Route path="*"                         element={<Navigate to={user ? "/" : "/login"} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
