import { useState, useEffect } from 'react';
import useInstallPrompt from '../hooks/useInstallPrompt';
import './GetApp.css';

function detectPlatform() {
  const ua = navigator.userAgent || '';
  // iPadOS reports itself as a Mac; touch support is what gives it away.
  const iOS = /iphone|ipad|ipod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

const STEPS = {
  ios: [
    'Tap the Share button at the bottom of Safari',
    'Scroll down and choose “Add to Home Screen”',
    'Tap “Add” — DoitHere joins your other apps',
  ],
  android: [
    'Open the ⋮ menu in the corner of Chrome',
    'Tap “Install app” or “Add to Home screen”',
    'Confirm — DoitHere joins your other apps',
  ],
  desktop: [
    'Open the address below in your phone’s browser',
    'Add it to your home screen from the browser menu',
    'On this computer, use the install icon in the Chrome or Edge address bar',
  ],
};

function GetAppSheet({ onClose }) {
  const platform = detectPlatform();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="getapp-overlay" onClick={onClose}>
      <div className="getapp-sheet" role="dialog" aria-modal="true"
        aria-labelledby="getapp-title" onClick={e => e.stopPropagation()}>
        <button type="button" className="getapp-x" onClick={onClose} aria-label="Close">×</button>
        <img className="getapp-icon" src="/icon-192.png" alt="" />
        <h2 id="getapp-title" className="getapp-title">Get DoitHere on your phone</h2>
        <p className="getapp-sub">
          {platform === 'desktop'
            ? 'It installs straight from the browser — no app store needed.'
            : 'Add it to your home screen and it opens full-screen, like any other app.'}
        </p>
        <ol className="getapp-steps">
          {STEPS[platform].map((step, i) => (
            <li key={step}><span className="getapp-n">{i + 1}</span><span>{step}</span></li>
          ))}
        </ol>
        {platform === 'desktop' && (
          <div className="getapp-url">{window.location.host || 'doithere.in'}</div>
        )}
        <button type="button" className="getapp-done" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

/**
 * "Download the app" for anyone still using DoitHere in a browser.
 *
 * Where the browser offers a native install prompt (Chrome, Edge, Samsung
 * Internet) this triggers it directly. Everywhere else — iOS Safari never
 * offers one — it opens a short how-to instead. Renders nothing once the
 * app is already installed.
 */
export default function GetAppButton({ className = '', children }) {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (installed) return null;

  const handleClick = async () => {
    // A dismissed native prompt is still an answer, so don't follow it
    // with the how-to sheet.
    if (canInstall) { await promptInstall(); return; }
    setSheetOpen(true);
  };

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {children}
      </button>
      {sheetOpen && <GetAppSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
