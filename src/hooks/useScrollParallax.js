import { useEffect } from 'react';

/* Move things at different speeds as the page scrolls.

   A long landing page with nothing but reveal-on-enter animations reads as
   static once you have seen each section — the content arrives and then sits
   still. Parallax gives the page a sense of depth that responds continuously
   to the scroll rather than firing once, which is the difference between a
   page that feels alive under your thumb and one that feels like a poster.

   Implementation notes that matter:
   - One listener for the whole page, coalesced into a single rAF. A listener
     per element, or work done directly in the scroll handler, is how parallax
     earns its reputation for jank.
   - Writes a CSS custom property rather than `transform` directly, so the
     stylesheet still owns the element's scale and can compose the two without
     JS and CSS fighting over the same property.
   - `passive: true` so the handler can never block scrolling.
   - Honours prefers-reduced-motion by doing nothing at all. */
export default function useScrollParallax(selector, distance = 28) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let nodes = [];
    let frame = 0;

    const measure = () => { nodes = Array.from(document.querySelectorAll(selector)); };

    const apply = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        // -1 when the element sits a screen below the fold, +1 a screen above.
        const progress = ((vh - r.top) / (vh + r.height)) * 2 - 1;
        el.style.setProperty('--pY', `${(-progress * distance).toFixed(1)}px`);
      }
    };

    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply); };

    measure();
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [selector, distance]);
}

/* How far down the document you are, 0 to 1, written to a CSS variable.

   Kept in this file because it shares the parallax's one rule: read layout
   inside a rAF, write a custom property, never touch layout in the scroll
   handler itself. */
export function useScrollProgress(varName = '--sp') {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      root.style.setProperty(varName, p.toFixed(4));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply); };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty(varName);
    };
  }, [varName]);
}
