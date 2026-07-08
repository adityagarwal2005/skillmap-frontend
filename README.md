# SkillMap — Frontend

React (Create React App) frontend for **SkillMap**, a hyperlocal skill-discovery platform for India.

**[🌐 Live App](https://www.doithere.in) · [Backend Repo](https://github.com/adityagarwal2005/skillmap-backend)**

---

## Stack

React 18 · React Router · Context API · Axios · plain CSS (design tokens) · deployed on **Vercel**.

---

## Local setup

```bash
npm install
cp .env.example .env.local        # then set REACT_APP_API_URL
npm start                          # http://localhost:3000
```

`REACT_APP_API_URL` is the base URL of the Django API — `http://127.0.0.1:8000` locally, the Render URL in production (see `.env.example`).

---

## Project structure

```
src/
├── pages/            One component per screen (Feed, Profile, Login, …)
├── components/
│   ├── AppShell.js   Shared chrome: dark topbar + nav rail + mobile bottom bar + avatar
│   ├── Skeleton.js   Loading placeholders
│   ├── SocialIcons.js
│   └── motion/       Reusable, dependency-free animation primitives
├── api/
│   ├── config.js     Axios instance + JWT auto-refresh (reads REACT_APP_API_URL)
│   └── auth.js, users.js, feed.js, portfolio.js, work.js, collab.js, notifications.js
├── context/
│   ├── AuthContext.js    Session + tokens (localStorage)
│   └── ToastContext.js   Global toasts
├── styles/global.css     Design tokens (colors, type, spacing, motion)
└── App.js                Routes (lazy-loaded)
```

### Two rules that keep it consistent
1. **Every authenticated page renders inside `<AppShell>`** — it owns the topbar, nav rail, mobile nav, theme toggle, and avatar. Don't re-implement chrome per page.
2. **Styling lives in two files:** `styles/global.css` (tokens) and `pages/FeedPage.css` (the shared shell — topbar, rail, steel surface, cards, gallery, avatars). Other page CSS files handle only page-specific bits.

---

## Deployment

- Auto-deploys to **Vercel** on push to `main`.
- Set **`REACT_APP_API_URL`** in Vercel → Settings → Environment Variables (the dashboard value overrides `.env.production`).
- `vercel.json` sets `CI=false` (warnings don't fail the build) and the SPA rewrite.

---

## Pages

Login · Onboarding · Feed · Profile · Edit Profile · Create Post · Post Detail · People · Freelance · Collab · Messages · Notifications · Settings · Search
