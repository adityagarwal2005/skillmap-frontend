import { useEffect } from 'react';

const SITE = 'https://doithere.in';

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(path) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', `${SITE}${path}`);
}

function setRobots(content) {
  let el = document.head.querySelector('meta[name="robots"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Per-route document title/description/canonical — index.html only ships one
 * static <title> and one static description (there's no server-side
 * rendering here), so without this every route Google crawls looks
 * identical. Googlebot does execute JS, so setting these in a mount-time
 * effect is enough for it to pick up the real per-page values.
 *
 * opts:
 *   title        document title (site name is appended automatically)
 *   description  meta description + og:description + twitter:description
 *   path         route path, used for the canonical URL and og:url
 *   noindex      true for logged-in-only pages that shouldn't be indexed —
 *                they're not publicly reachable content anyway, and google
 *                indexing a personalized/gated page is just noise + a
 *                minor privacy smell.
 */
export default function usePageMeta({ title, description, path, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — DoitHere` : 'DoitHere — Campus Talent Network';
    document.title = fullTitle;

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', path ? `${SITE}${path}` : SITE);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);

    if (path) setCanonical(path);
    setRobots(noindex ? 'noindex, nofollow' : 'index, follow');

    // No cleanup — the next page's own usePageMeta call overwrites these on
    // mount, and leaving the last-set values in place between navigations
    // (briefly) is harmless.
  }, [title, description, path, noindex]);
}
