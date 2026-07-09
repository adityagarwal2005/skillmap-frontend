import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getUser, addSkill, removeSkill, updateStatus, getUserPortfolio,
  blockUser, unblockUser, getBlockedUsers, reportContent,
} from '../api/users';
import { startConversation } from '../api/work';
import { endorseSkill } from '../api/users';
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

const REPORT_REASONS = [
  { value: 'spam',          label: 'Spam' },
  { value: 'harassment',    label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'scam',          label: 'Scam or fraud' },
  { value: 'other',         label: 'Other' },
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

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

  useEffect(() => {
    if (isOwn) return;
    getBlockedUsers()
      .then(r => setIsBlocked((r.data.blocked_users || []).some(b => b.id === parseInt(userId))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOwn]);

  const handleToggleBlock = async () => {
    try {
      setBlocking(true);
      if (isBlocked) {
        await unblockUser(userId);
        setIsBlocked(false);
        showToast(`Unblocked ${profile.username}`, 'success');
      } else {
        await blockUser(userId);
        setIsBlocked(true);
        showToast(`Blocked ${profile.username}`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update block', 'error');
    } finally {
      setBlocking(false);
    }
  };

  const handleSubmitReport = async () => {
    try {
      setSubmittingReport(true);
      await reportContent('user', userId, reportReason, reportDetails);
      showToast('Report submitted. Thanks for helping keep SkillMap safe.', 'success');
      setReportModal(false);
      setReportDetails('');
      setReportReason('spam');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
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

  const [endorsing, setEndorsing] = useState('');
  const handleEndorse = async (skill) => {
    try {
      setEndorsing(skill);
      await endorseSkill(userId, skill);
      loadProfile();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not endorse', 'error');
    } finally {
      setEndorsing('');
    }
  };

  const [messaging, setMessaging] = useState(false);
  const handleMessage = async () => {
    try {
      setMessaging(true);
      const r = await startConversation(userId);
      navigate(`/messages?c=${r.data.conversation_id}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not start chat', 'error');
    } finally {
      setMessaging(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${userId}`;
    // Native share sheet on mobile; clipboard copy everywhere else.
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.username} on SkillMap`, url }); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied!', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
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
                {profile.headline && <p className="profile-headline">{profile.headline}</p>}
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
                  {isOwn && (
                    <div className="profile-stat">
                      <span className="profile-stat-val">{profile.profile_views ?? 0}</span>
                      <span className="profile-stat-label">Views</span>
                    </div>
                  )}
                </div>
              </div>

              {isOwn ? (
                <div className="profile-owner-actions">
                  <select className="status-select" value={profile.status} onChange={handleStatusChange}>
                    <option value="not_available">Not Available</option>
                    <option value="open_to_freelance">Open to Freelance</option>
                    <option value="open_to_work">Open to Work</option>
                  </select>
                  <button className="edit-profile-btn" onClick={() => navigate(`/profile/${userId}/edit`)}>
                    Edit Profile
                  </button>
                  <button className="edit-profile-btn profile-share-btn" onClick={handleShare}>
                    ↗ Share
                  </button>
                </div>
              ) : (
                <div className="profile-owner-actions">
                  {!isBlocked && (
                    <button className="edit-profile-btn profile-msg-btn"
                      onClick={handleMessage} disabled={messaging}>
                      {messaging ? '…' : '💬 Message'}
                    </button>
                  )}
                  <button className="edit-profile-btn profile-share-btn" onClick={handleShare}>
                    ↗ Share
                  </button>
                  <button className="edit-profile-btn" onClick={() => setReportModal(true)}>
                    Report
                  </button>
                  <button className={`edit-profile-btn ${isBlocked ? '' : 'is-danger'}`}
                    onClick={handleToggleBlock} disabled={blocking}>
                    {blocking ? '…' : isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              )}
            </div>

            {profile.bio && (
              <div className="profile-skills-section">
                <h3 className="section-title">About</h3>
                <p className="profile-bio">{profile.bio}</p>
              </div>
            )}

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
                {(profile.skills_detail || (profile.skills || []).map(n => ({ name: n, endorsements: 0, endorsed_by_me: false }))).map(sk => (
                  <span key={sk.name} className={`skill-tag ${sk.endorsements > 0 ? 'has-endorse' : ''}`}>
                    {sk.name}
                    {sk.endorsements > 0 && <span className="skill-endorse-count">{sk.endorsements}</span>}
                    {isOwn ? (
                      <button className="skill-remove" onClick={() => handleRemoveSkill(sk.name)}>×</button>
                    ) : (
                      <button className={`skill-endorse-btn ${sk.endorsed_by_me ? 'active' : ''}`}
                        disabled={endorsing === sk.name}
                        title={sk.endorsed_by_me ? 'Remove endorsement' : 'Endorse this skill'}
                        onClick={() => handleEndorse(sk.name)}>
                        {sk.endorsed_by_me ? '✓' : '+'}
                      </button>
                    )}
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

      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Report {profile?.username}</h2>
            <div className="modal-field">
              <label className="modal-label">Reason</label>
              <select className="modal-input" value={reportReason}
                onChange={e => setReportReason(e.target.value)}>
                {REPORT_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Details (optional)</label>
              <textarea className="modal-textarea" rows={3}
                placeholder="Anything that helps us understand the issue…"
                value={reportDetails} onChange={e => setReportDetails(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={() => setReportModal(false)}>Cancel</button>
              <button type="button" className="modal-submit" onClick={handleSubmitReport} disabled={submittingReport}>
                {submittingReport ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
