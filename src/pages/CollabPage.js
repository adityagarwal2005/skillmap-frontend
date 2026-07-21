import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import {
  getMyCollabPosts, createCollabPost,
  applyToCollab, getCollabApplicants, respondToCollabRequest, closeCollabPost
} from '../api/collab';
import API from '../api/config';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
import Lightbox from '../components/Lightbox';
import './FeedPage.css';
import './FreelancePage.css';   // Collab reuses .freelance-header/.wr-* card styles
import './CollabPage.css';

export default function CollabPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [tab, setTab]           = useState('browse');
  const [posts, setPosts]       = useState([]);
  const [myPosts, setMyPosts]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [radius, setRadius]         = useState(50);
  const [userLocation, setUserLocation] = useState({ lat: '', lon: '' });
  const [hasMoreBrowse, setHasMoreBrowse] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [createModal, setCreateModal]         = useState(false);
  const [applyModal, setApplyModal]           = useState(null);
  const [applicantsModal, setApplicantsModal] = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const [createForm, setCreateForm] = useState({ title: '', description: '', skills: '', range_km: 50 });
  const [collabMedia, setCollabMedia] = useState(null);
  const [applyMsg, setApplyMsg]     = useState('');

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Opened from the "Post" chooser (/collab?new=1) → jump straight to the form.
  useEffect(() => {
    if (searchParams.get('new') === '1') setCreateModal(true);
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  // Geolocation resolves asynchronously — the first loadAll() above often
  // fires before it's ready, so radius filtering gets silently skipped.
  // Re-run once we actually have a location, so distance filtering applies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (userLocation.lat) loadAll(); }, [userLocation.lat]);

  const browseParams = (radiusOverride) => {
    const params = {};
    if (skillFilter)      params.skill      = skillFilter;
    const r = radiusOverride ?? radius;
    if (r)                params.radius     = r;
    if (userLocation.lat) {
      params.latitude  = userLocation.lat;
      params.longitude = userLocation.lon;
    }
    return params;
  };

  const loadAll = async (radiusOverride) => {
    try {
      setLoading(true);
      const [bRes, mRes] = await Promise.all([
        API.get('/collab/', { params: browseParams(radiusOverride) }),
        getMyCollabPosts(),
      ]);
      setPosts(bRes.data.collab_posts || []);
      setMyPosts(mRes.data.collab_posts || []);
      setHasMoreBrowse(!!bRes.data.has_more);
    } catch { showToast('Failed to load collabs', 'error'); }
    finally { setLoading(false); }
  };

  const handleLoadMoreBrowse = async () => {
    setLoadingMore(true);
    try {
      const params = { ...browseParams(), offset: posts.length };
      const res = await API.get('/collab/', { params });
      setPosts(prev => [...prev, ...(res.data.collab_posts || [])]);
      setHasMoreBrowse(!!res.data.has_more);
    } catch { showToast('Failed to load more', 'error'); }
    finally { setLoadingMore(false); }
  };

  const handleCreate = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      // Attach the poster's location so the post can be found by radius.
      const payload = { ...createForm };
      if (userLocation.lat) {
        payload.latitude = userLocation.lat;
        payload.longitude = userLocation.lon;
      }
      if (collabMedia) payload.media = collabMedia;
      await createCollabPost(payload);
      showToast('Collab post created!', 'success');
      setCreateModal(false);
      setCreateForm({ title: '', description: '', skills: '', range_km: 50 });
      setCollabMedia(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApply = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await applyToCollab(applyModal.id, applyMsg);
      showToast('Application sent!', 'success');
      setApplyModal(null);
      setApplyMsg('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to apply', 'error');
    } finally { setSubmitting(false); }
  };

  const loadApplicants = async (postId) => {
    try {
      const res = await getCollabApplicants(postId);
      setApplicantsModal({ postId, applicants: res.data.applicants || [] });
    } catch { showToast('Failed to load applicants', 'error'); }
  };

  const handleRespond = async (requestId, status) => {
    try {
      const res = await respondToCollabRequest(requestId, status);
      showToast(status === 'accepted' ? 'Accepted! Conversation started.' : 'Declined', 'success');
      if (status === 'accepted' && res.data.conversation_id) navigate('/messages');
      setApplicantsModal(null);
      loadAll();
    } catch { showToast('Failed to respond', 'error'); }
  };

  const handleClose = async (postId) => {
    try {
      await closeCollabPost(postId);
      showToast('Collab closed', 'success');
      loadAll();
    } catch { showToast('Failed to close', 'error'); }
  };

  return (
    <AppShell active="collab">
      <div className="collab-wrapper">
        <div className="freelance-header">
          <div>
            <h1 className="freelance-title">Collab</h1>
            <p className="freelance-sub">Find people to build something together</p>
          </div>
          <button className="post-job-btn" onClick={() => setCreateModal(true)}>+ Start a Collab</button>
        </div>

        <div className="collab-controls">
          <div className="tab-group">
            <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse ({posts.length})</button>
            <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Posts ({myPosts.length})</button>
          </div>
        </div>

        {tab === 'browse' && (
          <>
            <button
              className={`near-me-chip ${Number(radius) === 5 ? 'active' : ''}`}
              onClick={() => {
                if (!userLocation.lat) {
                  showToast('Turn on location to use Near me', 'error');
                  return;
                }
                const next = Number(radius) === 5 ? 50 : 5;
                setRadius(next);
                loadAll(next);
              }}>
              📍 Near me (5km)
            </button>
            <div className="freelance-filters">
              <input
                className="filter-input"
                placeholder="Filter by skill (e.g. React, Python)"
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadAll(); }}
              />
              <select className="filter-select-sm"
                value={radius}
                onChange={e => setRadius(e.target.value)}>
                <option value={0.5}>0.5 km</option>
                <option value={1}>1 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
              <button className="wr-view-btn" onClick={() => loadAll()}>Search</button>
            </div>
          </>
        )}

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton /></div>
        ) : tab === 'browse' ? (
          posts.length === 0 ? (
            <div className="state-box">
              <h3>No collab posts found</h3>
              <p>Try a different skill, increase your range — or be the first to start one.</p>
              <div className="state-box-actions">
                <button className="opp-cta" onClick={() => setCreateModal(true)}>+ Start a Collab</button>
                <button className="opp-cta ghost" onClick={() => navigate('/freelance')}>Browse jobs instead</button>
              </div>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="collab-card">
              <div className="collab-top">
                <div className="post-ava small">{post.posted_by[0].toUpperCase()}</div>
                <span className="wr-by">{post.posted_by}</span>
                {post.distance_km != null && <span className="wr-time">📍 {post.distance_km} km</span>}
              </div>
              <h3 className="collab-title">{post.title}</h3>
              <p className="wr-desc">{post.description}</p>
              {post.media && (
                <div className="post-media">
                  {post.media_type === 'video'
                    ? <video className="post-media-el" src={post.media} controls playsInline />
                    : <img className="post-media-el" src={post.media} alt=""
                        onClick={() => setLightboxSrc(post.media)} />}
                </div>
              )}
              <div className="wr-skills">
                {post.skills_needed?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <span className="wr-duration">{post.applicants} applicants</span>
                <button className="wr-apply-btn" onClick={() => setApplyModal(post)}>Apply</button>
              </div>
            </div>
          ))
        ) : null}

        {tab === 'browse' && !loading && hasMoreBrowse && (
          <button className="load-more-btn" onClick={handleLoadMoreBrowse} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {tab === 'my' && (
          myPosts.length === 0 ? (
            <div className="state-box">
              <h3>No collab posts yet</h3>
              <p>Start a collab to find teammates</p>
            </div>
          ) : myPosts.map(post => (
            <div key={post.id} className="collab-card">
              <div className="collab-top">
                <span className={`profile-status-badge ${post.status === 'open' ? 'status-green' : 'status-gray'}`}>
                  {post.status}
                </span>
              </div>
              <h3 className="collab-title">{post.title}</h3>
              <p className="wr-desc">{post.description}</p>
              {post.media && (
                <div className="post-media">
                  {post.media_type === 'video'
                    ? <video className="post-media-el" src={post.media} controls playsInline />
                    : <img className="post-media-el" src={post.media} alt=""
                        onClick={() => setLightboxSrc(post.media)} />}
                </div>
              )}
              <div className="wr-skills">
                {post.skills_needed?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <span className="wr-duration">{post.applicants} applicants</span>
                <div className="wr-owner-actions">
                  {post.status === 'open' && (
                    <>
                      <button className="wr-view-btn" onClick={() => loadApplicants(post.id)}>View Applicants</button>
                      <button className="wr-close-btn" onClick={() => handleClose(post.id)}>Close</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Start a Collab</h2>
            <form onSubmit={handleCreate}>
              <div className="modal-field">
                <label className="modal-label">Title *</label>
                <input className="modal-input" required placeholder="What are you building?"
                  value={createForm.title}
                  onChange={e => setCreateForm({...createForm, title: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Description *</label>
                <textarea className="modal-textarea" required rows={3}
                  placeholder="Tell people about your project idea..."
                  value={createForm.description}
                  onChange={e => setCreateForm({...createForm, description: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Skills Needed <span style={{fontWeight:400,color:'var(--text-3)'}}>comma separated</span></label>
                <input className="modal-input" placeholder="React, Python, Design"
                  value={createForm.skills}
                  onChange={e => setCreateForm({...createForm, skills: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Visible within</label>
                <select className="modal-input"
                  value={createForm.range_km}
                  onChange={e => setCreateForm({...createForm, range_km: e.target.value})}>
                  <option value={0.5}>0.5 km</option>
                  <option value={1}>1 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>
              <div className="modal-field">
                <label className="modal-label">Image / video <span style={{fontWeight:400,color:'var(--text-3)'}}>optional</span></label>
                {collabMedia ? (
                  <div className="post-media-chip">
                    <span className="post-media-chip-name">{collabMedia.name}</span>
                    <button type="button" onClick={() => setCollabMedia(null)}>×</button>
                  </div>
                ) : (
                  <label className="post-media-pick">
                    <input type="file" accept="image/*,video/*" hidden
                      onChange={async e => {
                        const f = e.target.files[0]; e.target.value = '';
                        if (!f) return;
                        const prepared = await prepareMediaFile(f, showToast);
                        if (prepared) setCollabMedia(prepared);
                      }} />
                    + Attach image or video
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setCreateModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Collab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyModal && (
        <div className="modal-overlay" onClick={() => setApplyModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Apply to Collab</h2>
            <div className="apply-job-preview">
              <h3 style={{fontSize:'0.9375rem',fontWeight:700,color:'var(--text-1)',marginBottom:'4px'}}>{applyModal.title}</h3>
              <p style={{fontSize:'0.8125rem',color:'var(--text-2)'}}>{applyModal.description}</p>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-field">
                <label className="modal-label">Message (optional)</label>
                <textarea className="modal-textarea" rows={3}
                  placeholder="Why do you want to collab?"
                  value={applyMsg}
                  onChange={e => setApplyMsg(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setApplyModal(null)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={submitting}>
                  {submitting ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicants Modal */}
      {applicantsModal && (
        <div className="modal-overlay" onClick={() => setApplicantsModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Applicants ({applicantsModal.applicants.length})</h2>
            {applicantsModal.applicants.length === 0 ? (
              <p style={{color:'var(--text-2)',fontSize:'0.875rem'}}>No applicants yet</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',maxHeight:'320px',overflowY:'auto'}}>
                {applicantsModal.applicants.map(a => (
                  <div key={a.id} className="applicant-row">
                    <div className="post-ava small">{a.applicant[0].toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <span className="applicant-name">{a.applicant}</span>
                      {a.message && <p className="applicant-msg">{a.message}</p>}
                    </div>
                    {a.status === 'pending' && (
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="hire-btn" onClick={() => handleRespond(a.id, 'accepted')}>Accept</button>
                        <button className="wr-view-btn" onClick={() => handleRespond(a.id, 'declined')}>Decline</button>
                      </div>
                    )}
                    {a.status !== 'pending' && (
                      <span className={`profile-status-badge ${a.status === 'accepted' ? 'status-green' : 'status-gray'}`}>
                        {a.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions" style={{marginTop:'16px'}}>
              <button className="modal-cancel" onClick={() => setApplicantsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </AppShell>
  );
}