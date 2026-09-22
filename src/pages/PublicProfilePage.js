import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUserByUsername, getUserReviews, getUserPortfolio } from '../api/users';
import { cldAvatar, cldThumb } from '../utils/cloudinaryUrl';
import usePageMeta from '../hooks/usePageMeta';
import Logo from '../components/Logo';
import './PublicProfilePage.css';

const WhatsAppIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2a.4.4 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3A2.8 2.8 0 0 0 6.8 10c0 1.6 1.2 3.2 1.4 3.4s2.3 3.6 5.6 5c.8.3 1.4.5 1.9.4.6-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1-.3-.2-.6-.3z"/>
  </svg>
);

const AVAILABILITY = {
  open_to_freelance: { label: 'Available for gigs', tone: 'gig' },
  open_to_work:      { label: 'Open to work',       tone: 'work' },
};

const reviewDate = (ts) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { month: 'short', year: 'numeric' });
};

/**
 * Public, no-login-required profile — the thing worth sharing on WhatsApp
 * or LinkedIn. Read-only by design: no messaging, friending, endorsing or
 * editing, all of which need an account. It shows the proof a stranger
 * actually needs — rating, reviews, skills, work — from the same
 * public-safe payloads the app uses, which omit email and location for
 * anyone who isn't the owner.
 */
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [allReviews, setAllReviews] = useState(false);

  usePageMeta({
    title: profile ? `${profile.username}${profile.category ? ` — ${profile.category}` : ''}` : username,
    description: profile
      ? (profile.headline || profile.bio || `${profile.username} on DoitHere — ${profile.category || 'hyperlocal talent network'}.`)
      : `${username} on DoitHere`,
    path: `/u/${username}`,
    // Not-found pages have nothing worth indexing; real profiles are the
    // whole point of this page existing, so they stay indexable.
    noindex: notFound,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setReviews([]);
    setProjects([]);
    getUserByUsername(username)
      .then(async (r) => {
        if (!alive) return;
        setProfile(r.data);
        // Both are public endpoints; a failure on either just means that
        // section doesn't render.
        const [rv, pf] = await Promise.all([
          getUserReviews(r.data.id).catch(() => ({ data: { reviews: [] } })),
          getUserPortfolio(r.data.id).catch(() => ({ data: { items: [] } })),
        ]);
        if (!alive) return;
        setReviews([...(rv.data.reviews || [])].reverse());
        setProjects(pf.data.items || []);
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  const join = () => navigate('/login?mode=register');

  const skills = profile
    ? (profile.skills_detail || (profile.skills || []).map(n => ({ name: n, endorsements: 0 })))
    : [];
  const avail = profile ? AVAILABILITY[profile.status] : null;
  const rating = Number(profile?.rating) || 0;
  const whatsapp = profile?.whatsapp
    ? `https://wa.me/${String(profile.whatsapp).replace(/\D/g, '')}`
    : null;

  return (
    <div className="pp-page">
      <header className="pp-topbar">
        <Link to="/" className="pp-brand" aria-label="DoitHere home"><Logo size={1.4} /></Link>
        <button type="button" className="pp-join" onClick={join}>Join DoitHere</button>
      </header>

      {loading ? (
        <div className="pp-state">Loading…</div>
      ) : notFound || !profile ? (
        <div className="pp-state">
          <h1>No one here by that name</h1>
          <p>The link may be old, or the username changed.</p>
          <button type="button" className="pp-join" onClick={() => navigate('/')}>Go to DoitHere</button>
        </div>
      ) : (
        <main className="pp-main">
          <section className="pp-hero">
            <div className="pp-hero-glow" aria-hidden="true" />
            <span className="pp-avatar">
              {profile.profile_image && !avatarBroken
                ? <img className="ava-img" src={cldAvatar(profile.profile_image, 240)} alt={profile.username}
                    onError={() => setAvatarBroken(true)} />
                : profile.username[0].toUpperCase()}
            </span>
            <h1 className="pp-name">{profile.username}</h1>
            <p className="pp-category">{profile.category || 'Independent'}</p>
            {avail && (
              <span className={`pp-avail is-${avail.tone}`}><i aria-hidden="true" />{avail.label}</span>
            )}
            {profile.headline && <p className="pp-headline">{profile.headline}</p>}

            <div className="pp-stats">
              <div className="pp-stat">
                <span className="pp-stat-val">{rating > 0 ? `★ ${rating.toFixed(1)}` : 'New'}</span>
                <span className="pp-stat-label">
                  {profile.review_count > 0
                    ? `${profile.review_count} review${profile.review_count === 1 ? '' : 's'}`
                    : 'No reviews yet'}
                </span>
              </div>
              {skills.length > 0 && (
                <div className="pp-stat">
                  <span className="pp-stat-val">{skills.length}</span>
                  <span className="pp-stat-label">{skills.length === 1 ? 'Skill' : 'Skills'}</span>
                </div>
              )}
              {projects.length > 0 && (
                <div className="pp-stat">
                  <span className="pp-stat-val">{projects.length}</span>
                  <span className="pp-stat-label">{projects.length === 1 ? 'Project' : 'Projects'}</span>
                </div>
              )}
            </div>

            <div className="pp-hero-actions">
              <button type="button" className="pp-cta" onClick={join}>
                Hire {profile.username}
              </button>
              {whatsapp && (
                <a className="pp-ghost" href={whatsapp} target="_blank" rel="noreferrer">
                  {WhatsAppIcon} WhatsApp
                </a>
              )}
            </div>
          </section>

          {profile.bio && (
            <section className="pp-section">
              <h2 className="pp-section-title">About</h2>
              <p className="pp-bio">{profile.bio}</p>
            </section>
          )}

          {skills.length > 0 && (
            <section className="pp-section">
              <h2 className="pp-section-title">Skills</h2>
              <div className="pp-skills">
                {skills.map(sk => (
                  <span key={sk.name} className={`pp-skill ${sk.verified_endorsements > 0 ? 'is-verified' : ''}`}>
                    {sk.name}
                    {sk.endorsements > 0 && <b>{sk.endorsements}</b>}
                    {sk.verified_endorsements > 0 && (
                      <span className="pp-skill-check" title="Endorsed by someone who's worked with them">✓</span>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section className="pp-section">
              <h2 className="pp-section-title">Work</h2>
              <div className="pp-projects">
                {projects.slice(0, 6).map(p => (
                  <article key={p.id} className="pp-project">
                    {p.media?.[0]?.url && p.media[0].media_type === 'image' && (
                      <img className="pp-project-img" src={cldThumb(p.media[0].url, 600)} alt="" loading="lazy" />
                    )}
                    <div className="pp-project-body">
                      <div className="pp-project-top">
                        <span className="pp-project-type">{p.portfolio_type}</span>
                        {p.verified && <span className="pp-project-verified">✓ Verified</span>}
                      </div>
                      <h3 className="pp-project-title">{p.title}</h3>
                      {p.description && <p className="pp-project-desc">{p.description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section className="pp-section">
              <div className="pp-section-head">
                <h2 className="pp-section-title">Reviews</h2>
                <span className="pp-review-avg">★ {rating.toFixed(1)} · {reviews.length}</span>
              </div>
              <div className="pp-reviews">
                {(allReviews ? reviews : reviews.slice(0, 3)).map(r => (
                  <article key={r.id} className="pp-review">
                    <div className="pp-review-top">
                      <span className="pp-review-stars" aria-label={`${r.rating} out of 5`}>
                        {'★★★★★'.slice(0, r.rating)}
                        <span className="is-off">{'★★★★★'.slice(r.rating)}</span>
                      </span>
                      <span className="pp-review-when">{reviewDate(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="pp-review-text">{r.comment}</p>}
                    <span className="pp-review-from">{r.from}</span>
                  </article>
                ))}
              </div>
              {reviews.length > 3 && (
                <button type="button" className="pp-more" onClick={() => setAllReviews(v => !v)}>
                  {allReviews ? 'Show fewer' : `Show all ${reviews.length} reviews`}
                </button>
              )}
            </section>
          )}

          <section className="pp-final">
            <h2 className="pp-final-title">Want to work with {profile.username}?</h2>
            <p className="pp-final-sub">
              Join DoitHere to message them, hire them for a gig, or get found the same way —
              by people right around you.
            </p>
            <div className="pp-final-actions">
              <button type="button" className="pp-cta" onClick={join}>Join free</button>
              <button type="button" className="pp-ghost" onClick={() => navigate('/')}>See how it works</button>
            </div>
            <span className="pp-final-note">Free to join · No card needed</span>
          </section>
        </main>
      )}
    </div>
  );
}
