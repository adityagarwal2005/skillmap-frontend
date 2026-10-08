import { useState, useEffect } from 'react';

/* Whether a CSS media query currently matches, as state.

   Used where a control genuinely belongs in a different place on a phone
   rather than merely looking different — CSS can restyle an element but it
   cannot move it to another parent, and `display: none` on one copy plus a
   second copy elsewhere means two controls in the accessibility tree and two
   things to keep in sync. */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    try { return window.matchMedia(query).matches; } catch { return false; }
  });

  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(query); } catch { return undefined; }
    const onChange = (e) => setMatches(e.matches);
    // Re-read on mount: the viewport can have changed between the initial
    // state and the effect, and in a test environment it starts undefined.
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
