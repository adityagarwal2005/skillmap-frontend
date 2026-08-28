import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getMyWorkRequests, getWorkRequestResponses, assignWorkRequest, rejectWorkApplicant,
} from '../api/work';
import { getMyCollabPosts, getCollabApplicants, respondToCollabRequest } from '../api/collab';
import AppShell from '../components/AppShell';
import NotificationBell from '../components/NotificationBell';
import './FeedPage.css';
import './PostPage.css';
import './ApplicantsPage.css';

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h left`;
}

/**
 * Full-page applicant manager for one of your own posts, reached by tapping
 * the applicant count on the Post tab. Same accept/decline/DM actions as the
 * inline panel there, with room to actually read each person's pitch.
 */
export default function ApplicantsPage() {
  const { kind, id }  = useParams();          // kind: 'freelance' | 'collab'
  const { user }      = useAuth();
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const isFreelance = kind === 'freelance';
  const [post, setPost]         = useState(null);
  const [applicants, setApps]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null);   // { appId, action }
  const [busyId, setBusyId]     = useState(null);
  const [connected, setConnected] = useState({});   // appId -> conversation_id

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [mine, apps] = await Promise.all([
        isFreelance
          ? getMyWorkRequests(user.id).then(r => r.data.work_requests || [])
          : getMyCollabPosts().then(r => r.data.collab_posts || []),
        isFreelance
          ? getWorkRequestResponses(id).then(r => r.data.applicants || [])
          : getCollabApplicants(id).then(r => r.data.applicants || []),
      ]);
      setPost(mine.find(p => String(p.id) === String(id)) || null);
      setApps(apps);
    } catch {
      showToast('Failed to load applicants', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, isFreelance, showToast]);

  useEffect(() => { load(); }, [load]);

  const appKey  = (a) => (isFreelance ? a.user_id : a.id);
  const appName = (a) => (isFreelance ? a.username : a.applicant);
  const profileId = (a) => (isFreelance ? a.user_id : a.applicant_id);

  const doAccept = async (a) => {
    const key = appKey(a);
    setBusyId(key);
    try {
      const r = isFreelance
        ? await assignWorkRequest(id, a.user_id)
        : await respondToCollabRequest(a.id, 'accepted');
      setConnected(prev => ({ ...prev, [key]: r.data.conversation_id }));
      showToast(`Connected with ${appName(a)}`, 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not accept', 'error');
    } finally { setBusyId(null); setConfirm(null); }
  };

  const doReject = async (a) => {
    const key = appKey(a);
    setBusyId(key);
    try {
      if (isFreelance) await rejectWorkApplicant(id, a.user_id);
      else             await respondToCollabRequest(a.id, 'declined');
      setApps(prev => prev.filter(x => appKey(x) !== key));
      showToast(`${appName(a)} declined — they can apply again`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not decline', 'error');
    } finally { setBusyId(null); setConfirm(null); }
  };

  const title = post ? (isFreelance ? post.description : post.title) : '';
  const tl = post ? timeLeft(post.expires_at) : null;

  return (
    <AppShell active="post">
      <div className="apl-page">
        <div className="page-title-row">
          <button className="profile-back" onClick={() => navigate('/post')}>← Post</button>
          <NotificationBell />
        </div>

        <span className="apl-kind">{isFreelance ? 'Freelance' : 'Collab'}</span>
        <h1 className="apl-title">{loading ? 'Loading…' : title || 'Post not found'}</h1>

        {post && (
          <div className="apl-meta">
            {isFreelance && <span className="apl-price">₹{post.payment_amount}</span>}
            <span className={`apl-time ${tl === 'Expired' ? 'is-expired' : ''}`}>
              {tl ? `⏳ ${tl}` : 'No expiry set'}
            </span>
            <span className="apl-status">{post.status}</span>
          </div>
        )}

        <div className="apl-count-row">
          <h2 className="apl-count">
            {applicants.length} {applicants.length === 1 ? 'applicant' : 'applicants'}
          </h2>
        </div>

        {loading ? (
          <p className="menu-muted">Loading applicants…</p>
        ) : applicants.length === 0 ? (
          <p className="menu-muted">No one has applied yet.</p>
        ) : (
          <div className="apl-list">
            {applicants.map(a => {
              const key   = appKey(a);
              const name  = appName(a);
              const convId = connected[key];
              const isConfirm = confirm?.appId === key;
              const busy  = busyId === key;
              return (
                <div key={key} className="apl-card">
                  <div className="apl-card-top">
                    <button className="apl-person"
                      onClick={() => profileId(a) && navigate(`/profile/${profileId(a)}`)}>
                      <span className="apl-ava">{name?.[0]?.toUpperCase() || '?'}</span>
                      <span className="apl-person-info">
                        <span className="apl-name">{name}</span>
                        {a.rating > 0 && <span className="apl-rating">★ {a.rating.toFixed(1)}</span>}
                      </span>
                    </button>
                    {a.status && a.status !== 'pending' && (
                      <span className="apl-badge">{a.status}</span>
                    )}
                  </div>

                  {a.message && <p className="apl-msg">{a.message}</p>}

                  {a.skills?.length > 0 && (
                    <div className="apl-skills">
                      {a.skills.slice(0, 6).map(s => <span key={s} className="apl-skill">{s}</span>)}
                    </div>
                  )}

                  <div className="apl-actions">
                    {convId ? (
                      <button className="apl-dm" onClick={() => navigate(`/messages?c=${convId}`)}>
                        💬 Message {name}
                      </button>
                    ) : isConfirm ? (
                      <>
                        <span className="apl-confirm-q">
                          {confirm.action === 'accept'
                            ? `Accept ${name} and start a chat?`
                            : `Decline ${name}?`}
                        </span>
                        <div className="apl-confirm-btns">
                          <button className={`apl-confirm ${confirm.action === 'accept' ? 'ok' : 'no'}`}
                            disabled={busy}
                            onClick={() => confirm.action === 'accept' ? doAccept(a) : doReject(a)}>
                            {busy ? '…' : 'Confirm'}
                          </button>
                          <button className="apl-cancel" disabled={busy}
                            onClick={() => setConfirm(null)}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button className="apl-tick"
                          onClick={() => setConfirm({ appId: key, action: 'accept' })}>
                          ✓ Accept
                        </button>
                        <button className="apl-cross"
                          onClick={() => setConfirm({ appId: key, action: 'reject' })}>
                          ✕ Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
