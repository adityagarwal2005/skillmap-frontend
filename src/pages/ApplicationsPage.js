import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getMyApplications, completeWorkRequest } from '../api/work';
import AppShell from '../components/AppShell';
import usePoll from '../hooks/usePoll';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './FreelancePage.css';   // reuses .wr-view-btn/.wr-close-btn/.wr-waiting for the complete/rate row
import './ApplicationsPage.css';

const STATUS_LABEL = {
  pending:  'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  filled:   'Filled by someone else',
};
const STATUS_CLASS = {
  pending:  'st-pending',
  accepted: 'st-accepted',
  declined: 'st-declined',
  filled:   'st-filled',
};

function ago(dateStr) {
  if (!dateStr) return '';
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);    if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

  // Quietly poll so a status change (accepted/declined elsewhere) shows up
  // without a manual refresh — no loading spinner, just a silent swap since
  // this list is short and personal (not something the user scrolls deep
  // into), so a wholesale replace doesn't risk losing scroll position.
  usePoll(() => {
    getMyApplications().then(r => setApps(r.data.applications || [])).catch(() => {});
  }, 20000);

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
      loadApps();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to mark complete', 'error');
    } finally { setCompletingId(null); }
  };

  const shown = apps.filter(a => filter === 'all' || a.kind === filter);

  return (
    <AppShell active="applications">
      <div className="apps-wrapper">
        <div className="apps-hero">
          <h1 className="apps-heading">My Applications</h1>
          <p className="apps-sub">Everything you've applied to, and where it stands.</p>
        </div>

        <div className="type-filters apps-filters">
          {['all', 'freelance', 'collab'].map(t => (
            <button key={t}
              className={`type-filter-btn ${filter === t ? 'active' : ''}`}
              onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /><PostCardSkeleton /><PostCardSkeleton /></div>
        ) : shown.length === 0 ? (
          <div className="state-box">
            <h3>No applications yet</h3>
            <p>Apply to a freelance job or collab and it'll show up here.</p>
            <div className="state-box-actions">
              <button className="opp-cta" onClick={() => navigate('/')}>Browse work</button>
            </div>
          </div>
        ) : (
          shown.map(a => (
            <div key={`${a.kind}-${a.id}`} className="app-card"
              onClick={() => navigate('/')}>
              <div className="app-card-top">
                <span className={`opp-kind ${a.kind}`}>{a.kind === 'freelance' ? 'Freelance' : 'Collab'}</span>
                <span className={`app-status ${STATUS_CLASS[a.status] || 'st-pending'}`}>
                  {STATUS_LABEL[a.status] || a.status}
                </span>
              </div>
              <h2 className="app-title">{a.title}</h2>
              <div className="app-meta">
                <span className="app-by"
                  onClick={e => { e.stopPropagation(); navigate(`/profile/${a.posted_by_id}`); }}>
                  by {a.posted_by}
                </span>
                {a.kind === 'freelance' && a.payment_amount != null && (
                  <span className="app-pay">₹{a.payment_amount}</span>
                )}
                <span className="app-ago">Applied {ago(a.applied_at)}</span>
              </div>

              {a.kind === 'freelance' && a.status === 'accepted' && (
                <div className="app-complete-row" onClick={e => e.stopPropagation()}>
                  {a.wr_status === 'closed' ? (
                    <button className="wr-view-btn" onClick={() => navigate(`/profile/${a.posted_by_id}`)}>
                      ★ Rate {a.posted_by}
                    </button>
                  ) : a.completed_by_worker ? (
                    <span className="wr-waiting">Waiting for {a.posted_by} to confirm…</span>
                  ) : (
                    <button className="wr-close-btn" onClick={() => handleCompleteJob(a.id)}
                      disabled={completingId === a.id}>
                      {completingId === a.id ? '…' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
