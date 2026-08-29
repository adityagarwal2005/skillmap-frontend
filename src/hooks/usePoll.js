import { useEffect, useRef } from 'react';

/**
 * Run `fn` on an interval, but only while the tab is actually visible.
 *
 * Every screen in the app polls something. Left as plain setInterval, a phone
 * sitting in someone's pocket with the app backgrounded keeps hitting the API
 * forever — multiply that by every installed user and most of the backend's
 * load is requests nobody will ever see the result of. Pausing on
 * `document.hidden` removes that entirely, and re-running immediately on
 * return means the user still sees fresh data the moment they look.
 *
 * `fn` is kept in a ref so callers don't need to memoise it — changing the
 * callback never restarts the timer.
 */
export default function usePoll(fn, intervalMs, enabled = true) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;

    let timer = null;
    const tick = () => saved.current?.();

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      tick();   // catch up on whatever was missed while hidden
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
