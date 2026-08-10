import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';
import './LandingPage.css';

const FEATURES = [
  { icon: '💼', title: 'Freelance work', text: 'Post a paid job or pick one up — real work, real pay, right around campus.' },
  { icon: '🧩', title: 'Collab teams', text: 'Find teammates for a project, hackathon, or startup idea — and actually talk as a team once you\'re in.' },
  { icon: '🔎', title: 'People search', text: 'Find anyone on DoitHere by username, see their skills, and reach out directly.' },
  { icon: '💬', title: 'Messaging', text: 'DM a friend, or message anyone you\'ve actually worked with — no cold spam.' },
];

const STEPS = [
  { n: '1', title: 'Create your profile', text: 'Add your skills, a category, and a photo — takes under a minute.' },
  { n: '2', title: 'Post or browse', text: 'Put up a job or collab, or find one that matches what you can do.' },
  { n: '3', title: 'Connect', text: 'Message, get hired, or build something — all with people at your campus.' },
];

/**
 * Public marketing/preview page shown at '/' to anyone not logged in
 * (including anyone who clicked a referral link) instead of an instant,
 * context-free redirect straight to a bare login form.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState(null);

  usePageMeta({
    title: 'Campus Talent Network',
    description: 'Find skilled people on your campus. Post freelance jobs, start collabs, and get work done with people right around you.',
    path: '/',
  });

  useEffect(() => {
    setReferrer(localStorage.getItem('smReferredBy'));
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-icon">D</span>
          DoitHere
        </div>
        <div className="landing-nav-actions">
          <button className="landing-nav-signin" onClick={() => navigate('/login')}>Sign in</button>
          <button className="landing-nav-cta" onClick={() => navigate('/login?mode=register')}>Get started</button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          {referrer && (
            <div className="landing-invite-pill">You were invited by @{referrer}</div>
          )}
          <div className="landing-hero-tag">// DOITHERE — HYPERLOCAL SKILL NETWORK</div>
          <h1 className="landing-hero-display">
            Get discovered<br />for what you<br /><em>actually</em> do.
          </h1>
          <p className="landing-hero-sub">
            Portfolios, freelance gigs, and collaborators — matched to the
            skills and people right around you, across campus.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta-lg" onClick={() => navigate('/login?mode=register')}>
              Get started free
            </button>
            <button className="landing-cta-ghost" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
          <div className="landing-hero-meta">
            <span>[ PORTFOLIO ]</span>
            <span>[ FREELANCE ]</span>
            <span>[ COLLAB ]</span>
          </div>
        </div>
        <div className="landing-hero-glow" aria-hidden="true" />
        <div className="landing-hero-grid" aria-hidden="true" />
      </section>

      <section className="landing-features">
        {FEATURES.map(f => (
          <div key={f.title} className="landing-feature-card">
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      <section className="landing-steps">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-steps-row">
          {STEPS.map(s => (
            <div key={s.n} className="landing-step">
              <span className="landing-step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <button className="landing-cta-lg" onClick={() => navigate('/login?mode=register')}>
          Join DoitHere
        </button>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} DoitHere</span>
        <div className="landing-footer-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
