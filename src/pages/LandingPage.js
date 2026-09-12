import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';
import Logo from '../components/Logo';
import GetAppButton from '../components/GetApp';
import './LandingPage.css';

const ic = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);

/* Real skills people offer, scrolled as a marquee — reads as an actual talent
   pool rather than four abstract nouns in a row. */
const SKILL_TICKER = [
  'Video editing', 'Poster design', 'Web dev', 'Photography', 'Content writing',
  'Figma', 'Tutoring', 'Music production', 'App dev', 'Public speaking',
  'Data analysis', '3D modelling', 'Social media', 'Illustration', 'Event management',
  'Copywriting', 'UI design', 'Editing reels',
];

/* Examples, not live data — the section header says so. They exist to show
   what a listing actually looks like, which no icon card can do. */
const SHOWCASE = [
  {
    kind: 'gig', kindLabel: 'Gig', money: '₹800',
    title: 'Poster for our fest — need it by Friday',
    skills: ['Illustrator', 'Poster design'],
    slots: '1 spot', dist: '450 m',
  },
  {
    kind: 'collab', kindLabel: 'Collab', money: null,
    title: 'Hackathon team — looking for 2 devs',
    skills: ['React', 'Python'],
    slots: '1 of 3 filled', dist: '1.2 km',
  },
  {
    kind: 'gig', kindLabel: 'Gig', money: '₹1,500',
    title: 'Shoot + edit a 60s reel for my brand',
    skills: ['Premiere Pro', 'Videography'],
    slots: '2 spots', dist: '2.4 km',
  },
];

const FLOW = [
  {
    n: '01', title: 'Build your profile',
    text: 'Skills, a photo, what you actually do. Under a minute.',
    icon: ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>),
  },
  {
    n: '02', title: 'Post or apply',
    text: 'Put up a gig or collab, or apply to one that fits you.',
    icon: ic(<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  },
  {
    n: '03', title: 'Get picked, get paid',
    text: 'They tick you off the applicant list, you talk, you deliver.',
    icon: ic(<><path d="M20 6L9 17l-5-5" /></>),
  },
];

const DOWNLOAD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);

/**
 * Public marketing/preview page shown at '/' to anyone not logged in
 * (including anyone who clicked a referral link) instead of an instant,
 * context-free redirect straight to a bare login form.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState(null);
  const heroRef = useRef(null);
  const finalRef = useRef(null);
  const [pastHero, setPastHero] = useState(false);
  const [atFinal, setAtFinal] = useState(false);

  usePageMeta({
    title: 'Find Work & Talent Near You',
    description: 'Find skilled people near you. Post gigs, start collabs, and get work done with people right around you.',
    path: '/',
  });

  useEffect(() => {
    setReferrer(localStorage.getItem('smReferredBy'));
  }, []);

  // Reveal-on-scroll. Everything starts hidden via CSS only when the
  // observer is available, so a browser without it still shows the page.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The download pill follows the reader once the hero's own buttons have
  // scrolled away, and steps aside at the closing section, which has its own.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.target === heroRef.current) setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0);
        if (e.target === finalRef.current) setAtFinal(e.isIntersecting);
      });
    });
    if (heroRef.current) io.observe(heroRef.current);
    if (finalRef.current) io.observe(finalRef.current);
    return () => io.disconnect();
  }, []);
  const showFloat = pastHero && !atFinal;

  const goRegister = () => navigate('/login?mode=register');

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Logo size={1.75} onClick={() => navigate('/')} />
        <div className="landing-nav-actions">
          <GetAppButton className="landing-nav-getapp">Get the app</GetAppButton>
          <button className="landing-nav-signin" onClick={() => navigate('/login')}>Sign in</button>
          <button className="landing-nav-cta" onClick={goRegister}>Get started</button>
        </div>
      </header>

      <section className="landing-hero" ref={heroRef}>
        <div className="landing-hero-inner">
          {referrer && (
            <div className="landing-invite-pill">You were invited by @{referrer}</div>
          )}
          <div className="landing-hero-tag">Hyperlocal talent network</div>
          <h1 className="landing-hero-display">
            Get discovered<br />for what you<br /><em>actually</em> do.
          </h1>
          <p className="landing-hero-sub">
            Portfolios, gigs, and collaborators — matched to the
            skills and people right around you, wherever you are.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-cta-lg" onClick={goRegister}>
              Get started free
            </button>
            <button className="landing-cta-ghost" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
          <div className="landing-hero-meta">
            <span>Portfolio</span>
            <span className="dot" />
            <span>Gigs</span>
            <span className="dot" />
            <span>Collab</span>
          </div>
        </div>
        <div className="landing-hero-glow" aria-hidden="true" />
      </section>

      {/* ── Skill ticker — the talent pool, as a moving band ── */}
      <section className="lp-ticker" aria-label="Skills on the network">
        <div className="lp-ticker-row">
          <div className="lp-ticker-track">
            {[...SKILL_TICKER, ...SKILL_TICKER].map((s, i) => (
              <span className="lp-ticker-chip" key={`a${i}`} aria-hidden={i >= SKILL_TICKER.length}>{s}</span>
            ))}
          </div>
        </div>
        <div className="lp-ticker-row is-reverse">
          <div className="lp-ticker-track">
            {[...SKILL_TICKER.slice().reverse(), ...SKILL_TICKER.slice().reverse()].map((s, i) => (
              <span className="lp-ticker-chip" key={`b${i}`} aria-hidden={i >= SKILL_TICKER.length}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Show the actual product ── */}
      <section className="lp-showcase">
        <div className="lp-showcase-copy" data-reveal>
          <span className="landing-eyebrow">The board</span>
          <h2 className="landing-section-title">This is what<br />people are posting.</h2>
          <p className="lp-showcase-text">
            Every listing carries what it pays, how many people it needs, the
            skills it wants, and how far away it is. You see the whole deal
            before you spend a second applying.
          </p>
          <ul className="lp-checks">
            <li>Budget up front — no “DM for rates”</li>
            <li>Group hiring, up to 5 people per post</li>
            <li>Sorted by what's genuinely near you</li>
          </ul>
          <button className="landing-cta-lg lp-inline-cta" onClick={goRegister}>
            Browse work near you
          </button>
        </div>

        <div className="lp-showcase-stack" data-reveal>
          <span className="lp-showcase-note">Example listings</span>
          {SHOWCASE.map((c, i) => (
            <article className={`lp-card is-${c.kind}`} key={c.title} style={{ '--i': i }}>
              <span className="lp-card-stripe" aria-hidden="true" />
              <div className="lp-card-top">
                <span className={`lp-card-kind is-${c.kind}`}>{c.kindLabel}</span>
                <span className="lp-card-dist">{c.dist}</span>
              </div>
              <h3 className="lp-card-title">{c.title}</h3>
              <div className="lp-card-skills">
                {c.skills.map(s => <span className="lp-card-skill" key={s}>{s}</span>)}
              </div>
              <div className="lp-card-deal">
                {c.money
                  ? <span className="lp-card-money">{c.money}</span>
                  : <span className="lp-card-money is-collab">Collab</span>}
                <span className="lp-card-slots">{c.slots}</span>
              </div>
              <div className="lp-card-foot">
                <span className="lp-card-btn">Apply</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Bento: what the platform gives you ── */}
      <section className="lp-bento-wrap">
        <div className="landing-section-head" data-reveal>
          <span className="landing-eyebrow">What you get</span>
          <h2 className="landing-section-title">Built for how work actually gets done</h2>
        </div>

        <div className="lp-bento">
          <div className="lp-cell lp-cell-pay" data-reveal>
            <div className="lp-cell-head">
              <span className="lp-cell-ic">{ic(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>)}</span>
              <h3>Real money, stated up front</h3>
            </div>
            <p>Every gig shows its budget before you apply. No haggling in the DMs to find out it pays nothing.</p>
            <div className="lp-pay-row" aria-hidden="true">
              <span className="lp-pay-tag">₹500</span>
              <span className="lp-pay-tag">₹1,200</span>
              <span className="lp-pay-tag">₹800</span>
              <span className="lp-pay-tag is-dim">₹2,000</span>
            </div>
          </div>

          <div className="lp-cell lp-cell-team" data-reveal>
            <div className="lp-cell-head">
              <span className="lp-cell-ic">{ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9.5" r="2.2" /><path d="M15.5 14.4c2.6.4 4.5 2.6 4.5 5.1" /></>)}</span>
              <h3>Hire a whole team</h3>
            </div>
            <p>Need two people for a hackathon? Set the capacity and tick applicants off as you fill it.</p>
            <div className="lp-avatars" aria-hidden="true">
              <span className="lp-ava">A</span>
              <span className="lp-ava">R</span>
              <span className="lp-ava is-open">+</span>
              <span className="lp-avatars-label">2 of 3 filled</span>
            </div>
          </div>

          <div className="lp-cell lp-cell-near" data-reveal>
            <div className="lp-cell-head">
              <span className="lp-cell-ic">{ic(<><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>)}</span>
              <h3>Actually nearby</h3>
            </div>
            <p>Filter from 500 m to 10 km. Distance is computed from the post, not guessed from a profile.</p>
            <div className="lp-radar" aria-hidden="true">
              <span className="lp-radar-ring" /><span className="lp-radar-ring" /><span className="lp-radar-ring" />
              <span className="lp-radar-dot" />
            </div>
          </div>

          <div className="lp-cell lp-cell-chat" data-reveal>
            <div className="lp-cell-head">
              <span className="lp-cell-ic">{ic(<><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6A8.4 8.4 0 1 1 21 11.5z" /></>)}</span>
              <h3>Talk only to people you've matched with</h3>
            </div>
            <p>A thread opens when someone hires you or accepts your collab — so your inbox never turns into cold spam.</p>
            <div className="lp-chat" aria-hidden="true">
              <span className="lp-bubble is-them">You free Friday for the shoot?</span>
              <span className="lp-bubble is-me">Yep — I'll bring the lights.</span>
            </div>
          </div>

          <div className="lp-cell lp-cell-proof" data-reveal>
            <div className="lp-cell-head">
              <span className="lp-cell-ic">{ic(<><path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z" /></>)}</span>
              <h3>Proof, not claims</h3>
            </div>
            <p>Endorsements only count as verified when they come from someone you've genuinely worked with.</p>
            <div className="lp-proof-row" aria-hidden="true">
              <span className="lp-proof-chip">Figma <b>12</b></span>
              <span className="lp-proof-chip is-verified">Web dev <b>8</b> ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Flow ── */}
      <section className="lp-flow-wrap">
        <div className="landing-section-head" data-reveal>
          <span className="landing-eyebrow">Get going</span>
          <h2 className="landing-section-title">Three steps to your first gig</h2>
        </div>
        <div className="lp-flow">
          <span className="lp-flow-line" aria-hidden="true" />
          {FLOW.map((s, i) => (
            <div className="lp-flow-step" key={s.n} data-reveal style={{ '--i': i }}>
              <span className="lp-flow-orb">{s.icon}</span>
              <span className="lp-flow-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="lp-final" ref={finalRef}>
        <div className="lp-final-glow" aria-hidden="true" />
        <div className="lp-final-inner" data-reveal>
          <Logo size={2.6} className="lp-final-logo" />
          <h2 className="lp-final-title">Your city<br />is hiring.</h2>
          <p className="lp-final-sub">
            The people who can pay you, team up with you, or hire you are
            already a few minutes away. Go find them.
          </p>
          <div className="lp-final-actions">
            <button className="landing-cta-lg lp-final-cta" onClick={goRegister}>
              Get started free
            </button>
            <GetAppButton className="landing-cta-ghost lp-final-getapp">
              {DOWNLOAD_ICON} Download the app
            </GetAppButton>
          </div>
          <span className="lp-final-note">Free to join · No card needed</span>
        </div>
      </section>

      {showFloat && (
        <div className="lp-getapp-float">
          <GetAppButton className="lp-getapp-pill">{DOWNLOAD_ICON} Download the app</GetAppButton>
        </div>
      )}

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
