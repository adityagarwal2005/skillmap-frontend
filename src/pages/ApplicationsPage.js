import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getMyApplications } from '../api/work';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
import './FeedPage.css';
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

  useEffect(() => {
    getMyApplications()
      .then(r => setApps(r.data.applications || []))
      .catch(() => showToast('Failed to load applications', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <button className="opp-cta" onClick={() => navigate('/freelance')}>Browse jobs</button>
              <button className="opp-cta ghost" onClick={() => navigate('/collab')}>Browse collabs</button>
            </div>
          </div>
        ) : (
          shown.map(a => (
            <div key={`${a.kind}-${a.id}`} className="app-card"
              onClick={() => navigate(a.kind === 'freelance' ? '/freelance' : '/collab')}>
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
                {a.kind === 'collab' && a.collab_type && (
                  <span className="opp-ctype">{a.collab_type}</span>
                )}
                <span className="app-ago">Applied {ago(a.applied_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
