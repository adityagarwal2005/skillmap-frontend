import { useState, useEffect, useCallback } from 'react';

// Chrome/Edge/Samsung Internet suppress their own install banner unless the
// page calls prompt() from a deferred 'beforeinstallprompt' event in
// response to a user gesture — there's no way to trigger it proactively, so
// this just captures the event when the browser decides to offer it and
// exposes a button-friendly promptInstall().
//
// The event fires once per page load, so it's held at module scope rather
// than in each component's state: a button that mounts later (one revealed
// on scroll) would otherwise miss it and never be able to offer the install.
let deferredEvent = null;
let installedFlag = typeof window !== 'undefined' && (
  !!window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);
const subscribers = new Set();
const notify = () => subscribers.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredEvent = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferredEvent = null;
    notify();
  });
}

export default function useInstallPrompt() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender(n => n + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return false;
    // prompt() works once per event, so release it before awaiting.
    const event = deferredEvent;
    deferredEvent = null;
    notify();
    event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  }, []);

  return {
    canInstall: !!deferredEvent && !installedFlag,
    installed: installedFlag,
    promptInstall,
  };
}
