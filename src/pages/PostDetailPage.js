import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getComments, addComment, editComment, deleteComment, reactToItem,
  editPortfolioItem, deletePortfolioItem,
} from '../api/portfolio';
import { getFeed } from '../api/feed';
import { getUser, reportContent } from '../api/users';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './PostDetailPage.css';

const REPORT_REASONS = [
  { value: 'spam',          label: 'Spam' },
  { value: 'harassment',    label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'scam',          label: 'Scam or fraud' },
  { value: 'other',         label: 'Other' },
];

export default function PostDetailPage() {
  const { itemId }           = useParams();
  const { user }             = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [item, setItem]         = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [editText, setEditText]       = useState('');
  const [reacted, setReacted]         = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [postEditing, setPostEditing] = useState(false);
  const [postForm, setPostForm]       = useState({ title: '', description: '' });
  const [savingPost, setSavingPost]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isOwn = user?.id === item?.user?.id;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [itemId]);

  useEffect(() => {
    if (user?.id) getUser(user.id).then(r => setMyAvatar(r.data.profile_image || null)).catch(() => {});
  }, [user?.id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [feedRes, commentsRes] = await Promise.all([
        getFeed(),
        getComments(itemId),
      ]);
      const found = feedRes.data.feed?.find(i => i.id === parseInt(itemId));
      setItem(found || null);
      setComments(commentsRes.data.comments || []);
      if (found) setReactionCount(found.reactions);
    } catch {
      showToast('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (type) => {
    try {
      await reactToItem(itemId, type);
      setReacted(prev => !prev);
      setReactionCount(prev => reacted ? prev - 1 : prev + 1);
    } catch { showToast('Failed to react', 'error'); }
  };

  const startEdit = () => {
    setPostForm({ title: item.title, description: item.description });
    setPostEditing(true);
  };

  const handleSavePost = async () => {
    if (!postForm.title.trim() || !postForm.description.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }
    try {
      setSavingPost(true);
      await editPortfolioItem(itemId, {
        title: postForm.title,
        description: postForm.description,
      });
      setPostEditing(false);
      showToast('Post updated', 'success');
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update post', 'error');
    } finally { setSavingPost(false); }
  };

  const handleDeletePost = async () => {
    try {
      await deletePortfolioItem(itemId);
      showToast('Post deleted', 'success');
      navigate('/');
    } catch { showToast('Failed to delete post', 'error'); }
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      await addComment(itemId, commentText.trim());
      setCommentText('');
      showToast('Comment added', 'success');
      const res = await getComments(itemId);
      setComments(res.data.comments || []);
    } catch { showToast('Failed to add comment', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await editComment(commentId, editText.trim());
      setEditingId(null);
      const res = await getComments(itemId);
      setComments(res.data.comments || []);
    } catch { showToast('Failed to edit comment', 'error'); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      showToast('Comment deleted', 'success');
    } catch { showToast('Failed to delete comment', 'error'); }
  };

  const handleSubmitReport = async () => {
    try {
      setSubmittingReport(true);
      await reportContent('post', itemId, reportReason, reportDetails);
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

  return (
    <AppShell active="home">
      <div className="detail-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /></div>
        ) : !item ? (
          <div className="state-box"><h3>Post not found</h3></div>
        ) : (
          <>
            {/* Post */}
            <div className="detail-card">
              <div className="post-top">
                <div className="post-ava"
                  onClick={() => navigate(`/profile/${item.user.id}`)}>
                  {item.user.profile_image
                    ? <img className="ava-img" src={item.user.profile_image} alt="" />
                    : item.user.username[0].toUpperCase()}
                </div>
                <div className="post-meta">
                  <span className="post-author"
                    onClick={() => navigate(`/profile/${item.user.id}`)}>
                    {item.user.username}
                  </span>
                  <span className="post-author-cat">
                    {item.user.category || 'Independent'}
                  </span>
                </div>
                {isOwn && !postEditing && (
                  confirmDelete ? (
                    <div className="detail-owner-actions">
                      <span className="detail-confirm-text">Delete?</span>
                      <button className="detail-del-btn" onClick={handleDeletePost}>Yes</button>
                      <button className="detail-edit-btn" onClick={() => setConfirmDelete(false)}>No</button>
                    </div>
                  ) : (
                    <div className="detail-owner-actions">
                      <button className="detail-edit-btn" onClick={startEdit}>Edit</button>
                      <button className="detail-del-btn" onClick={() => setConfirmDelete(true)}>Delete</button>
                    </div>
                  )
                )}
                {!isOwn && (
                  <div className="detail-owner-actions">
                    <span className="post-type-badge">{item.portfolio_type}</span>
                    <button className="detail-edit-btn" onClick={() => setReportModal(true)}>Report</button>
                  </div>
                )}
              </div>

              {postEditing ? (
                <div className="detail-edit">
                  <input className="detail-edit-title"
                    value={postForm.title} maxLength={100}
                    onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Title" />
                  <textarea className="detail-edit-desc"
                    value={postForm.description} maxLength={200} rows={3}
                    onChange={e => setPostForm({ ...postForm, description: e.target.value })}
                    placeholder="Description" />
                  <div className="detail-edit-actions">
                    <button className="create-cancel" onClick={() => setPostEditing(false)}>Cancel</button>
                    <button className="create-submit" onClick={handleSavePost} disabled={savingPost}>
                      {savingPost ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="detail-title">{item.title}</h1>
                  <p className="detail-desc">{item.description}</p>
                </>
              )}

              {(() => {
                const imgs = (item.media || []).filter(m => m.media_type === 'image' && m.url);
                const links = (item.media || []).filter(m => m.media_type === 'link' && m.url);
                return (
                  <>
                    {imgs.length > 0 && (
                      <div className={`post-gallery count-${Math.min(imgs.length, 4)}`}>
                        {imgs.slice(0, 4).map(m => (
                          <img key={m.id} src={m.url} alt={item.title} className="post-gallery-img" />
                        ))}
                      </div>
                    )}
                    {links.map(m => (
                      <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="post-ext-link">
                        ↗ View project
                      </a>
                    ))}
                  </>
                );
              })()}

              {(item.skills?.length > 0 || item.tags?.length > 0) && (
                <div className="post-tags">
                  {item.skills?.map(s => <span key={s} className="tag tag-skill">{s}</span>)}
                  {item.tags?.map(t => <span key={t} className="tag tag-plain">{t}</span>)}
                </div>
              )}

              <div className="detail-reactions">
                {['fire', 'love', 'like'].map(type => (
                  <button key={type}
                    className={`reaction-pill ${reacted && type === 'fire' ? 'active' : ''}`}
                    onClick={() => handleReact(type)}>
                    {type === 'fire' ? '🔥' : type === 'love' ? '❤️' : '👍'}
                    {type === 'fire' ? reactionCount : 0}
                  </button>
                ))}
                {item.verified && <span className="verified-pill">✓ Verified Work</span>}
              </div>
            </div>

            {/* Comments */}
            <div className="comments-section">
              <h2 className="comments-title">Comments ({comments.length})</h2>

              <form onSubmit={handleComment} className="comment-form">
                <div className="comment-input-row">
                  <div className="post-ava small">
                    {myAvatar
                      ? <img className="ava-img" src={myAvatar} alt="" />
                      : user?.username?.[0]?.toUpperCase()}
                  </div>
                  <input
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <button type="submit" className="comment-submit" disabled={submitting}>
                    {submitting ? '...' : 'Post'}
                  </button>
                </div>
              </form>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="no-comments">No comments yet. Be the first!</div>
                ) : comments.map(c => (
                  <div key={c.id} className="comment-card">
                    <div className="comment-top">
                      <div className="post-ava small">
                        {c.profile_image
                          ? <img className="ava-img" src={c.profile_image} alt="" />
                          : c.username[0].toUpperCase()}
                      </div>
                      <div className="comment-meta">
                        <span className="comment-author"
                          onClick={() => navigate(`/profile/${c.user_id || ''}`)}>
                          {c.username}
                        </span>
                        <span className="comment-time">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      {c.username === user?.username && (
                        <div className="comment-actions">
                          <button className="comment-action-btn"
                            onClick={() => { setEditingId(c.id); setEditText(c.text); }}>
                            Edit
                          </button>
                          <button className="comment-action-btn red"
                            onClick={() => handleDeleteComment(c.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === c.id ? (
                      <div className="comment-edit-row">
                        <input className="comment-input"
                          value={editText}
                          onChange={e => setEditText(e.target.value)} />
                        <button className="comment-submit"
                          onClick={() => handleEditComment(c.id)}>Save</button>
                        <button className="create-cancel"
                          onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <p className="comment-text">{c.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Report this post</h2>
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