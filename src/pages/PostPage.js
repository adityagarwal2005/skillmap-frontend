import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWorkRequests } from '../api/work';
import { getMyCollabPosts } from '../api/collab';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './PostPage.css';

export default function PostPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [jobs, setJobs]       = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.all([
      getMyWorkRequests(user.id).then(r => r.data.work_requests || []).catch(() => []),
      getMyCollabPosts().then(r => r.data.collab_posts || []).catch(() => []),
    ]).then(([j, c]) => {
      if (!alive) return;
      setJobs(j); setCollabs(c); setLoading(false);
    });
    return () => { alive = false; };
  }, [user?.id]);

  return (
    <AppShell active="post">
      <div className="post-page">
        <h1 className="post-page-title">Post</h1>

        <div className="post-new-grid">
          <button className="post-new-card" onClick={() => navigate('/freelance?new=1')}>
            <span className="post-new-emoji">💼</span>
            <span className="post-new-name">Freelance job</span>
            <span className="post-new-desc">Hire someone for paid work</span>
          </button>
          <button className="post-new-card" onClick={() => navigate('/collab?new=1')}>
            <span className="post-new-emoji">🧩</span>
            <span className="post-new-name">Collab</span>
            <span className="post-new-desc">Find teammates for a project</span>
          </button>
        </div>

        <section className="post-section">
          <div className="post-section-head">
            <span className="post-section-num">01</span>
            <h2 className="post-section-title">My Freelance</h2>
            <span className="post-section-count">{jobs.length}</span>
          </div>
          {loading ? (
            <p className="post-muted">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="post-muted">No freelance posts yet.</p>
          ) : jobs.map(j => (
            <button key={j.id} className="post-row" onClick={() => navigate('/freelance')}>
              <span className="post-row-title">{j.description}</span>
              <span className="post-row-meta">
                <span className="post-row-price">₹{j.payment_amount}</span>
                <span className="post-row-sub">{j.responses_count} applied · {j.status}</span>
              </span>
            </button>
          ))}
        </section>

        <section className="post-section">
          <div className="post-section-head">
            <span className="post-section-num">02</span>
            <h2 className="post-section-title">My Collab</h2>
            <span className="post-section-count">{collabs.length}</span>
          </div>
          {loading ? (
            <p className="post-muted">Loading…</p>
          ) : collabs.length === 0 ? (
            <p className="post-muted">No collab posts yet.</p>
          ) : collabs.map(c => (
            <button key={c.id} className="post-row" onClick={() => navigate('/collab')}>
              <span className="post-row-title">{c.title}</span>
              <span className="post-row-meta">
                <span className="post-row-sub">{c.applicants} joined · {c.status}</span>
              </span>
            </button>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
