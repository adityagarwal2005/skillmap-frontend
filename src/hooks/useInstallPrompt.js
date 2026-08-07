import { useState, useEffect, useCallback } from 'react';

// Chrome/Edge/Samsung Internet suppress their own install banner unless the
// page calls prompt() from a deferred 'beforeinstallprompt' event in
// response to a user gesture — there's no way to trigger it proactively, so
// this hook just captures the event when the browser decides to offer it and
// exposes a button-friendly promptInstall().
export default function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true
  );

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredEvent(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferredEvent(null); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return false;
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return outcome === 'accepted';
  }, [deferredEvent]);

  return {
    canInstall: !!deferredEvent && !installed,
    installed,
    promptInstall,
  };
}
