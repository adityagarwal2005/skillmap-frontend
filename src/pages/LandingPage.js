import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';
import Logo from '../components/Logo';
import './LandingPage.css';

const ic = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);

const FEATURES = [
  {
    icon: ic(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>),
    title: 'Freelance work',
    text: 'Post a paid job or pick one up — real work, real pay, right around campus.',
  },
  {
    icon: ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9.5" r="2.2" /><path d="M15.5 14.4c2.6.4 4.5 2.6 4.5 5.1" /></>),
    title: 'Collab teams',
    text: 'Find teammates for a project, hackathon, or startup — and talk as a team once you\'re in.',
  },
  {
    icon: ic(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
    title: 'People search',
    text: 'Find anyone by name, see their skills, and reach out directly.',
  },
  {
    icon: ic(<><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6A8.4 8.4 0 1 1 21 11.5z" /></>),
    title: 'Messaging',
    text: 'DM a friend, or message anyone you\'ve actually worked with — no cold spam.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your profile', text: 'Add your skills, a category, and a photo — takes under a minute.' },
  { n: '02', title: 'Post or browse', text: 'Put up a job or collab, or find one that matches what you can do.' },
  { n: '03', title: 'Connect', text: 'Message, get hired, or build something — all with people at your campus.' },
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
        <Logo size={1.75} onClick={() => navigate('/')} />
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
          <div className="landing-hero-tag">Hyperlocal campus talent network</div>
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
            <span>Portfolio</span>
            <span className="dot" />
            <span>Freelance</span>
            <span className="dot" />
            <span>Collab</span>
          </div>
        </div>
        <div className="landing-hero-glow" aria-hidden="true" />
      </section>

      <section className="landing-features">
        <div className="landing-section-head">
          <span className="landing-eyebrow">What you get</span>
          <h2 className="landing-section-title">Everything to get work done on campus</h2>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-steps">
        <div className="landing-section-head">
          <span className="landing-eyebrow">Get going</span>
          <h2 className="landing-section-title">How it works</h2>
        </div>
        <div className="landing-steps-row">
          {STEPS.map(s => (
            <div key={s.n} className="landing-step">
              <span className="landing-step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <Logo size={3} className="landing-cta-logo" />
        <h2 className="landing-cta-band-title">Your campus is hiring.</h2>
        <p className="landing-cta-band-sub">Join the people getting work, teammates, and projects — right where they are.</p>
        <button className="landing-cta-lg" onClick={() => navigate('/login?mode=register')}>
          Get started free
        </button>
      </section>

      <footer className="landing-footer">
        <Logo size={1.3} />
        <div className="landing-footer-links">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
