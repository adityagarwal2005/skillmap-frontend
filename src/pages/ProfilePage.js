import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUser, addSkill, removeSkill, updateStatus, getUserPortfolio } from '../api/users';
import { ProfileHeaderSkeleton } from '../components/Skeleton';
import AppShell from '../components/AppShell';
import { LinkedInIcon, GitHubIcon, InstagramIcon } from '../components/SocialIcons';
import './FeedPage.css';
import './ProfilePage.css';

const SOCIALS = [
  { key: 'linkedin_url',  label: 'LinkedIn',  brand: 'linkedin',  icon: LinkedInIcon },
  { key: 'github_url',    label: 'GitHub',    brand: 'github',    icon: GitHubIcon },
  { key: 'instagram_url', label: 'Instagram', brand: 'instagram', icon: InstagramIcon },
];

export default function ProfilePage() {
  const { userId }              = useParams();
  const { user: authUser }      = useAuth();
  const { showToast }           = useToast();
  const navigate                = useNavigate();

  const [profile, setProfile]       = useState(null);
  const [portfolio, setPortfolio]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const isOwn = authUser?.id === parseInt(userId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProfile(); }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [uRes, pRes] = await Promise.all([
        getUser(userId),
        getUserPortfolio(userId).catch(() => ({ data: { items: [] } })),
      ]);
      setProfile(uRes.data);
      setPortfolio(pRes.data.items || []);
      setAvatarBroken(false);
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async e => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    try {
      setAddingSkill(true);
      await addSkill(userId, skillInput.trim());
      setSkillInput('');
      showToast('Skill added', 'success');
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add skill', 'error');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async skill => {
    try {
      await removeSkill(userId, skill);
      showToast('Skill removed', 'success');
      loadProfile();
    } catch { showToast('Failed to remove skill', 'error'); }
  };

  const handleStatusChange = async e => {
    try {
      await updateStatus(e.target.value);
      showToast('Status updated', 'success');
      loadProfile();
    } catch { showToast('Failed to update status', 'error'); }
  };

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

  const links = SOCIALS.filter(s => profile?.[s.key]);
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <AppShell active="profile">
      <div className="profile-wrapper">
        {loading ? (
          <ProfileHeaderSkeleton />
        ) : !profile ? (
          <div className="profile-loading">User not found</div>
        ) : (
          <>
            <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>

            {/* Header */}
            <div className="profile-header">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  {profile.profile_image && !avatarBroken
                    ? <img className="ava-img" src={profile.profile_image} alt={profile.username}
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
                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="profile-stat-val">{portfolio.length}</span>
                    <span className="profile-stat-label">Work</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-val">{profile.skills?.length || 0}</span>
                    <span className="profile-stat-label">Skills</span>
                  </div>
                  {memberSince && (
                    <div className="profile-stat">
                      <span className="profile-stat-val">{memberSince}</span>
                      <span className="profile-stat-label">Since</span>
                    </div>
                  )}
                </div>
              </div>

              {isOwn && (
                <div className="profile-owner-actions">
                  <select className="status-select" value={profile.status} onChange={handleStatusChange}>
                    <option value="not_available">Not Available</option>
                    <option value="open_to_freelance">Open to Freelance</option>
                    <option value="open_to_work">Open to Work</option>
                  </select>
                  <button className="edit-profile-btn" onClick={() => navigate(`/profile/${userId}/edit`)}>
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Social accounts — the identity hub */}
            <div className="profile-skills-section">
              <h3 className="section-title">My accounts</h3>
              <div className="socials-grid">
                {SOCIALS.map(s => {
                  const url = profile[s.key];
                  return url ? (
                    <a key={s.key} href={url} target="_blank" rel="noreferrer"
                      className="social-card">
                      <span className={`social-glyph ${s.brand}`}>{s.icon}</span>
                      <span className="social-meta">
                        <span className="social-label">{s.label}</span>
                        <span className="social-open">Open profile ↗</span>
                      </span>
                    </a>
                  ) : (
                    <div key={s.key} className="social-card is-disconnected">
                      <span className={`social-glyph ${s.brand} muted`}>{s.icon}</span>
                      <span className="social-meta">
                        <span className="social-label">{s.label}</span>
                        <span className="social-open">
                          {isOwn ? 'Add in Edit Profile' : 'Not connected'}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skills */}
            <div className="profile-skills-section">
              <h3 className="section-title">Skills</h3>
              <div className="skills-list">
                {profile.skills?.map(skill => (
                  <span key={skill} className="skill-tag">
                    {skill}
                    {isOwn && <button className="skill-remove" onClick={() => handleRemoveSkill(skill)}>×</button>}
                  </span>
                ))}
                {profile.skills?.length === 0 && <span className="no-skills">No skills added yet</span>}
              </div>
              {isOwn && (
                <form onSubmit={handleAddSkill} className="add-skill-form">
                  <input type="text" placeholder="Add a skill..."
                    value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    className="skill-input" />
                  <button type="submit" className="skill-add-btn" disabled={addingSkill}>
                    {addingSkill ? '...' : 'Add'}
                  </button>
                </form>
              )}
            </div>

            {/* Work */}
            <div className="profile-skills-section">
              <h3 className="section-title">Work</h3>
              {portfolio.length === 0 ? (
                <p className="no-skills">
                  {isOwn ? "You haven't posted any work yet." : 'No work posted yet.'}
                </p>
              ) : (
                <div className="portfolio-grid">
                  {portfolio.map(p => (
                    <div key={p.id} className="portfolio-card"
                      onClick={() => navigate(`/post/${p.id}`)}>
                      {p.media?.[0]?.url && p.media[0].media_type === 'image' && (
                        <img src={p.media[0].url} alt={p.title} className="portfolio-card-img" />
                      )}
                      <div className="portfolio-card-body">
                        <div className="portfolio-card-top">
                          <span className="portfolio-type">{p.portfolio_type}</span>
                          {p.verified && <span className="verified-dot">✓ Verified</span>}
                        </div>
                        <h3 className="portfolio-card-title">{p.title}</h3>
                        <p className="portfolio-card-desc">{p.description}</p>
                        <div className="portfolio-card-footer">
                          <span className="portfolio-card-stat">🔥 {p.reactions}</span>
                          <span className="portfolio-card-stat">💬 {p.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
