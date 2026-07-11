import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import {
  getMyWorkRequests, createWorkRequest, respondToWorkRequest,
  getWorkRequestResponses, assignWorkRequest, closeWorkRequest, completeWorkRequest
} from '../api/work';
import API from '../api/config';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './FreelancePage.css';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

function postedAgo(createdAt) {
  if (!createdAt) return '';
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (secs < 60)   return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FreelancePage() {
  const { user }             = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [tab, setTab]               = useState('available');
  const [available, setAvailable]   = useState([]);
  const [myJobs, setMyJobs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [radius, setRadius]           = useState(50);
  const [userLocation, setUserLocation] = useState({ lat: '', lon: '' });
  const [hasMoreAvailable, setHasMoreAvailable] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newIds, setNewIds] = useState(() => new Set());   // freshly-arrived jobs to flash
  const seenIds = useRef(new Set());                        // every job id we've shown
  const pollRef = useRef(null);

  const [postModal, setPostModal]             = useState(false);
  const [applyModal, setApplyModal]           = useState(null);
  const [applicantsModal, setApplicantsModal] = useState(null);
  const [postForm, setPostForm] = useState({ description: '', payment_amount: '', time_limit_hours: '', skills: '', range_km: 50 });
  const [jobMedia, setJobMedia] = useState(null);
  const [applyMsg, setApplyMsg]     = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // Opened from the "Post" chooser (/freelance?new=1) → jump straight to the form.
  useEffect(() => {
    if (searchParams.get('new') === '1') setPostModal(true);
  }, [searchParams]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  // Geolocation resolves asynchronously — the first loadAll() above often
  // fires before it's ready, so radius filtering gets silently skipped.
  // Re-run once we actually have a location, so distance filtering applies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (userLocation.lat) loadAll(); }, [userLocation.lat]);

  const availableParams = (radiusOverride) => {
    const params = {};
    if (skillFilter) params.skill = skillFilter;
    const r = radiusOverride ?? radius;
    if (r)           params.radius = r;
    if (userLocation.lat) {
      params.latitude  = userLocation.lat;
      params.longitude = userLocation.lon;
    }
    return params;
  };

  const loadAll = async (radiusOverride) => {
    try {
      setLoading(true);
      const [avRes, myRes] = await Promise.all([
        API.get(`/work/requests/available/${user.id}/`, { params: availableParams(radiusOverride) }),
        getMyWorkRequests(user.id),
      ]);
      const av = avRes.data.work_requests || [];
      setAvailable(av);
      setMyJobs(myRes.data.work_requests || []);
      setHasMoreAvailable(!!avRes.data.has_more);
      // Baseline of what we've seen — a full (re)load never flashes anything.
      seenIds.current = new Set(av.map(j => j.id));
      setNewIds(new Set());
    } catch { showToast('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  };

  // Live board: quietly poll for brand-new jobs while viewing Available, and
  // flash any that weren't there before. No WebSocket — just a 15s poll.
  useEffect(() => {
    if (tab !== 'available') return undefined;
    const poll = async () => {
      try {
        const res = await API.get(`/work/requests/available/${user.id}/`, { params: availableParams() });
        const fresh = res.data.work_requests || [];
        const arrived = fresh.filter(j => !seenIds.current.has(j.id));
        if (arrived.length) {
          arrived.forEach(j => seenIds.current.add(j.id));
          setAvailable(prev => [...arrived, ...prev]);
          setNewIds(prev => { const n = new Set(prev); arrived.forEach(j => n.add(j.id)); return n; });
          showToast(`${arrived.length} new job${arrived.length > 1 ? 's' : ''} posted`, 'success');
        }
      } catch { /* silent — polling shouldn't nag */ }
    };
    pollRef.current = setInterval(poll, 15000);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, skillFilter, radius, userLocation.lat]);

  const handleLoadMoreAvailable = async () => {
    setLoadingMore(true);
    try {
      const params = { ...availableParams(), offset: available.length };
      const res = await API.get(`/work/requests/available/${user.id}/`, { params });
      setAvailable(prev => [...prev, ...(res.data.work_requests || [])]);
      setHasMoreAvailable(!!res.data.has_more);
    } catch { showToast('Failed to load more jobs', 'error'); }
    finally { setLoadingMore(false); }
  };

  const handlePost = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      // Attach the poster's live location so the job is findable by radius.
      const payload = { ...postForm };
      if (userLocation.lat) {
        payload.latitude = userLocation.lat;
        payload.longitude = userLocation.lon;
      }
      if (jobMedia) payload.media = jobMedia;
      await createWorkRequest(payload);
      showToast('Job posted!', 'success');
      setPostModal(false);
      setPostForm({ description: '', payment_amount: '', time_limit_hours: '', skills: '', range_km: 50 });
      setJobMedia(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to post job', 'error');
    } finally { setSubmitting(false); }
  };

  const handleApply = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await respondToWorkRequest(applyModal.id, 'accepted', applyMsg);
      showToast('Applied successfully!', 'success');
      setApplyModal(null);
      setApplyMsg('');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to apply', 'error');
    } finally { setSubmitting(false); }
  };

  const loadApplicants = async (wrId) => {
    try {
      const res = await getWorkRequestResponses(wrId);
      setApplicantsModal({ wrId, applicants: res.data.applicants || [] });
    } catch { showToast('Failed to load applicants', 'error'); }
  };

  const handleAssign = async (wrId, assigneeId) => {
    try {
      const res = await assignWorkRequest(wrId, assigneeId);
      showToast('Assigned! Conversation started.', 'success');
      setApplicantsModal(null);
      if (res.data.conversation_id) navigate('/messages');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to assign', 'error');
    }
  };

  const handleClose = async (wrId) => {
    try {
      await closeWorkRequest(wrId);
      showToast('Job closed', 'success');
      loadAll();
    } catch { showToast('Failed to close job', 'error'); }
  };

  const [completingId, setCompletingId] = useState(null);
  const handleCompleteJob = async (wrId) => {
    try {
      setCompletingId(wrId);
      const res = await completeWorkRequest(wrId);
      showToast(
        res.data.status === 'closed'
          ? 'Job complete on both sides — go rate each other!'
          : 'Marked complete — waiting for the other side to confirm',
        'success'
      );
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark complete', 'error');
    } finally { setCompletingId(null); }
  };

  const statusColor = { open: 'status-green', assigned: 'status-orange', closed: 'status-gray' };

  return (
    <AppShell active="freelance">
      <div className="freelance-wrapper">
        <div className="freelance-header">
          <div>
            <h1 className="freelance-title">Freelance</h1>
            <p className="freelance-sub">Find work or post a job</p>
          </div>
          <button className="post-job-btn" onClick={() => setPostModal(true)}>+ Post a Job</button>
        </div>

        <div className="wr-tabs-row">
          <div className="tab-group">
            <button className={`tab-btn ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>Available Jobs ({available.length})</button>
            <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Posted Jobs ({myJobs.length})</button>
          </div>
          {tab === 'available' && (
            <span className="wr-live"><span className="wr-live-dot" />Live</span>
          )}
        </div>

        {tab === 'available' && (
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
        ) : tab === 'available' ? (
          available.length === 0 ? (
            <div className="state-box">
              <h3>No jobs found</h3>
              <p>Try a different skill, increase your radius — or be the first to post one.</p>
              <div className="state-box-actions">
                <button className="opp-cta" onClick={() => setPostModal(true)}>+ Post a Job</button>
                <button className="opp-cta ghost" onClick={() => navigate('/collab')}>Browse collabs instead</button>
              </div>
            </div>
          ) : available.map(wr => (
            <div key={wr.id} className={`wr-card ${newIds.has(wr.id) ? 'is-new' : ''}`}>
              <div className="wr-top">
                <div className="wr-poster">
                  <div className="post-ava small">{wr.created_by[0].toUpperCase()}</div>
                  <span className="wr-by">{wr.created_by}</span>
                  {newIds.has(wr.id) && <span className="wr-new-badge">NEW</span>}
                </div>
                <div className="wr-top-right">
                  {wr.created_at && <span className="wr-posted">{postedAgo(wr.created_at)}</span>}
                  <span className="wr-time">{timeLeft(wr.expires_at)}</span>
                </div>
              </div>
              <p className="wr-desc">{wr.description}</p>
              {wr.media && (
                <div className="post-media">
                  {wr.media_type === 'video'
                    ? <video className="post-media-el" src={wr.media} controls playsInline />
                    : <img className="post-media-el" src={wr.media} alt=""
                        onClick={() => window.open(wr.media, '_blank')} />}
                </div>
              )}
              <div className="wr-skills">
                {wr.skills?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <div className="wr-meta">
                  <span className="wr-pay">₹{wr.payment_amount}</span>
                  <span className="wr-duration">{wr.time_limit_hours}h project</span>
                  {wr.distance_km != null && <span className="wr-duration">📍 {wr.distance_km} km</span>}
                  {wr.responses_count > 0 && (
                    <span className="wr-heat">🔥 {wr.responses_count} applied</span>
                  )}
                </div>
                <button className="wr-apply-btn" onClick={() => setApplyModal(wr)}>Apply</button>
              </div>
            </div>
          ))
        ) : null}

        {tab === 'available' && !loading && hasMoreAvailable && (
          <button className="load-more-btn" onClick={handleLoadMoreAvailable} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {tab === 'my' && (
          myJobs.length === 0 ? (
            <div className="state-box">
              <h3>No jobs posted yet</h3>
              <p>Post a job to find skilled people near you</p>
            </div>
          ) : myJobs.map(wr => (
            <div key={wr.id} className="wr-card">
              <div className="wr-top">
                <p className="wr-desc-sm">{wr.description}</p>
                <span className={`profile-status-badge ${statusColor[wr.status]}`}>{wr.status}</span>
              </div>
              <div className="wr-skills">
                {wr.skills?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <div className="wr-meta">
                  <span className="wr-pay">₹{wr.payment_amount}</span>
                  <span className="wr-duration">{wr.responses_count} applicants</span>
                  {wr.assigned_to && <span className="wr-assigned">→ {wr.assigned_to}</span>}
                </div>
                <div className="wr-owner-actions">
                  {wr.status === 'open' && (
                    <>
                      <button className="wr-view-btn" onClick={() => loadApplicants(wr.id)}>View Applicants</button>
                      <button className="wr-close-btn" onClick={() => handleClose(wr.id)}>Close</button>
                    </>
                  )}
                  {wr.status === 'assigned' && (
                    wr.completed_by_poster ? (
                      <span className="wr-waiting">Waiting for {wr.assigned_to} to confirm…</span>
                    ) : (
                      <button className="wr-close-btn" onClick={() => handleCompleteJob(wr.id)}
                        disabled={completingId === wr.id}>
                        {completingId === wr.id ? '…' : 'Mark Complete'}
                      </button>
                    )
                  )}
                  {wr.status === 'closed' && wr.assigned_to_id && (
                    <button className="wr-view-btn" onClick={() => navigate(`/profile/${wr.assigned_to_id}`)}>
                      ★ Rate {wr.assigned_to}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Job Modal */}
      {postModal && (
        <div className="modal-overlay" onClick={() => setPostModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Post a Job</h2>
            <form onSubmit={handlePost}>
              <div className="modal-field">
                <label className="modal-label">Description *</label>
                <textarea className="modal-textarea" required rows={3}
                  placeholder="What do you need done?"
                  value={postForm.description}
                  onChange={e => setPostForm({...postForm, description: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Payment (₹) *</label>
                <input className="modal-input" type="number" required placeholder="e.g. 2000"
                  value={postForm.payment_amount}
                  onChange={e => setPostForm({...postForm, payment_amount: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Time Limit (hours) *</label>
                <input className="modal-input" type="number" required placeholder="e.g. 48"
                  value={postForm.time_limit_hours}
                  onChange={e => setPostForm({...postForm, time_limit_hours: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Skills Required * <span style={{fontWeight:400,color:'var(--text-3)'}}>comma separated</span></label>
                <input className="modal-input" required placeholder="React, Python, Figma"
                  value={postForm.skills}
                  onChange={e => setPostForm({...postForm, skills: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Visible within</label>
                <select className="modal-input"
                  value={postForm.range_km}
                  onChange={e => setPostForm({...postForm, range_km: e.target.value})}>
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
                {jobMedia ? (
                  <div className="post-media-chip">
                    <span className="post-media-chip-name">{jobMedia.name}</span>
                    <button type="button" onClick={() => setJobMedia(null)}>×</button>
                  </div>
                ) : (
                  <label className="post-media-pick">
                    <input type="file" accept="image/*,video/*" hidden
                      onChange={async e => {
                        const f = e.target.files[0]; e.target.value = '';
                        if (!f) return;
                        const prepared = await prepareMediaFile(f, showToast);
                        if (prepared) setJobMedia(prepared);
                      }} />
                    + Attach image or video
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setPostModal(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post Job'}
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
            <h2 className="modal-title">Apply for Job</h2>
            <div className="apply-job-preview">
              <p className="wr-desc">{applyModal.description}</p>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                <span className="wr-pay">₹{applyModal.payment_amount}</span>
                <span className="wr-duration">{applyModal.time_limit_hours}h</span>
              </div>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-field">
                <label className="modal-label">Message (optional)</label>
                <textarea className="modal-textarea" rows={3}
                  placeholder="Tell them why you're the right person..."
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
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {applicantsModal.applicants.map(a => (
                  <div key={a.user_id} className="applicant-row">
                    <div className="post-ava small">{a.username[0].toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <span className="applicant-name"
                        onClick={() => { navigate(`/profile/${a.user_id}`); setApplicantsModal(null); }}>
                        {a.username}
                      </span>
                      <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'4px'}}>
                        {a.skills?.slice(0,3).map(s => <span key={s} className="tag tag-skill">{s}</span>)}
                      </div>
                      {a.message && <p className="applicant-msg">{a.message}</p>}
                    </div>
                    <button className="hire-btn"
                      onClick={() => handleAssign(applicantsModal.wrId, a.user_id)}>
                      Hire
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setApplicantsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}