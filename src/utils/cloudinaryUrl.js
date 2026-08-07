// Every upload goes to Cloudinary at full original resolution (a phone photo
// can be several MB) and every page was rendering that same original file
// even for a 44px avatar circle. Cloudinary supports resizing via the URL
// itself with no re-upload, so this rewrites the URL to ask for a right-sized,
// auto-compressed version instead of shipping the full original to the
// browser just to shrink it with CSS.
const UPLOAD_MARKER = '/image/upload/';

export function cldResize(url, width, { square = false } = {}) {
  if (!url || typeof url !== 'string') return url;
  const idx = url.indexOf(UPLOAD_MARKER);
  if (idx === -1) return url; // not a Cloudinary image URL (blob:, data:, video, missing) — leave as-is

  const before = url.slice(0, idx + UPLOAD_MARKER.length);
  const after = url.slice(idx + UPLOAD_MARKER.length);
  const crop = square ? 'c_fill,g_auto' : 'c_limit';
  return `${before}w_${width},${crop},q_auto,f_auto/${after}`;
}

// Shorthand for the common cases used across the app.
export const cldAvatar = (url, width = 120) => cldResize(url, width, { square: true });
export const cldThumb  = (url, width = 800) => cldResize(url, width);
