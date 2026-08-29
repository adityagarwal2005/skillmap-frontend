/**
 * Only let http(s) URLs reach an href.
 *
 * User-supplied profile links are rendered as clickable <a href> on the public
 * profile page. The API validates these on write, but rows saved before that
 * check existed can still hold anything — and a `javascript:` (or `data:`)
 * URI there executes in the visitor's origin, where the JWT lives in
 * localStorage. Sanitising at render is the layer that actually protects the
 * person clicking, regardless of what's in the database.
 *
 * Returns the URL if it's safe, else null (caller should render plain text).
 */
export default function safeHref(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    // Resolve against the current origin so protocol-relative and relative
    // forms are normalised before the scheme is checked.
    const { protocol } = new URL(trimmed, window.location.origin);
    return protocol === 'http:' || protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}
