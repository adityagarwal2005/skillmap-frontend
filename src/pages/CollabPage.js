import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getCollabPosts, getMyCollabPosts, createCollabPost,
  applyToCollab, getCollabApplicants, respondToCollabRequest, closeCollabPost
} from '../api/collab';
import './FeedPage.css';
import './CollabPage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

const TYPE_COLORS = {
  equity:     { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  experience: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  paid:       { bg: 'rgba(16,185,129,0.08)', color: '#10b981' },
};

export default function CollabPage() {
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [tab, setTab]           = useState('browse');
  const [posts, setPosts]       = useState([]);
  const [myPosts, setMyPosts]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [theme, setTheme]       = useState(localStorage.getItem('theme') || 'light');

  const [createModal, setCreateModal]     = useState(false);
  const [applyModal, setApplyModal]       = useState(null);
  const [applicantsModal, setApplicantsModal] = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  const [createForm, setCreateForm] = useState({ title: '', description: '', collab_type: 'experience', skills: '' });
  const [applyMsg, setApplyMsg]     = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [bRes, mRes] = await Promise.all([
        getCollabPosts(),
        getMyCollabPosts(),
      ]);
      setPosts(bRes.data.collab_posts || []);
      setMyPosts(mRes.data.collab_posts || []);
    } catch { showToast('Failed to load collabs', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async e => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createCollabPost(createForm);
      showToast('Collab post created!', 'success');
      setCreateModal(false);
      setCreateForm({ title: '', description: '', collab_type: 'experience', skills: '' });
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

  const filteredPosts = typeFilter === 'all' ? posts : posts.filter(p => p.collab_type === typeFilter);

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
          {tab === 'browse' && (
            <div className="type-filters">
              {['all', 'equity', 'experience', 'paid'].map(t => (
                <button key={t}
                  className={`type-filter-btn ${typeFilter === t ? 'active' : ''}`}
                  onClick={() => setTypeFilter(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="freelance-loading">Loading...</div>
        ) : tab === 'browse' ? (
          filteredPosts.length === 0 ? (
            <div className="state-box">
              <h3>No collab posts yet</h3>
              <p>Be the first to start a collab!</p>
            </div>
          ) : filteredPosts.map(post => (
            <div key={post.id} className="collab-card">
              <div className="collab-top">
                <div className="post-ava small">{post.posted_by[0].toUpperCase()}</div>
                <span className="wr-by">{post.posted_by}</span>
                <span className="collab-type-badge"
                  style={{ background: TYPE_COLORS[post.collab_type]?.bg, color: TYPE_COLORS[post.collab_type]?.color }}>
                  {post.collab_type}
                </span>
              </div>
              <h3 className="collab-title">{post.title}</h3>
              <p className="wr-desc">{post.description}</p>
              <div className="wr-skills">
                {post.skills_needed?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
              </div>
              <div className="wr-footer">
                <span className="wr-duration">{post.applicants} applicants</span>
                <button className="wr-apply-btn" onClick={() => setApplyModal(post)}>Apply</button>
              </div>
            </div>
          ))
        ) : (
          myPosts.length === 0 ? (
            <div className="state-box">
              <h3>No collab posts yet</h3>
              <p>Start a collab to find teammates</p>
            </div>
          ) : myPosts.map(post => (
            <div key={post.id} className="collab-card">
              <div className="collab-top">
                <span className="collab-type-badge"
                  style={{ background: TYPE_COLORS[post.collab_type]?.bg, color: TYPE_COLORS[post.collab_type]?.color }}>
                  {post.collab_type}
                </span>
                <span className={`profile-status-badge ${post.status === 'open' ? 'status-green' : 'status-gray'}`}>
                  {post.status}
                </span>
              </div>
              <h3 className="collab-title">{post.title}</h3>
              <p className="wr-desc">{post.description}</p>
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
                <input className="modal-input" required
                  placeholder="What are you building?"
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
                <label className="modal-label">Type *</label>
                <select className="modal-input"
                  value={createForm.collab_type}
                  onChange={e => setCreateForm({...createForm, collab_type: e.target.value})}>
                  <option value="experience">Experience (no pay)</option>
                  <option value="equity">Equity</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="modal-field">
                <label className="modal-label">Skills Needed <span style={{fontWeight:400,color:'var(--text-3)'}}>comma separated</span></label>
                <input className="modal-input"
                  placeholder="React, Python, Design"
                  value={createForm.skills}
                  onChange={e => setCreateForm({...createForm, skills: e.target.value})} />
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
    </div>
  );
}