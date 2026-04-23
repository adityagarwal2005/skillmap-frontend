import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import PeoplePage from './pages/PeoplePage';
import FreelancePage from './pages/FreelancePage';
import CollabPage from './pages/CollabPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import OnboardingPage from './pages/OnboardingPage';
import EditProfilePage from './pages/EditProfilePage';

function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text-2)',
      fontSize: '0.875rem'
    }}>Loading...</div>
  );

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;