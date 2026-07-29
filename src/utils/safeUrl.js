// Shared guard for user-supplied profile URLs (github_url/linkedin_url/
// instagram_url) rendered as a clickable <a href>. The backend rejects
// non-http(s) schemes on save, but this protects any already-stored rows
// and any other client hitting the API directly — a javascript: URI here
// would otherwise run in the visiting user's browser when they click it.
export const isSafeHref = (url) => /^https?:\/\//i.test(url);
