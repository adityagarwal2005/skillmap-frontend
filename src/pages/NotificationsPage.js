import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import AppShell from '../components/AppShell';
import { PostCardSkeleton } from '../components/Skeleton';
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
};

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

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
    } catch { showToast('Failed to load notifications', 'error'); }
    finally { setLoading(false); }
  };

  const handleRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleReadAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All marked as read', 'success');
    } catch { showToast('Failed to mark all as read', 'error'); }
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
            {notifications.map(n => (
              <div key={n.id}
                className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                onClick={() => handleRead(n.id)}>
                <div className="notif-icon">
                  {TYPE_ICONS[n.notification_type] || '🔔'}
                </div>
                <div className="notif-body">
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.created_at)}</span>
                </div>
                {!n.is_read && <div className="notif-dot" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}