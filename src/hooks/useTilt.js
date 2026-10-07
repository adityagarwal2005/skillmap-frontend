import { useEffect } from 'react';

/**
 * Cursor-driven 3D tilt.
 *
 * `ref` points at the element that gets the rotation; it must sit inside a
 * parent carrying `perspective`, and must not have a CSS animation of its own
 * on `transform` — the hero frame already floats on a keyframe, so the tilt
 * goes on a wrapper around it rather than fighting for the same property.
 *
 * The rotation eases toward the pointer instead of snapping to it: each frame
 * moves a fraction of the remaining distance, which is what makes it feel
 * weighted rather than glued to the cursor. The loop stops as soon as it is
 * close enough to rest, so an idle page costs nothing.
 *
 * Decorative: nothing is attached without a fine pointer, and nothing at all
 * under prefers-reduced-motion.
 */
export default function useTilt(ref, { max = 9, scale = 1.015, ease = 0.12 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!fine?.matches || calm?.matches) return undefined;

    const target = { x: 0, y: 0, s: 1 };
    const now = { x: 0, y: 0, s: 1 };
    let frame = 0;

    const draw = () => {
      const dx = target.x - now.x, dy = target.y - now.y, ds = target.s - now.s;
      now.x += dx * ease; now.y += dy * ease; now.s += ds * ease;
      el.style.transform =
        `rotateX(${now.y.toFixed(3)}deg) rotateY(${now.x.toFixed(3)}deg) scale(${now.s.toFixed(4)})`;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(ds) * 100 > 0.01) {
        frame = requestAnimationFrame(draw);
      } else {
        frame = 0;
      }
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(draw); };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      target.x = px * max * 2;
      target.y = -py * max * 2;
      target.s = scale;
      kick();
    };
    const onLeave = () => { target.x = 0; target.y = 0; target.s = 1; kick(); };

    const zone = el.parentElement || el;
    zone.addEventListener('pointermove', onMove, { passive: true });
    zone.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      el.style.transform = '';
    };
  }, [ref, max, scale, ease]);
}
