/* Server-rendered <head> for /u/:username.
 *
 * The app is client-rendered, so the HTML every crawler first receives is
 * the same generic shell for every profile. Googlebot runs JS and
 * eventually sees the real tags that usePageMeta sets, but nothing else
 * does: Bing, and every link preview (WhatsApp, LinkedIn, Slack, X), read
 * the raw HTML only. So a shared profile link showed the site's generic
 * title and description instead of the person.
 *
 * This serves the same index.html with a real <head> injected, plus Person
 * structured data. The page still boots the SPA exactly as before — only
 * the head differs, so there is no cloaking here: crawlers and people get
 * the same content.
 */
const SITE = 'https://doithere.in';
const API = process.env.REACT_APP_API_URL || 'https://api.doithere.in';
const SAFE_USERNAME = /^[A-Za-z0-9._-]{1,100}$/;

const esc = (s) => String(s == null ? '' : s).replace(/[<>&"']/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
));

const clamp = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
};

async function loadShell(req) {
  // index.html is a real file on the CDN, and Vercel checks the filesystem
  // before rewrites, so this cannot loop back into this function.
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const res = await fetch(`${proto}://${host}/index.html`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`shell ${res.status}`);
  return res.text();
}

function headFor(profile, username) {
  const name = profile?.username || username;
  const category = profile?.category || '';
  const title = `${name}${category ? ` — ${category}` : ''} — DoitHere`;
  const description = clamp(
    profile?.headline || profile?.bio ||
    `${name} on DoitHere${category ? ` — ${category}` : ''}. See their skills and work, and hire them for a gig nearby.`,
    160
  );
  const url = `${SITE}/u/${encodeURIComponent(name)}`;
  const image = profile?.profile_image || `${SITE}/og-image.png`;

  const person = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      url,
      ...(profile?.headline ? { jobTitle: profile.headline } : {}),
      ...(profile?.bio ? { description: clamp(profile.bio, 500) } : {}),
      ...(profile?.profile_image ? { image: profile.profile_image } : {}),
      ...(Array.isArray(profile?.skills) && profile.skills.length
        ? { knowsAbout: profile.skills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean) }
        : {}),
      ...(profile?.review_count > 0 && profile?.rating > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: profile.rating,
              reviewCount: profile.review_count,
            },
          }
        : {}),
    },
  };

  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="DoitHere" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

// Drop the shell's own title / description / og / twitter / canonical tags so
// the injected ones are the only copy in the document.
function stripShellMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '');
}

export default async function handler(req, res) {
  const username = String(req.query.username || '');

  let shell;
  try {
    shell = await loadShell(req);
  } catch {
    // Without the shell there is nothing to serve; let the SPA rewrite
    // handle it on the next try rather than emitting a broken page.
    res.status(302).setHeader('Location', '/');
    return res.end();
  }

  if (!SAFE_USERNAME.test(username)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).send(shell);
  }

  let profile = null;
  let status = 200;
  try {
    const r = await fetch(`${API}/users/by-username/${encodeURIComponent(username)}/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) profile = await r.json();
    else if (r.status === 404) status = 404;
  } catch {
    // Fall through: serve the shell and let the client fetch it.
  }

  if (!profile) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    // A real 404 status for a username that does not exist, so search
    // engines drop it instead of indexing an empty profile.
    return res.status(status).send(
      status === 404
        ? stripShellMeta(shell).replace('</head>',
            `  <meta name="robots" content="noindex, follow" />\n  <title>Profile not found — DoitHere</title>\n</head>`)
        : shell
    );
  }

  const html = stripShellMeta(shell).replace('</head>', `  ${headFor(profile, username)}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(html);
}
