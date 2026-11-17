import { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import { getFounderStats } from '../api/stats';
import './DashboardPage.css';

const nf = new Intl.NumberFormat('en-IN');

// 14-day signup bars — pure SVG-free CSS, so it stays light and on-theme.
function Trend({ trend }) {
  const max = Math.max(1, ...trend.map(d => d.count));
  return (
    <div className="db-chart" role="img" aria-label="Signups over the last 14 days">
      {trend.map((d, i) => {
        const last = i === trend.length - 1;
        const pct = Math.round((d.count / max) * 100);
        return (
          <div className="db-col" key={d.date} title={`${d.date}: ${d.count} signup${d.count === 1 ? '' : 's'}`}>
            <span className="db-col-n">{d.count || ''}</span>
            <div className={`db-bar ${last ? 'is-today' : ''}`} style={{ height: `${Math.max(pct, 3)}%` }} />
            <span className="db-col-x">{new Date(d.date).getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="db-card">
      <div className="db-card-label">{label}</div>
      <div className="db-card-val">{value}</div>
      {sub && <div className="db-card-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');   // loading | ok | forbidden | error
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    setStatus(s => (s === 'ok' ? 'ok' : 'loading'));
    try {
      const r = await getFounderStats();
      setStats(r.data);
      setUpdated(new Date());
      setStatus('ok');
    } catch (e) {
      setStatus(e.response?.status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell active="dashboard">
      <div className="db-wrap">
        <header className="db-head">
          <div>
            <h1 className="db-title">Dashboard</h1>
            <p className="db-sub">
              {status === 'ok' && updated
                ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Your numbers at a glance'}
            </p>
          </div>
          <button className="db-refresh" onClick={load} disabled={status === 'loading'}>
            {status === 'loading' ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </header>

        {status === 'loading' && <div className="db-state">Loading your numbers…</div>}
        {status === 'forbidden' && (
          <div className="db-state">
            <strong>Founder only.</strong>
            <span>This dashboard is visible to the founder account.</span>
          </div>
        )}
        {status === 'error' && (
          <div className="db-state">
            <span>Couldn’t load stats.</span>
            <button className="db-refresh" onClick={load}>Try again</button>
          </div>
        )}

        {status === 'ok' && stats && (
          <>
            <section className="db-hero">
              <div className="db-hero-main">
                <span className="db-hero-num">{nf.format(stats.users.today)}</span>
                <span className="db-hero-label">signed up today</span>
              </div>
              <div className="db-hero-side">
                <div><strong>{nf.format(stats.users.week)}</strong><span>this week</span></div>
                <div><strong>{nf.format(stats.users.total)}</strong><span>total users</span></div>
              </div>
            </section>

            <section className="db-panel">
              <div className="db-panel-head"><h2>Signups · last 14 days</h2></div>
              <Trend trend={stats.users.trend} />
            </section>

            <section className="db-grid">
              <Card label="New users · month" value={nf.format(stats.users.month)} sub={`${nf.format(stats.users.today)} today`} />
              <Card label="Gigs posted" value={nf.format(stats.gigs.today)} sub={`${nf.format(stats.gigs.active)} active · ${nf.format(stats.gigs.total)} total`} />
              <Card label="Collabs posted" value={nf.format(stats.collabs.today)} sub={`${nf.format(stats.collabs.active)} active · ${nf.format(stats.collabs.total)} total`} />
              <Card label="Applications" value={nf.format(stats.applications.today)} sub={`${nf.format(stats.applications.total)} all time`} />
              <Card label="Videos posted" value={nf.format(stats.videos.today)} sub={`${nf.format(stats.videos.total)} total`} />
              <Card label="Messages sent" value={nf.format(stats.messages.today)} sub={`${nf.format(stats.conversations.today)} new chats today`} />
              <Card label="Collab requests" value={nf.format(stats.collab_requests.today)} sub={`${nf.format(stats.collab_requests.total)} all time`} />
              <Card label="Jobs completed" value={nf.format(stats.completed_jobs)} sub="all time" />
            </section>

            <section className="db-panel">
              <div className="db-panel-head"><h2>Recent signups</h2></div>
              {stats.recent_signups.length === 0 ? (
                <p className="db-empty">No one has signed up yet.</p>
              ) : (
                <ul className="db-recent">
                  {stats.recent_signups.map((u, i) => (
                    <li key={i}>
                      <span className="db-recent-ava">{(u.username || '?')[0].toUpperCase()}</span>
                      <span className="db-recent-name">@{u.username}</span>
                      <span className="db-recent-cat">{u.category || 'No category'}</span>
                      <span className="db-recent-time">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
