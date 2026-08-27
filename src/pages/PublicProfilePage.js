import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUserByUsername } from '../api/users';
import { cldAvatar } from '../utils/cloudinaryUrl';
import usePageMeta from '../hooks/usePageMeta';
import Logo from '../components/Logo';
import './ProfilePage.css';
import './PublicProfilePage.css';

const WhatsAppIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2a.4.4 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3A2.8 2.8 0 0 0 6.8 10c0 1.6 1.2 3.2 1.4 3.4s2.3 3.6 5.6 5c.8.3 1.4.5 1.9.4.6-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1-.3-.2-.6-.3z"/>
  </svg>
);

const SOCIALS = [
  { key: 'whatsapp', label: 'WhatsApp', brand: 'whatsapp', icon: WhatsAppIcon },
];

const statusLabel = {
  open_to_freelance: 'Open to Freelance',
  open_to_work:      'Open to Work',
  not_available:     'Not Available',
};

const statusColor = {
  open_to_freelance: 'status-orange',
  open_to_work:      'status-green',
  not_available:     'status-gray',
};

/**
 * Public, no-login-required profile card — the thing worth sharing on
 * WhatsApp/LinkedIn. Deliberately minimal and read-only: no messaging,
 * friending, endorsing, or editing (those all require an account). Backed
 * by the same get_user payload as the authenticated profile page, which
 * already omits email for anyone who isn't viewing their own profile.
 */
export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  usePageMeta({
    title: profile ? `${profile.username}${profile.category ? ` — ${profile.category}` : ''}` : username,
    description: profile
      ? (profile.headline || profile.bio || `${profile.username} on DoitHere — ${profile.category || 'campus talent network'}.`)
      : `${username} on DoitHere`,
    path: `/u/${username}`,
    // Not-found pages have nothing worth indexing; real profiles are the
    // whole point of this page existing, so they stay indexable.
    noindex: notFound,
  });

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getUserByUsername(username)
      .then(r => setProfile(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  const links = profile ? SOCIALS.filter(s => !!profile[s.key]) : [];

  const skills = profile
    ? (profile.skills_detail || (profile.skills || []).map(n => ({ name: n, endorsements: 0 })))
    : [];

  return (
    <div className="public-profile-page">
      <header className="public-profile-topbar">
        <Link to="/" className="public-profile-brand">
          <Logo size={1.4} className="public-profile-brand-logo" />
        </Link>
        <button className="public-profile-cta" onClick={() => navigate('/login?mode=register')}>
          Join DoitHere
        </button>
      </header>

      <div className="profile-wrapper public-profile-wrapper">
        {loading ? (
          <div className="profile-loading">Loading…</div>
        ) : notFound || !profile ? (
          <div className="profile-loading">No one here by that name.</div>
        ) : (
          <>
            <div className="profile-header">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  {profile.profile_image && !avatarBroken
                    ? <img className="ava-img" src={cldAvatar(profile.profile_image, 200)} alt={profile.username}
                        onError={() => setAvatarBroken(true)} />
                    : profile.username[0].toUpperCase()}
                </div>
                {profile.status !== 'not_available' && <span className="profile-status-dot" />}
              </div>

              <div className="profile-info">
                <div className="profile-name-row">
                  <h1 className="profile-name">{profile.username}</h1>
                  <span className={`profile-status-badge ${statusColor[profile.status]}`}>
                    {statusLabel[profile.status]}
                  </span>
                </div>
                <p className="profile-category">{profile.category || 'Independent'}</p>
                {profile.headline && <p className="profile-headline">{profile.headline}</p>}
                <div className="profile-stats">
                  {skills.length > 0 && (
                    <div className="profile-stat">
                      <span className="profile-stat-val">{skills.length}</span>
                      <span className="profile-stat-label">Skills</span>
                    </div>
                  )}
                  {profile.review_count > 0 && (
                    <div className="profile-stat">
                      <span className="profile-stat-val">★ {profile.rating?.toFixed(1)}</span>
                      <span className="profile-stat-label">Rating ({profile.review_count})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <div className="profile-skills-section">
                <h3 className="section-title">About</h3>
                <p className="profile-bio">{profile.bio}</p>
              </div>
            )}

            {skills.length > 0 && (
              <div className="profile-skills-section">
                <h3 className="section-title">Skills</h3>
                <div className="skills-list">
                  {skills.map(sk => (
                    <span key={sk.name} className={`skill-tag ${sk.endorsements > 0 ? 'has-endorse' : ''}`}>
                      {sk.name}
                      {sk.endorsements > 0 && <span className="skill-endorse-count">{sk.endorsements}</span>}
                      {sk.verified_endorsements > 0 && (
                        <span className="skill-verified-badge" title="Endorsed by someone who's actually worked with them">
                          ✓ verified
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div className="profile-skills-section">
                <h3 className="section-title">Find {profile.username} elsewhere</h3>
                <div className="socials-grid">
                  {links.map(s => {
                    const raw = profile[s.key];
                    const url = s.key === 'whatsapp'
                      ? `https://wa.me/${String(raw).replace(/\D/g, '')}`
                      : raw;
                    return (
                      <a key={s.key} href={url} target="_blank" rel="noreferrer" className="social-card">
                        <span className={`social-glyph ${s.brand}`}>{s.icon}</span>
                        <span className="social-meta">
                          <span className="social-label">{s.label}</span>
                          <span className="social-open">Open profile ↗</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="public-profile-join-banner">
              <div>
                <strong>Want to hire {profile.username}, or get discovered like this?</strong>
                <span>Join DoitHere — freelance work, collabs, and people right around your campus.</span>
              </div>
              <button className="public-profile-cta" onClick={() => navigate('/login?mode=register')}>
                Join free
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
