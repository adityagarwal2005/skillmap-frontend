import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getMyApplications, completeWorkRequest } from '../api/work';
import AppShell from '../components/AppShell';
import usePoll from '../hooks/usePoll';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './ApplicationsPage.css';

function ago(dateStr) {
  if (!dateStr) return '';
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);    if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const icon = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const CHECK = icon(<path d="M20 6 9 17l-5-5" />);
const CROSS = icon(<path d="M18 6 6 18M6 6l12 12" />);

const isDone = (a) => a.completed_by_poster && a.completed_by_worker;

/* Where an application stands, laid out like order tracking: what's done,
   what's happening now, and — for a gig — what's still ahead. */
function trackerFor(a) {
  const gig = a.kind === 'freelance';
  const applied = { label: 'Applied', state: 'done' };

  if (a.status === 'declined') {
    return { tone: 'fail', line: 'Not selected this time', steps: [applied, { label: 'Not selected', state: 'failed' }] };
  }
  if (a.status === 'filled') {
    return {
      tone: 'fail',
      line: gig ? 'Filled by someone else' : 'The team filled up',
      steps: [applied, { label: 'Filled', state: 'failed' }],
    };
  }
  if (a.status === 'closed') {
    return { tone: 'fail', line: 'Closed before a decision', steps: [applied, { label: 'Closed', state: 'failed' }] };
  }
  if (a.status === 'pending') {
    return {
      tone: 'wait',
      line: `Waiting on ${a.posted_by}`,
      steps: gig
        ? [applied, { label: 'Hired', state: 'current' }, { label: 'Done', state: 'todo' }]
        : [applied, { label: 'On the team', state: 'current' }],
    };
  }
  if (!gig) {
    return { tone: 'ok', line: "You're on the team", steps: [applied, { label: 'On the team', state: 'done' }] };
  }
  const done = isDone(a);
  return {
    tone: 'ok',
    line: done ? 'Completed' : "You're hired",
    steps: [
      applied,
      { label: 'Hired', state: 'done' },
      { label: done ? 'Done' : 'In progress', state: done ? 'done' : 'current' },
    ],
  };
}

/* The one thing to do next, if there is one. Any hire can mark a gig done
   while it's still open, and the poster confirms from their side. */
function NextStep({ a, completingId, onComplete, navigate }) {
  if (a.status !== 'accepted') return null;

  const row = (note, button) => (
    <div className="trk-actions">
      <span className="trk-note">{note}</span>
      {button}
    </div>
  );
  const messages = (ghost) => (
    <button type="button" className={`trk-btn ${ghost ? 'is-ghost' : ''}`} onClick={() => navigate('/messages')}>
      Open messages
    </button>
  );

  if (a.kind === 'collab') return row('Say hi to the team and get started.', messages(false));
  if (isDone(a)) {
    return row(`Nice work. Leave ${a.posted_by} a rating.`,
      <button type="button" className="trk-btn" onClick={() => navigate(`/profile/${a.posted_by_id}`)}>★ Rate</button>);
  }
  if (a.wr_status !== 'closed') {
    if (a.completed_by_worker) return row(`Marked done — waiting for ${a.posted_by} to confirm.`, messages(true));
    return row(
      a.completed_by_poster
        ? `${a.posted_by} marked it done — confirm to close it out.`
        : `Finished? Mark it done and ${a.posted_by} confirms.`,
      <button type="button" className="trk-btn" disabled={completingId === a.id} onClick={() => onComplete(a.id)}>
        {completingId === a.id ? '…' : a.completed_by_poster ? 'Confirm done' : 'Mark complete'}
      </button>);
  }
  return row(`${a.posted_by} closed this gig. Sort out anything left in Messages.`, messages(true));
}

export default function ApplicationsPage() {
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');   // all | freelance | collab
  const [completingId, setCompletingId] = useState(null);

  const loadApps = () => {
    getMyApplications()
      .then(r => setApps(r.data.applications || []))
      .catch(() => showToast('Failed to load applications', 'error'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadApps(); }, []);

  // A decision made on the other side shows up without a manual refresh.
  usePoll(() => {
    getMyApplications().then(r => setApps(r.data.applications || [])).catch(() => {});
  }, 20000);

  const handleComplete = async (wrId) => {
    try {
      setCompletingId(wrId);
      const res = await completeWorkRequest(wrId);
      showToast(
        res.data.status === 'closed'
          ? 'Job complete on both sides — go rate each other!'
          : 'Marked complete — waiting for the other side to confirm',
        'success'
      );
      loadApps();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark complete', 'error');
    } finally { setCompletingId(null); }
  };

  const shown = apps.filter(a => filter === 'all' || a.kind === filter);
  const waiting = apps.filter(a => a.status === 'pending').length;
  const won = apps.filter(a => a.status === 'accepted').length;

  return (
    <AppShell active="applications">
      <div className="apps-wrapper">
        <div className="apps-hero">
          <h1 className="apps-heading">My Applications</h1>
          <p className="apps-sub">Everything you've applied to, and where it stands.</p>
        </div>

        {!loading && apps.length > 0 && (
          <div className="trk-summary">
            <div className="trk-sum">
              <span className="trk-sum-val">{waiting}</span>
              <span className="trk-sum-label">Waiting</span>
            </div>
            <div className="trk-sum is-ok">
              <span className="trk-sum-val">{won}</span>
              <span className="trk-sum-label">Hired</span>
            </div>
            <div className="trk-sum">
              <span className="trk-sum-val">{apps.length}</span>
              <span className="trk-sum-label">Applied</span>
            </div>
          </div>
        )}

        <div className="trk-filters">
          {[['all', 'All'], ['freelance', 'Gigs'], ['collab', 'Teams']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id}
              className={`trk-filter ${filter === id ? 'is-on' : ''}`}
              onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton /></div>
        ) : shown.length === 0 ? (
          <div className="state-box">
            <h3>{apps.length ? 'Nothing in this list' : 'No applications yet'}</h3>
            <p>Apply to a gig or a team and you can follow it here, step by step.</p>
            <div className="state-box-actions">
              <button className="opp-cta" onClick={() => navigate('/')}>Find work near you</button>
            </div>
          </div>
        ) : (
          <div className="trk-list">
            {shown.map((a, i) => {
              const gig = a.kind === 'freelance';
              const t = trackerFor(a);
              return (
                <article key={`${a.kind}-${a.id}`} className={`trk-card ${gig ? 'is-gig' : 'is-team'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <div className="trk-top">
                    <span className="trk-kind">{gig ? 'Paid gig' : 'Team'}</span>
                    {gig && a.payment_amount != null && <span className="trk-pay">{money(a.payment_amount)}</span>}
                    <span className="trk-ago">Applied {ago(a.applied_at)}</span>
                  </div>
                  <h2 className="trk-title">{a.title}</h2>
                  <button type="button" className="trk-by" onClick={() => navigate(`/profile/${a.posted_by_id}`)}>
                    {gig ? 'Posted by' : 'Hosted by'} <strong>{a.posted_by}</strong>
                  </button>

                  <p className={`trk-line tone-${t.tone}`}>{t.line}</p>
                  <ol className="trk-steps">
                    {t.steps.map(s => (
                      <li key={s.label} className={`trk-step is-${s.state}`}>
                        <span className="trk-dot">
                          {s.state === 'done' ? CHECK : s.state === 'failed' ? CROSS : null}
                        </span>
                        <span className="trk-label">{s.label}</span>
                      </li>
                    ))}
                  </ol>

                  <NextStep a={a} completingId={completingId} onComplete={handleComplete} navigate={navigate} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
