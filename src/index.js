import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './components/Toast.css';
import './components/Skeleton.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

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