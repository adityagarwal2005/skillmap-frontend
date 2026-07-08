import { useEffect, useState } from 'react';

/**
 * Returns true when the user has requested reduced motion, or when the
 * device has no fine pointer (touch). Motion primitives use this to
 * degrade gracefully — no dependency, no layout impact.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return reduced;
}
