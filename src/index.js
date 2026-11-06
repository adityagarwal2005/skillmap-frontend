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

/* Nova is a single light theme. Pin data-theme="light" before the first
   paint so every page — including the ones that don't mount AppShell (a
   shared profile link, login, onboarding, legal) — gets the cream palette
   and the light-scoped component rules, with no flash. We also overwrite any
   stale themeV2="dark" left in a returning visitor's storage, so the old
   dark theme can never resurface. Storage can throw in a locked-down
   browser, so it's guarded; the attribute is set regardless. */
document.documentElement.setAttribute('data-theme', 'light');
try { localStorage.setItem('themeV2', 'light'); } catch { /* blocked storage */ }

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