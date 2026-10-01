import { useEffect, useRef, useState } from 'react';

/**
 * Counts from the previous value to the next one so the headline number on
 * the feed settles rather than snapping — the figure is the first thing you
 * read, and watching it land tells you the page just refreshed its answer.
 *
 * Driven by rAF with an ease-out curve, capped short enough that it never
 * delays comprehension. Anyone who asked for reduced motion, and any jump
 * small enough not to be worth it, gets the number immediately.
 */
export default function useCountUp(value, { duration = 500 } = {}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    const start = from.current;
    const delta = value - start;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // rAF is paused in a hidden tab, so a feed loaded in the background would
    // sit on the old figure until it was focused. Nobody is watching it move
    // there anyway — take the number straight.
    if (calm || delta === 0 || Math.abs(delta) < 2 || document.hidden) {
      from.current = value;
      setShown(value);
      return undefined;
    }

    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + delta * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return shown;
}
