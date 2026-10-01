import { useEffect } from 'react';

/**
 * The pointer-tracking highlight on the listing grid: a soft radial warm spot
 * that follows the cursor across whichever card it's over.
 *
 * One delegated pointermove on the container rather than a listener per card,
 * coalesced into a single rAF so a fast drag across thirty cards still writes
 * at most once per frame. It only ever sets two custom properties, so the
 * work per frame is a style write on one element — no layout, no paint of
 * anything but the gradient.
 *
 * Point `ref` at a container that stays mounted across loading states — the
 * effect runs once, so a ref on an element that only appears after the
 * fetch resolves would never get listeners at all.
 */
export default function useSpotlight(ref, selector = '.mk-card') {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    // Decorative only: anyone who asked for less motion, or is on a device
    // without a real pointer, gets nothing attached at all.
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!fine?.matches || calm?.matches) return undefined;

    let frame = 0;
    let pending = null;
    let last = null;

    const paint = () => {
      frame = 0;
      if (!pending) return;
      const { card, x, y } = pending;
      if (last && last !== card) last.style.removeProperty('--spot');
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      card.style.setProperty('--spot', '1');
      last = card;
    };

    const onMove = (e) => {
      const card = e.target.closest?.(selector);
      if (!card || !root.contains(card)) return;
      const r = card.getBoundingClientRect();
      pending = { card, x: e.clientX - r.left, y: e.clientY - r.top };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      if (last) last.style.removeProperty('--spot');
      last = null;
      pending = null;
    };

    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, [ref, selector]);
}
