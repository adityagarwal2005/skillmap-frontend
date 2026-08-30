import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getMyWorkRequests, getWorkRequestResponses, assignWorkRequest, rejectWorkApplicant, closeWorkRequest,
} from '../api/work';
import {
  getMyCollabPosts, getCollabApplicants, respondToCollabRequest, closeCollabPost,
} from '../api/collab';
import AppShell from '../components/AppShell';
import NotificationBell from '../components/NotificationBell';
import CreateWorkModal from '../components/CreateWorkModal';
import './FeedPage.css';
import './PostPage.css';

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

export default function PostPage() {
  const { user }   = useAuth();
  const { showToast } = useToast();
  const navigate   = useNavigate();
  const [jobs, setJobs]       = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [loading, setLoading] = useState(true);

  // expand + applicant management
  const [openKey, setOpenKey]         = useState(null);          // `${kind}-${id}` expanded
  const [appById, setAppById]         = useState({});            // key -> [applicants]
  const [loadingApp, setLoadingApp]   = useState(null);          // key currently loading
  const [confirm, setConfirm]         = useState(null);          // { key, appId, action }
  const [busyId, setBusyId]           = useState(null);          // appId currently mutating
  const [connected, setConnected]     = useState({});            // `${key}:${appId}` -> conversation_id
  const [createKind, setCreateKind]   = useState(null);          // 'freelance' | 'collab' | null
  const [closing, setClosing]         = useState(null);          // `${kind}-${id}` awaiting close confirm

  const load = () => {
    if (!user?.id) return;
    Promise.all([
      getMyWorkRequests(user.id).then(r => r.data.work_requests || []).catch(() => []),
      getMyCollabPosts().then(r => r.data.collab_posts || []).catch(() => []),
    ]).then(([j, c]) => { setJobs(j); setCollabs(c); setLoading(false); });
  };
  useEffect(load, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (kind, item) => {
    const key = `${kind}-${item.id}`;
    if (openKey === key) { setOpenKey(null); setConfirm(null); return; }
    setOpenKey(key); setConfirm(null);
    if (appById[key]) return;                     // already loaded
    setLoadingApp(key);
    try {
      const res = kind === 'freelance'
        ? await getWorkRequestResponses(item.id)
        : await getCollabApplicants(item.id);
      setAppById(prev => ({ ...prev, [key]: res.data.applicants || [] }));
    } catch {
      showToast('Failed to load applicants', 'error');
    } finally { setLoadingApp(null); }
  };

  // A single applicant object is shaped differently for the two kinds:
  //  freelance → { user_id, username, ... }
  //  collab    → { id (request id), applicant, applicant_id, ... }
  const appKey = (kind, a) => (kind === 'freelance' ? a.user_id : a.id);
  const appName = (kind, a) => (kind === 'freelance' ? a.username : a.applicant);

  const doAccept = async (kind, item, a) => {
    const key = `${kind}-${item.id}`;
    const id = appKey(kind, a);
    setBusyId(id);
    try {
      let convId;
      if (kind === 'freelance') {
        const r = await assignWorkRequest(item.id, a.user_id);
        convId = r.data.conversation_id;
      } else {
        const r = await respondToCollabRequest(a.id, 'accepted');
        convId = r.data.conversation_id;
      }
      setConnected(prev => ({ ...prev, [`${key}:${id}`]: convId }));
      showToast(`Connected with ${appName(kind, a)}`, 'success');
      load();                                    // refresh statuses/counts
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not accept', 'error');
    } finally { setBusyId(null); setConfirm(null); }
  };

  const doReject = async (kind, item, a) => {
    const key = `${kind}-${item.id}`;
    const id = appKey(kind, a);
    setBusyId(id);
    try {
      if (kind === 'collab') await respondToCollabRequest(a.id, 'declined');
      else await rejectWorkApplicant(item.id, a.user_id);
      setAppById(prev => ({ ...prev, [key]: (prev[key] || []).filter(x => appKey(kind, x) !== id) }));
      showToast(`${appName(kind, a)} declined`, 'success');
      load();                                    // refresh applicant counts
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not decline', 'error');
    } finally { setBusyId(null); setConfirm(null); }
  };

  // Close early — the post stops showing to everyone before its visibility
  // window runs out. Not reversible from the UI, hence the confirm step.
  const doClose = async (kind, item) => {
    const key = `${kind}-${item.id}`;
    setBusyId(key);
    try {
      if (kind === 'freelance') await closeWorkRequest(item.id);
      else                      await closeCollabPost(item.id);
      showToast('Post closed', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not close', 'error');
    } finally { setBusyId(null); setClosing(null); }
  };

  // How many of this post's spots are taken. Shape differs per kind:
  // gigs flag the response `hired`; collabs use status === 'accepted'.
  const hiredOf = (kind, list) =>
    list.filter(a => (kind === 'freelance' ? a.hired : a.status === 'accepted')).length;

  const renderApplicants = (kind, item) => {
    const key = `${kind}-${item.id}`;
    if (loadingApp === key) return <p className="mng-muted">Loading applicants…</p>;
    const list = appById[key] || [];
    if (list.length === 0) return <p className="mng-muted">No one has applied yet.</p>;
    const needed = item.people_needed || 1;
    const taken = hiredOf(kind, list);
    const isFull = taken >= needed;
    return (
      <div className="mng-applicants">
        {list.map(a => {
          const id = appKey(kind, a);
          const name = appName(kind, a);
          const convId = connected[`${key}:${id}`];
          const isConfirm = confirm && confirm.key === key && confirm.appId === id;
          const busy = busyId === id;
          const isHired = kind === 'freelance' ? a.hired : a.status === 'accepted';
          return (
            <div key={id} className="mng-app">
              <div className="mng-app-id">
                <span className="mng-app-ava">{name?.[0]?.toUpperCase() || '?'}</span>
                <div className="mng-app-info">
                  <span className="mng-app-name">{name}</span>
                  {a.message && <span className="mng-app-msg">{a.message}</span>}
                </div>
              </div>

              {convId ? (
                <button className="mng-dm-btn" onClick={() => navigate(`/messages?c=${convId}`)}>
                  💬 Message
                </button>
              ) : isHired ? (
                <span className="mng-hired">✓ Hired</span>
              ) : isConfirm ? (
                <div className="mng-confirm">
                  <span className="mng-confirm-q">
                    {confirm.action === 'accept' ? 'Accept & connect?' : 'Decline?'}
                  </span>
                  <button className={`mng-confirm-btn ${confirm.action === 'accept' ? 'ok' : 'no'}`}
                    disabled={busy}
                    onClick={() => confirm.action === 'accept' ? doAccept(kind, item, a) : doReject(kind, item, a)}>
                    {busy ? '…' : 'Confirm'}
                  </button>
                  <button className="mng-confirm-cancel" disabled={busy}
                    onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              ) : (
                <div className="mng-actions">
                  <button className="mng-tick" title={isFull ? 'All spots filled' : 'Accept'}
                    disabled={isFull}
                    onClick={() => setConfirm({ key, appId: id, action: 'accept' })}>✓</button>
                  <button className="mng-cross" title="Decline"
                    onClick={() => setConfirm({ key, appId: id, action: 'reject' })}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRow = (kind, item, title, priceEl, sub, applied) => {
    const key = `${kind}-${item.id}`;
    const isOpen = openKey === key;
    const tl = timeLeft(item.expires_at);
    return (
      <div key={key} className={`mng-item ${isOpen ? 'is-open' : ''}`}>
        <button className="mng-head" onClick={() => toggle(kind, item)}>
          <span className="mng-head-main">
            <span className="mng-title">{title}</span>
            <span className="mng-sub">{sub}</span>
          </span>
          <span className="mng-head-right">
            {priceEl}
            <span className={`mng-chevron ${isOpen ? 'up' : ''}`}>⌄</span>
          </span>
        </button>

        {isOpen && (
          <div className="mng-panel">
            <div className="mng-meta">
              <span className={`mng-time ${tl === 'Expired' ? 'is-expired' : ''}`}>
                {tl ? `⏳ ${tl}` : 'No expiry set'}
              </span>
              {/* Opens the full applicant manager — room to read each pitch,
                  see their skills, and accept/decline from one place. */}
              {(item.people_needed || 1) > 1 && (
                <span className={`mng-slots ${(item.hired_count || 0) >= (item.people_needed || 1) ? 'is-full' : ''}`}>
                  {item.hired_count || 0}/{item.people_needed} filled
                </span>
              )}
              <button className="mng-count is-link"
                onClick={() => navigate(`/applicants/${kind}/${item.id}`)}>
                {applied} {applied === 1 ? 'applicant' : 'applicants'} →
              </button>
            </div>
            {renderApplicants(kind, item)}

            {item.status === 'closed' ? (
              <p className="mng-closed">This post is closed — it's no longer visible to anyone.</p>
            ) : closing === key ? (
              <div className="mng-close-confirm">
                <span className="mng-close-q">Close this post? It stops showing to everyone.</span>
                <div className="mng-close-btns">
                  <button className="mng-close-yes" disabled={busyId === key}
                    onClick={() => doClose(kind, item)}>
                    {busyId === key ? '…' : 'Yes, close it'}
                  </button>
                  <button className="mng-confirm-cancel" disabled={busyId === key}
                    onClick={() => setClosing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="mng-close-btn" onClick={() => setClosing(key)}>
                Close this post early
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppShell active="post">
      <div className="post-page">
        <div className="page-title-row">
          <div>
            <span className="ds-eyebrow">Your listings</span>
            <h1 className="post-page-title">Post</h1>
          </div>
          <NotificationBell />
        </div>

        {/* Seller dashboard — what's live, who's waiting, what it's worth. */}
        {!loading && (jobs.length > 0 || collabs.length > 0) && (() => {
          const live = [...jobs, ...collabs].filter(p => p.status !== 'closed').length;
          const waiting = jobs.reduce((s, j) => s + (j.responses_count || 0), 0)
                        + collabs.reduce((s, c) => s + (c.applicants || 0), 0);
          const committed = jobs
            .filter(j => j.status !== 'closed')
            .reduce((s, j) => s + (Number(j.payment_amount) || 0), 0);
          return (
            <div className="market-pulse">
              <div className="mp-stat">
                <span className="mp-val"><span className="ds-live" />{live}</span>
                <span className="mp-label">Live</span>
              </div>
              <div className="mp-stat">
                <span className="mp-val">{waiting}</span>
                <span className="mp-label">Waiting on you</span>
              </div>
              <div className="mp-stat">
                <span className="mp-val is-money">₹{committed.toLocaleString('en-IN')}</span>
                <span className="mp-label">Offered</span>
              </div>
            </div>
          );
        })()}

        {/* Two big create actions */}
        <div className="post-new-grid">
          <button className="post-new-card" onClick={() => setCreateKind('freelance')}>
            <span className="post-new-badge">Paid</span>
            <span className="post-new-name">Post a gig</span>
            <span className="post-new-desc">Hire someone on campus for paid work</span>
            <span className="post-new-arrow">→</span>
          </button>
          <button className="post-new-card" onClick={() => setCreateKind('collab')}>
            <span className="post-new-badge is-collab">Team</span>
            <span className="post-new-name">Start a collab</span>
            <span className="post-new-desc">Find teammates for a project or hackathon</span>
            <span className="post-new-arrow">→</span>
          </button>
        </div>

        <section className="menu-section">
          <div className="menu-head">
            <span className="menu-num">01</span>
            <h2 className="menu-title">My Gigs</h2>
            <span className="menu-count">{jobs.length} {jobs.length === 1 ? 'item' : 'items'}</span>
          </div>
          {loading ? (
            <p className="menu-muted">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="menu-muted">No freelance posts yet.</p>
          ) : (
            <div className="mng-list">
              {jobs.map(j => renderRow(
                'freelance', j, j.description,
                <span className="mng-price">₹{j.payment_amount}</span>,
                j.status,
                j.responses_count || 0,
              ))}
            </div>
          )}
        </section>

        <section className="menu-section">
          <div className="menu-head">
            <span className="menu-num">02</span>
            <h2 className="menu-title">My Collab</h2>
            <span className="menu-count">{collabs.length} {collabs.length === 1 ? 'item' : 'items'}</span>
          </div>
          {loading ? (
            <p className="menu-muted">Loading…</p>
          ) : collabs.length === 0 ? (
            <p className="menu-muted">No collab posts yet.</p>
          ) : (
            <div className="mng-list">
              {collabs.map(c => renderRow(
                'collab', c, c.title,
                null,
                c.status,
                c.applicants || 0,
              ))}
            </div>
          )}
        </section>
      </div>

      {createKind && (
        <CreateWorkModal
          kind={createKind}
          onClose={() => setCreateKind(null)}
          onCreated={load}
        />
      )}
    </AppShell>
  );
}
