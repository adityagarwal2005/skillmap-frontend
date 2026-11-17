import API from './config';

// Founder-only analytics for the private /dashboard. The backend gates this on
// FOUNDER_EMAILS, so a non-founder account gets a 403.
export const getFounderStats = () => API.get('/founder/stats/');
