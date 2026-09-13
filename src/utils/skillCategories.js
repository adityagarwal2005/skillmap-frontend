/* The feed's "Browse by skill" rail. Mirrors the backend taxonomy in
   skills/management/commands/seed_categories.py, with each category's
   starter skills plus the everyday words people actually write in a post.
   A listing can sit in more than one category. */

const icon = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);

export const SKILL_CATEGORIES = [
  {
    id: 'code', label: 'Code', hue: '#3b82f6',
    icon: icon(<><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 4-4 16" /></>),
    terms: ['python', 'javascript', 'react', 'node', 'node.js', 'java', 'c++', 'flutter', 'android',
      'ios', 'machine learning', 'web development', 'web dev', 'website', 'landing page', 'app',
      'apps', 'frontend', 'backend', 'django', 'api', 'software', 'code', 'coding', 'developer',
      'dev', 'devs', 'pytorch', 'go', 'postgres', 'docker'],
  },
  {
    id: 'design', label: 'Design', hue: '#ec4899',
    icon: icon(<><path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="m2 2 7.586 7.586" /><circle cx="11" cy="11" r="2" /></>),
    terms: ['ui/ux', 'ui', 'ux', 'figma', 'graphic design', 'logo', 'logo design', 'poster',
      'poster design', 'canva', 'illustration', 'illustrator', 'branding', 'brand kit', 'design',
      'designer', 'mockup', 'deck', 'blender'],
  },
  {
    id: 'video', label: 'Photo & Video', hue: '#f97316',
    icon: icon(<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>),
    terms: ['photography', 'photographer', 'photo', 'photos', 'photoshoot', 'shoot', 'video',
      'videos', 'videography', 'video editing', 'reel', 'reels', 'event coverage', 'portrait',
      'premiere pro', 'premiere', 'after effects', 'photoshop', 'cinematographer', 'film',
      'short film', 'camera'],
  },
  {
    id: 'writing', label: 'Writing', hue: '#a855f7',
    icon: icon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>),
    terms: ['blog', 'blog writing', 'technical writing', 'copywriting', 'resume', 'resume writing',
      'scriptwriting', 'script', 'caption', 'captions', 'content writing', 'writer', 'writing',
      'article', 'articles', 'proofreading'],
  },
  {
    id: 'marketing', label: 'Marketing', hue: '#22c55e',
    icon: icon(<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
    terms: ['social media', 'digital marketing', 'seo', 'sales', 'public speaking', 'marketing',
      'instagram', 'ads', 'growth', 'promotion', 'influencer', 'podcast'],
  },
  {
    id: 'events', label: 'Events', hue: '#ef4444',
    icon: icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
    terms: ['event', 'events', 'event planning', 'anchoring', 'anchor', 'volunteering', 'volunteer',
      'sponsorship', 'logistics', 'hosting', 'fest', 'stall', 'wedding', 'party'],
  },
  {
    id: 'tutoring', label: 'Tutoring', hue: '#0ea5e9',
    icon: icon(<><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>),
    terms: ['maths', 'math', 'physics', 'chemistry', 'coding help', 'doubt solving', 'tutoring',
      'tutor', 'teaching', 'teacher', 'subject tutoring', 'exam prep', 'classes', 'lessons'],
  },
  {
    id: 'notes', label: 'Notes & Study', hue: '#eab308',
    icon: icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>),
    terms: ['handwritten notes', 'notes', 'assignment', 'assignments', 'assignment help',
      'lab records', 'presentations', 'presentation', 'ppt', 'research papers', 'research',
      'project report'],
  },
  {
    id: 'music', label: 'Music', hue: '#8b5cf6',
    icon: icon(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
    terms: ['singing', 'singer', 'guitar', 'keyboard', 'piano', 'dance', 'dancer', 'dj',
      'music production', 'music', 'mixing', 'mastering', 'ableton', 'vocals', 'band', 'tracks'],
  },
  {
    id: 'hardware', label: 'Hardware', hue: '#14b8a6',
    icon: icon(<><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></>),
    terms: ['arduino', 'raspberry pi', 'embedded c', 'embedded', 'pcb', 'pcb design', 'robotics',
      'sensors', 'esp32', '3d printing', 'iot', 'electronics', 'circuit'],
  },
  {
    id: 'art', label: 'Art & Craft', hue: '#f43f5e',
    icon: icon(<><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" /></>),
    terms: ['painting', 'sketching', 'sketch', 'handmade', 'crafts', 'calligraphy', 'resin art',
      'origami', 'art', 'artist', 'artwork', 'mural', 'drawing', '3d artist'],
  },
  {
    id: 'fitness', label: 'Fitness', hue: '#10b981',
    icon: icon(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
    terms: ['gym', 'gym training', 'cricket', 'football', 'yoga', 'athletics', 'nutrition',
      'fitness', 'trainer', 'coach', 'sports'],
  },
  {
    id: 'gaming', label: 'Gaming', hue: '#6366f1',
    icon: icon(<><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" /><rect x="2" y="6" width="20" height="12" rx="2" /></>),
    terms: ['game development', 'game dev', 'streaming', 'esports', 'unity', 'unreal',
      'level design', 'game art', 'gaming', 'game'],
  },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word boundaries by hand: \b treats "+" and "." as non-word characters,
// so /\bc\+\+\b/ never matches, and a bare substring test would file
// "apply" under "app".
const PATTERNS = new Map(SKILL_CATEGORIES.map(c => [
  c.id,
  new RegExp(`(^|[^a-z0-9])(${c.terms.map(escape).join('|')})(?=[^a-z0-9]|$)`, 'i'),
]));

const memo = new WeakMap();

/** Category ids a feed item belongs to, from its skills, title and description. */
export function categoriesOf(item) {
  if (memo.has(item)) return memo.get(item);
  const hay = [...(item.skills || []), item.title, item.description]
    .filter(Boolean).join(' • ').toLowerCase();
  const ids = new Set(SKILL_CATEGORIES.filter(c => PATTERNS.get(c.id).test(hay)).map(c => c.id));
  memo.set(item, ids);
  return ids;
}

export const categoryById = (id) => SKILL_CATEGORIES.find(c => c.id === id) || null;
