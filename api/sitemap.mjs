/* Dynamic sitemap.
 *
 * The old public/sitemap.xml listed three URLs and never changed, so the
 * only pages Google was told about were the landing page and the two legal
 * pages — none of the profiles, which are the actual content. This builds
 * the list from the API on every (cached) request.
 *
 * It never fails hard: if the API is down we still serve the core pages,
 * because a sitemap that 500s is worse than a short one.
 */
const SITE = 'https://doithere.in';
const API = process.env.REACT_APP_API_URL || 'https://api.doithere.in';

const CORE = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
];

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
));

// Usernames come back from our own API, but they are user-chosen strings that
// end up inside a URL in an XML document, so they are validated rather than
// trusted.
const SAFE_USERNAME = /^[A-Za-z0-9._-]{1,100}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function urlEntry({ path, changefreq, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(SITE + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function profileEntries() {
  const res = await fetch(`${API}/seo/profiles/`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`profiles ${res.status}`);
  const body = await res.json();
  return (body.results || [])
    .filter((r) => r && SAFE_USERNAME.test(r.username || ''))
    .map((r) => urlEntry({
      path: `/u/${r.username}`,
      lastmod: ISO_DATE.test(r.updated || '') ? r.updated : undefined,
      changefreq: 'weekly',
      priority: '0.7',
    }));
}

export default async function handler(req, res) {
  let entries = CORE.map(urlEntry);
  let cache = 'public, s-maxage=3600, stale-while-revalidate=86400';

  try {
    entries = entries.concat(await profileEntries());
  } catch {
    // Short cache so a transient API blip doesn't freeze a stub sitemap in
    // the CDN for an hour.
    cache = 'public, s-maxage=300';
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join('\n') + `\n</urlset>\n`
  );
}
