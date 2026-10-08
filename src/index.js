import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './styles/nextgen.css';
import './components/Toast.css';
import './components/Skeleton.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

/* Apply the saved theme before the first paint.

   data-theme was only ever set inside AppShell, so every page that doesn't
   mount the shell — the public profile a shared link opens, login,
   onboarding, the legal pages — ignored the preference entirely and fell
   back to the dark :root defaults. Someone who had chosen light got it on
   the feed and lost it the moment they opened their own profile link.

   Setting it here rather than in a React effect also means the correct
   palette is on the element before anything renders, so there is no flash
   of the wrong theme on load. A storage read can throw in a locked-down
   browser, so it is guarded. */
try {
  const saved = localStorage.getItem('themeV2');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
} catch { /* private mode or blocked storage — keep the default palette */ }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </ErrorBoundary>
);

// Register the service worker so DoitHere is installable ("Add to Home Screen")
// and loads fast on repeat visits. Production only — the CRA dev server serves
// its own assets, and a SW would cache stale files during development.
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}