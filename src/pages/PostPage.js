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

        {/* Two big create actions */}
        <div className="post-new-grid">
          <button className="post-new-card" onClick={() => navigate('/freelance?new=1')}>
            <span className="post-new-name">New freelance</span>
            <span className="post-new-desc">Hire someone for paid work</span>
            <span className="post-new-arrow">→</span>
          </button>
          <button className="post-new-card" onClick={() => navigate('/collab?new=1')}>
            <span className="post-new-name">New collab</span>
            <span className="post-new-desc">Find teammates for a project</span>
            <span className="post-new-arrow">→</span>
          </button>
        </div>

        {/* ── My Freelance — CUFood menu section ── */}
        <section className="menu-section">
          <div className="menu-head">
            <span className="menu-num">01</span>
            <h2 className="menu-title">My Freelance</h2>
            <span className="menu-count">{jobs.length} {jobs.length === 1 ? 'item' : 'items'}</span>
          </div>
          {loading ? (
            <p className="menu-muted">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="menu-muted">No freelance posts yet.</p>
          ) : (
            <div className="menu-list">
              {jobs.map(j => (
                <button key={j.id} className="menu-item" onClick={() => navigate('/freelance')}>
                  <span className="menu-item-name">{j.description}</span>
                  <span className="menu-item-foot">
                    <span className="menu-price">₹{j.payment_amount}</span>
                    <span className="menu-item-sub">{j.responses_count} applied · {j.status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── My Collab — CUFood menu section ── */}
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
            <div className="menu-list">
              {collabs.map(c => (
                <button key={c.id} className="menu-item" onClick={() => navigate('/collab')}>
                  <span className="menu-item-name">{c.title}</span>
                  <span className="menu-item-foot">
                    <span className="menu-item-sub">{c.applicants} joined · {c.status}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
