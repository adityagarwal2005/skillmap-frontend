import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getAvailableWorkRequests, getMyWorkRequests,
  createWorkRequest, respondToWorkRequest,
  getWorkRequestResponses, assignWorkRequest, closeWorkRequest
} from '../api/work';
import './FeedPage.css';
import './FreelancePage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export default function FreelancePage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [tab, setTab]               = useState('available');
  const [available, setAvailable]   = useState([]);
  const [myJobs, setMyJobs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [theme, setTheme]           = useState(localStorage.getItem('theme') || 'light');

  // Modals
  const [postModal, setPostModal]         = useState(false);
  const [applyModal, setApplyModal]       = useState(null); // work request object
  const [applicantsModal, setApplicantsModal] = useState(null); // { wrId, applicants }

  const [postForm, setPostForm] = useState({ description: '', payment_amount: '', time_limit_hours: '', skills: '' });
  const [applyMsg, setApplyMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [avRes, myRes] = await Promise.all([
        getAvailableWorkRequests(user.id),
        getMyWorkRequests(user.id),
      ]);
      setAvailable(avRes.data.work_requests || []);
      setMyJobs(myRes.data.work_requests || []);
    } catch { showToast('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  };

  const handlePost = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createWorkRequest(postForm);
      showToast('Job posted!', 'success');
      setPostModal(false);
      setPostForm({ description: '', payment_amount: '', time_limit_hours: '', skills: '' });
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
      showToast('Job closed. Portfolio item created!', 'success');
      loadAll();
    } catch { showToast('Failed to close job', 'error'); }
  };

  const statusColor = { open: 'status-green', assigned: 'status-orange', closed: 'status-gray' };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <div className="topbar-right">
          <button className="topbar-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="freelance-wrapper">
        <div className="freelance-header">
          <div>
            <h1 className="freelance-title">Freelance</h1>
            <p className="freelance-sub">Find work or post a job</p>
          </div>
          <button className="post-job-btn" onClick={() => setPostModal(true)}>+ Post a Job</button>
        </div>

        <div className="tab-group" style={{ marginBottom: '20px' }}>
          <button className={`tab-btn ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>Available Jobs ({available.length})</button>
          <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Posted Jobs ({myJobs.length})</button>
        </div>

        {loading ? (
          <div className="freelance-loading">Loading...</div>
        ) : tab === 'available' ? (
          available.length === 0 ? (
            <div className="state-box">
              <h3>No matching jobs</h3>
              <p>Add skills to your profile to see matching work requests</p>
            </div>
          ) : available.map(wr => (
            <div key={wr.id} className="wr-card">
              <div className="wr-top">
                <div className="wr-poster">
                  <div className="post-ava small">{wr.created_by[0].toUpperCase()}</div>
                  <span className="wr-by">{wr.created_by}</span>
                </div>
                <span className="wr-time">{timeLeft(wr.expires_at)}</span>
              </div>
              <p className="wr-desc">{wr.description}</p>
              <div className="wr-skills">
                {wr.skills?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <div className="wr-meta">
                  <span className="wr-pay">₹{wr.payment_amount}</span>
                  <span className="wr-duration">{wr.time_limit_hours}h project</span>
                </div>
                <button className="wr-apply-btn" onClick={() => setApplyModal(wr)}>Apply</button>
              </div>
            </div>
          ))
        ) : (
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
                      <button className="wr-view-btn" onClick={() => loadApplicants(wr.id)}>
                        View Applicants
                      </button>
                      <button className="wr-close-btn" onClick={() => handleClose(wr.id)}>Close</button>
                    </>
                  )}
                  {wr.status === 'assigned' && (
                    <button className="wr-close-btn" onClick={() => handleClose(wr.id)}>Mark Complete</button>
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
                <input className="modal-input" type="number" required
                  placeholder="e.g. 2000"
                  value={postForm.payment_amount}
                  onChange={e => setPostForm({...postForm, payment_amount: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Time Limit (hours) *</label>
                <input className="modal-input" type="number" required
                  placeholder="e.g. 48"
                  value={postForm.time_limit_hours}
                  onChange={e => setPostForm({...postForm, time_limit_hours: e.target.value})} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Skills Required * <span style={{fontWeight:400,color:'var(--text-3)'}}>comma separated</span></label>
                <input className="modal-input" required
                  placeholder="React, Python, Figma"
                  value={postForm.skills}
                  onChange={e => setPostForm({...postForm, skills: e.target.value})} />
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
    </div>
  );
}