import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount } from '../api/notifications';
import './NotificationBell.css';

const BELL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 8-2.5 8h17S18 14.5 18 8.5z" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

/**
 * Self-contained notification bell — polls its own unread count and navigates
 * to /notifications. Meant to sit inline inside a page's header row (next to
 * the title), so it lines up with the heading instead of floating.
 */
export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = () => getUnreadCount().then(r => setUnread(r.data.unread_count || 0)).catch(() => {});
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <button className={`notif-bell ${className}`} aria-label="Notifications"
      onClick={() => navigate('/notifications')}>
      {BELL}
      {unread > 0 && <span className="notif-bell-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );
}
