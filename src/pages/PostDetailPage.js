import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getComments, addComment, editComment, deleteComment, reactToItem } from '../api/portfolio';
import { getFeed } from '../api/feed';
import './FeedPage.css';
import './PostDetailPage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function PostDetailPage() {
  const { itemId }           = useParams();
  const { user, logoutUser } = useAuth();
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
  const [theme, setTheme]             = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [itemId]);

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

  return (
    <div className="app-shell">
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
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="detail-wrapper">
        <button className="profile-back" onClick={() => navigate(-1)}>← Back</button>

        {loading ? (
          <div className="detail-loading">Loading...</div>
        ) : !item ? (
          <div className="state-box"><h3>Post not found</h3></div>
        ) : (
          <>
            {/* Post */}
            <div className="detail-card">
              <div className="post-top">
                <div className="post-ava"
                  onClick={() => navigate(`/profile/${item.user.id}`)}>
                  {item.user.username[0].toUpperCase()}
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
                <span className="post-type-badge">{item.portfolio_type}</span>
              </div>

              <h1 className="detail-title">{item.title}</h1>
              <p className="detail-desc">{item.description}</p>

              {item.media?.map(m =>
                m.media_type === 'image' && m.url ? (
                  <img key={m.id} src={m.url} alt={item.title} className="post-img" />
                ) : m.media_type === 'link' && m.url ? (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="post-ext-link">
                    ↗ View project
                  </a>
                ) : null
              )}

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
                  <div className="post-ava small">{user?.username?.[0]?.toUpperCase()}</div>
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
                      <div className="post-ava small">{c.username[0].toUpperCase()}</div>
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
    </div>
  );
}