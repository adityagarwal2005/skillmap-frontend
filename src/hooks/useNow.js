import { useEffect, useState } from 'react';

/**
 * The current time, refreshed on an interval — for countdowns that have to
 * tick and listings that have to drop out the moment their window closes.
 * Also refreshes on returning to the tab, so a phone picked back up never
 * shows a stale "2h left".
 */
export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
