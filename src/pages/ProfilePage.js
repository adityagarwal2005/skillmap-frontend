import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getUser, getUserPortfolio, getUserReviews, getUserCertificates,
  addSkill, removeSkill, updateStatus,
  addCertificate, removeCertificate, addReview
} from '../api/users';
import { ProfileHeaderSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './ProfilePage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function ProfilePage() {
  const { userId }              = useParams();
  const { user: authUser, logoutUser } = useAuth();
  const { showToast }           = useToast();
  const navigate                = useNavigate();

  const [profile, setProfile]       = useState(null);
  const [portfolio, setPortfolio]   = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [certificates, setCerts]    = useState([]);
  const [tab, setTab]               = useState('portfolio');
  const [loading, setLoading]       = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [theme, setTheme]           = useState(localStorage.getItem('theme') || 'dark');

  // Cert modal
  const [certModal, setCertModal]   = useState(false);
  const [certForm, setCertForm]     = useState({ title: '', issued_by: '', issued_date: '', certificate_url: '' });
  const [certImg, setCertImg]       = useState(null);
  const [certLoading, setCertLoading] = useState(false);

  // Review modal
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm, setReviewForm]   = useState({ rating: 0, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  const isOwn = authUser?.id === parseInt(userId);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [userId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, rRes, cRes] = await Promise.all([
        getUser(userId),
        getUserPortfolio(userId),
        getUserReviews(userId),
        getUserCertificates(userId),
      ]);
      setProfile(uRes.data);
      setPortfolio(pRes.data.items || []);
      setReviews(rRes.data.reviews || []);
      setCerts(cRes.data.certificates || []);
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
      loadAll();
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
      loadAll();
    } catch { showToast('Failed to remove skill', 'error'); }
  };

  const handleStatusChange = async e => {
    try {
      await updateStatus(e.target.value);
      showToast('Status updated', 'success');
      loadAll();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleAddCert = async e => {
    e.preventDefault();
    try {
      setCertLoading(true);
      const fd = new FormData();
      Object.entries(certForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (certImg) fd.append('image', certImg);
      await addCertificate(fd);
      showToast('Certificate added', 'success');
      setCertModal(false);
      setCertForm({ title: '', issued_by: '', issued_date: '', certificate_url: '' });
      setCertImg(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add certificate', 'error');
    } finally {
      setCertLoading(false);
    }
  };

  const handleDeleteCert = async certId => {
    try {
      await removeCertificate(certId);
      showToast('Certificate removed', 'success');
      loadAll();
    } catch { showToast('Failed to remove certificate', 'error'); }
  };

  const handleAddReview = async e => {
    e.preventDefault();
    if (!reviewForm.rating) { showToast('Please select a rating', 'error'); return; }
    try {
      setReviewLoading(true);
      await addReview(userId, reviewForm);
      showToast('Review submitted', 'success');
      setReviewModal(false);
      setReviewForm({ rating: 0, comment: '' });
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    } finally {
      setReviewLoading(false);
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

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <div className="topbar-right">
          <button className="topbar-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{authUser?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{authUser?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

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
                <div className="profile-avatar">{profile.username[0].toUpperCase()}</div>
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
                {(profile.linkedin_url || profile.github_url) && (
                  <div className="profile-links">
                    {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="profile-link">LinkedIn ↗</a>}
                    {profile.github_url   && <a href={profile.github_url}   target="_blank" rel="noreferrer" className="profile-link">GitHub ↗</a>}
                  </div>
                )}
                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="profile-stat-val">{portfolio.length}</span>
                    <span className="profile-stat-label">Projects</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-val">{profile.rating > 0 ? profile.rating.toFixed(1) : '—'}</span>
                    <span className="profile-stat-label">Rating</span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-val">{reviews.length}</span>
                    <span className="profile-stat-label">Reviews</span>
                  </div>
                </div>
              </div>

              <div className="profile-owner-actions">
                {isOwn ? (
                  <>
                    <select className="status-select" value={profile.status} onChange={handleStatusChange}>
                      <option value="not_available">Not Available</option>
                      <option value="open_to_freelance">Open to Freelance</option>
                      <option value="open_to_work">Open to Work</option>
                    </select>
                    <button className="edit-profile-btn" onClick={() => navigate(`/profile/${userId}/edit`)}>
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <button className="edit-profile-btn" onClick={() => setReviewModal(true)}>
                    Leave a Review
                  </button>
                )}
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

            {/* Tabs */}
            <div className="profile-tabs">
              {['portfolio', 'certificates', 'reviews'].map(t => (
                <button key={t} className={`profile-tab ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}>
                  {t === 'portfolio'     ? `Portfolio (${portfolio.length})` :
                   t === 'certificates'  ? `Certificates (${certificates.length})` :
                   `Reviews (${reviews.length})`}
                </button>
              ))}
            </div>

            {/* Portfolio Tab */}
            {tab === 'portfolio' && (
              <div className="portfolio-grid">
                {portfolio.length === 0 ? (
                  <div className="empty-state">
                    <p>No portfolio items yet</p>
                    {isOwn && <button className="cta-btn" onClick={() => navigate('/create-post')}>Post your first project</button>}
                  </div>
                ) : portfolio.map(item => (
                  <div key={item.id} className="portfolio-card"
                    onClick={() => navigate(`/post/${item.id}`)}>
                    {item.media?.[0]?.url && item.media[0].media_type === 'image' && (
                      <img src={item.media[0].url} alt={item.title} className="portfolio-card-img" />
                    )}
                    <div className="portfolio-card-body">
                      <div className="portfolio-card-top">
                        <span className="portfolio-type">{item.portfolio_type}</span>
                        {item.verified && <span className="verified-dot">✓ Verified</span>}
                      </div>
                      <h3 className="portfolio-card-title">{item.title}</h3>
                      <p className="portfolio-card-desc">{item.description}</p>
                      <div className="portfolio-card-tags">
                        {item.skills?.map(s => <span key={s} className="mini-tag green">{s}</span>)}
                        {item.tags?.map(t => <span key={t} className="mini-tag gray">{t}</span>)}
                      </div>
                      <div className="portfolio-card-footer">
                        <span className="portfolio-card-stat">🔥 {item.reactions}</span>
                        <span className="portfolio-card-stat">💬 {item.comments}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Certificates Tab */}
            {tab === 'certificates' && (
              <div className="certificates-list">
                {certificates.length === 0 && (
                  <div className="empty-state"><p>No certificates yet</p></div>
                )}
                {certificates.map(c => (
                  <div key={c.id} className="cert-card">
                    {c.image_url && <img src={c.image_url} alt={c.title} className="cert-img" />}
                    <div className="cert-info">
                      <div className="cert-title">{c.title}</div>
                      <div className="cert-issuer">Issued by {c.issued_by}</div>
                      {c.issued_date && <div className="cert-date">{c.issued_date}</div>}
                      {c.certificate_url && (
                        <a href={c.certificate_url} target="_blank" rel="noreferrer" className="cert-link">
                          View Certificate ↗
                        </a>
                      )}
                    </div>
                    {isOwn && (
                      <button className="cert-delete" onClick={() => handleDeleteCert(c.id)}>×</button>
                    )}
                  </div>
                ))}
                {isOwn && (
                  <button className="add-cert-btn" onClick={() => setCertModal(true)}>
                    + Add Certificate
                  </button>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {tab === 'reviews' && (
              <div className="reviews-list">
                {reviews.length === 0 && (
                  <div className="empty-state"><p>No reviews yet</p></div>
                )}
                {reviews.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="review-top">
                      <div className="review-avatar">{r.from[0].toUpperCase()}</div>
                      <div className="review-meta">
                        <span className="review-from">{r.from}</span>
                        <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      </div>
                      <span className="review-rating-num">{r.rating}.0</span>
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Certificate Modal */}
      {certModal && (
        <div className="modal-overlay" onClick={() => setCertModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Certificate</h2>
            <form onSubmit={handleAddCert}>
              <div className="modal-field">
                <label className="modal-label">Title *</label>
                <input className="modal-input" required
                  value={certForm.title}
                  onChange={e => setCertForm({...certForm, title: e.target.value})}
                  placeholder="e.g. React Developer Certification" />
              </div>
              <div className="modal-field">
                <label className="modal-label">Issued by *</label>
                <input className="modal-input" required
                  value={certForm.issued_by}
                  onChange={e => setCertForm({...certForm, issued_by: e.target.value})}
                  placeholder="e.g. Coursera, Google, Udemy" />
              </div>
              <div className="modal-field">
                <label className="modal-label">Issue Date</label>
                <input className="modal-input" type="date"
                  value={certForm.issued_date}
                  onChange={e => setCertForm({...certForm, issued_date: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Certificate URL</label>
                <input className="modal-input" type="url"
                  value={certForm.certificate_url}
                  onChange={e => setCertForm({...certForm, certificate_url: e.target.value})}
                  placeholder="https://..." />
              </div>
              <div className="modal-field">
                <label className="modal-label">Image (optional)</label>
                <input type="file" accept="image/*"
                  onChange={e => setCertImg(e.target.files[0])}
                  style={{ color: 'var(--text-2)', fontSize: '0.8125rem' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setCertModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={certLoading}>
                  {certLoading ? 'Adding...' : 'Add Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Review Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Leave a Review</h2>
            <form onSubmit={handleAddReview}>
              <div className="modal-field">
                <label className="modal-label">Rating *</label>
                <div className="star-row">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      className={`star-btn ${reviewForm.rating >= n ? 'active' : ''}`}
                      onClick={() => setReviewForm({...reviewForm, rating: n})}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-field">
                <label className="modal-label">Comment (optional)</label>
                <textarea className="modal-textarea"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  placeholder="Share your experience..." rows={3} />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setReviewModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={reviewLoading}>
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}