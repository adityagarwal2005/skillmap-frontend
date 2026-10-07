import { useEffect } from 'react';

/**
 * Magnetic buttons: while the pointer is near one, it leans toward it.
 *
 * Delegated from a container so a page can have many without many listeners,
 * and coalesced into one rAF. The pull is capped well below the button's own
 * padding — far enough to notice, never far enough to make the thing feel
 * like it is dodging the cursor.
 *
 * Decorative, so: fine pointers only, nothing under reduced motion.
 */
export default function useMagnetic(ref, selector = '[data-magnetic]', { pull = 0.22, radius = 90 } = {}) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!fine?.matches || calm?.matches) return undefined;

    const targets = Array.from(root.querySelectorAll(selector));
    if (!targets.length) return undefined;

    let frame = 0;
    let point = null;

    const apply = () => {
      frame = 0;
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (!point) { el.style.transform = ''; return; }
        const dx = point.x - cx;
        const dy = point.y - cy;
        const dist = Math.hypot(dx, dy);
        const reach = Math.max(r.width, r.height) / 2 + radius;
        if (dist > reach) { el.style.transform = ''; return; }
        const falloff = 1 - dist / reach;
        el.style.transform =
          `translate(${(dx * pull * falloff).toFixed(2)}px, ${(dy * pull * falloff).toFixed(2)}px)`;
      });
    };

    const onMove = (e) => {
      point = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      point = null;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      targets.forEach((el) => { el.style.transform = ''; });
    };
  }, [ref, selector, pull, radius]);
}
