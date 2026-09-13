import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import { respondFriendRequest } from '../api/users';
import AppShell from '../components/AppShell';
import usePoll from '../hooks/usePoll';
import { PostCardSkeleton } from '../components/Skeleton';
import { cldAvatar } from '../utils/cloudinaryUrl';
import './FeedPage.css';
import './NotificationsPage.css';

const TYPE_ICONS = {
  work_request:      '💼',
  proposal:          '📨',
  proposal_accepted: '✅',
  proposal_declined: '❌',
  work_assigned:     '🎯',
  message:           '💬',
  reaction:          '🔥',
  comment:           '💬',
  referral:          '🎉',
  job_complete:      '🏁',
  job_review:        '🧾',
  job_confirm:       '✅',
  friend_request:    '👋',
  friend_accepted:   '🤝',
  collab_match:      '🧩',
};

// Where tapping a notification should take you. job_complete carries the
// person to rate as its actor, so it opens their profile.
function linkFor(n, myId) {
  switch (n.type) {
    case 'message':           return '/messages';
    case 'proposal':
    case 'job_review':        return '/post';
    case 'proposal_accepted':
    case 'proposal_declined':
    case 'work_assigned':
    case 'job_confirm':       return '/applications';
    case 'job_complete':      return n.actor_id ? `/profile/${n.actor_id}` : '/applications';
    case 'work_request':
    case 'collab_match':      return '/';
    case 'reaction':
    case 'comment':           return myId ? `/profile/${myId}` : null;
    case 'friend_request':
    case 'friend_accepted':   return n.actor_id ? `/profile/${n.actor_id}` : '/people';
    case 'referral':          return '/settings';
    default:                  return null;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();
  const { user }             = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [busyId, setBusyId]               = useState(null);
  // Per-notification override once actioned here, so the buttons update
  // immediately without waiting on a re-fetch.
  const [statusOverride, setStatusOverride] = useState({});
  const [newIds, setNewIds] = useState(new Set());
  const seenIds = useRef(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      const fresh = res.data.notifications || [];
      setNotifications(fresh);
      // Baseline of what we've seen — a full (re)load never flashes anything.
      seenIds.current = new Set(fresh.map(n => n.id));
      setNewIds(new Set());
    } catch { showToast('Failed to load notifications', 'error'); }
    finally { setLoading(false); }
  };

  // Quietly poll for new notifications and prepend/flash anything that
  // wasn't there before — same approach used across Feed/Collab/Freelance.
  // The topbar bell badge already polls separately every 30s; this keeps
  // the actual list in sync too, without a manual refresh.
  usePoll(async () => {
    try {
      const res = await getNotifications();
      const fresh = res.data.notifications || [];
      const arrived = fresh.filter(n => !seenIds.current.has(n.id));
      if (arrived.length) {
        arrived.forEach(n => seenIds.current.add(n.id));
        setNotifications(prev => [...arrived, ...prev]);
        setNewIds(prev => { const n2 = new Set(prev); arrived.forEach(n => n2.add(n.id)); return n2; });
      }
    } catch { /* silent — polling shouldn't nag */ }
  }, 20000);

  const handleRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleOpen = (n) => {
    if (!n.is_read) handleRead(n.id);
    const to = linkFor(n, user?.id);
    if (to) navigate(to);
  };

  const handleReadAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All marked as read', 'success');
    } catch { showToast('Failed to mark all as read', 'error'); }
  };

  const handleRespond = async (e, n, action) => {
    e.stopPropagation();
    try {
      setBusyId(n.id);
      await respondFriendRequest(n.actor_id, action);
      setStatusOverride(s => ({ ...s, [n.id]: action === 'accept' ? 'friends' : 'none' }));
      showToast(
        action === 'accept' ? `You and ${n.actor_username} are now friends` : 'Request declined',
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.error || 'Something went wrong', 'error');
    } finally { setBusyId(null); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppShell active="notifications">
      <div className="notif-wrapper">
        <div className="notif-header">
          <div>
            <h1 className="notif-title">Notifications</h1>
            {unreadCount > 0 && <span className="notif-unread-count">{unreadCount} unread</span>}
          </div>
          {unreadCount > 0 && (
            <button className="notif-read-all" onClick={handleReadAll}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /><PostCardSkeleton /></div>
        ) : notifications.length === 0 ? (
          <div className="state-box">
            <h3>No notifications yet</h3>
            <p>You'll see activity here when people interact with your work</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => {
              const friendStatus = statusOverride[n.id] || n.friendship_status;
              const showFriendActions = n.type === 'friend_request' && n.actor_id
                && friendStatus === 'request_received';
              const busy = busyId === n.id;
              return (
                <div key={n.id}
                  className={`notif-card ${!n.is_read ? 'unread' : ''} ${newIds.has(n.id) ? 'is-new' : ''}`}
                  role="button" tabIndex={0}
                  onClick={() => handleOpen(n)}
                  onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') handleOpen(n); }}>
                  <div className="notif-icon">
                    {n.actor_avatar
                      ? <img className="notif-actor-ava" src={cldAvatar(n.actor_avatar)} alt="" />
                      : TYPE_ICONS[n.type] || '🔔'}
                  </div>
                  <div className="notif-body">
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                    {showFriendActions && (
                      <div className="notif-actions">
                        <button className="notif-action-btn is-accept" disabled={busy}
                          onClick={e => handleRespond(e, n, 'accept')}>
                          {busy ? '…' : 'Accept'}
                        </button>
                        <button className="notif-action-btn is-decline" disabled={busy}
                          onClick={e => handleRespond(e, n, 'reject')}>
                          Decline
                        </button>
                      </div>
                    )}
                    {n.type === 'friend_request' && friendStatus === 'friends' && (
                      <span className="notif-friend-state">✓ Friends</span>
                    )}
                  </div>
                  {!n.is_read && <div className="notif-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
