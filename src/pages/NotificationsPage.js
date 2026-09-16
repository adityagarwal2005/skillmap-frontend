import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import { respondFriendRequest } from '../api/users';
import AppShell from '../components/AppShell';
import usePoll from '../hooks/usePoll';
import { PostCardSkeleton } from '../components/Skeleton';
import { cldAvatar } from '../utils/cloudinaryUrl';
import { parseTs } from '../components/ListingCard';
import './FeedPage.css';
import './NotificationsPage.css';

const svg = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const GLYPH = {
  wallet:  svg(<><rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M2.5 10.5h19M16 15h2" /></>),
  send:    svg(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />),
  check:   svg(<path d="M20 6 9 17l-5-5" />),
  x:       svg(<path d="M18 6 6 18M6 6l12 12" />),
  target:  svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>),
  chat:    svg(<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.7L3 21l1.9-5a8.2 8.2 0 0 1-.9-3.7 8.4 8.4 0 0 1 8.4-8.3 8.4 8.4 0 0 1 8.6 7.9z" />),
  flame:   svg(<path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4.5-6-4.5-10.5 0 0-3 1.5-3 5.5 0 1.6-1 2.5-2 2.5S8 12 8 10c-1.6 1.4-3 3.2-3 5.5C5 19.3 8 22 12 22z" />),
  gift:    svg(<><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path d="M12 9S9.5 4 7.5 5s.5 4 4.5 4zM12 9s2.5-5 4.5-4-.5 4-4.5 4z" /></>),
  flag:    svg(<><path d="M5 21V4M5 4h11l-1.5 4L16 12H5" /></>),
  receipt: svg(<><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  wave:    svg(<><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" /><path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0" /></>),
  people:  svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2a4.8 4.8 0 0 1 5 4.8" /></>),
  puzzle:  svg(<path d="M10 3h4v2.5a1.5 1.5 0 0 0 3 0V3h4v4h-2.5a1.5 1.5 0 0 0 0 3H21v4h-2.5a1.5 1.5 0 0 0 0 3H21v4h-4v-2.5a1.5 1.5 0 0 0-3 0V21h-4v-4H6.5a1.5 1.5 0 0 0 0-3H10z" />),
  bell:    svg(<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
};

// icon + tone per type. Tone is what the thing means: money/work is the
// brand, a finished job is green, a decline is amber, people are violet.
const TYPES = {
  work_request:      { icon: GLYPH.wallet,  tone: 'gig',    label: 'New work' },
  proposal:          { icon: GLYPH.send,    tone: 'gig',    label: 'Application' },
  proposal_accepted: { icon: GLYPH.check,   tone: 'ok',     label: 'Accepted' },
  proposal_declined: { icon: GLYPH.x,       tone: 'warn',   label: 'Declined' },
  work_assigned:     { icon: GLYPH.target,  tone: 'gig',    label: 'Hired' },
  message:           { icon: GLYPH.chat,    tone: 'plain',  label: 'Message' },
  reaction:          { icon: GLYPH.flame,   tone: 'plain',  label: 'Reaction' },
  comment:           { icon: GLYPH.chat,    tone: 'plain',  label: 'Comment' },
  referral:          { icon: GLYPH.gift,    tone: 'ok',     label: 'Referral' },
  job_complete:      { icon: GLYPH.flag,    tone: 'ok',     label: 'Finished' },
  job_review:        { icon: GLYPH.receipt, tone: 'gig',    label: 'Review' },
  job_confirm:       { icon: GLYPH.check,   tone: 'ok',     label: 'Confirm' },
  friend_request:    { icon: GLYPH.wave,    tone: 'team',   label: 'Request' },
  friend_accepted:   { icon: GLYPH.people,  tone: 'team',   label: 'Friends' },
  collab_match:      { icon: GLYPH.puzzle,  tone: 'team',   label: 'Collab' },
  // Older rows written before the type list settled; still in people's
  // histories, so they get a real icon rather than the generic bell.
  application:       { icon: GLYPH.send,    tone: 'gig',    label: 'Application' },
};
const FALLBACK = { icon: GLYPH.bell, tone: 'plain', label: 'Update' };

// Where tapping a notification should take you. job_complete carries the
// person to rate as its actor, so it opens their profile.
function linkFor(n, myId) {
  switch (n.type) {
    case 'message':           return '/messages';
    case 'proposal':
    case 'application':
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

function timeAgo(value) {
  const ts = parseTs(value);
  if (Number.isNaN(ts)) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// Today / Yesterday / This week / a month heading, so a long list reads as
// a timeline instead of one endless column.
function bucketOf(value) {
  const ts = parseTs(value);
  if (Number.isNaN(ts)) return 'Earlier';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (Date.now() - ts < 7 * 86400000) return 'This week';
  return d.toLocaleDateString([], {
    month: 'long',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export default function NotificationsPage() {
  const { showToast }        = useToast();
  const navigate             = useNavigate();
  const { user }             = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [busyId, setBusyId]               = useState(null);
  const [unreadOnly, setUnreadOnly]       = useState(false);
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
  // wasn't there before — same approach used across the app. The topbar bell
  // badge polls separately every 30s; this keeps the list in sync too.
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
  const shown = unreadOnly ? notifications.filter(n => !n.is_read) : notifications;

  // [[bucket, items], …] in the order the list already arrives (newest first).
  const groups = useMemo(() => {
    const out = [];
    shown.forEach(n => {
      const bucket = bucketOf(n.created_at);
      const last = out[out.length - 1];
      if (last && last[0] === bucket) last[1].push(n);
      else out.push([bucket, [n]]);
    });
    return out;
  }, [shown]);

  const renderCard = (n) => {
    const meta = TYPES[n.type] || FALLBACK;
    const friendStatus = statusOverride[n.id] || n.friendship_status;
    const showFriendActions = n.type === 'friend_request' && n.actor_id
      && friendStatus === 'request_received';
    const busy = busyId === n.id;
    return (
      <div key={n.id}
        className={`notif-card is-${meta.tone} ${!n.is_read ? 'unread' : ''} ${newIds.has(n.id) ? 'is-new' : ''}`}
        role="button" tabIndex={0}
        onClick={() => handleOpen(n)}
        onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') handleOpen(n); }}>
        <span className="notif-icon">
          {n.actor_avatar
            ? <img className="notif-actor-ava" src={cldAvatar(n.actor_avatar)} alt="" />
            : meta.icon}
          <span className="notif-icon-badge">{meta.icon}</span>
        </span>
        <div className="notif-body">
          <p className="notif-message">{n.message}</p>
          <span className="notif-meta">
            <span className="notif-kind">{meta.label}</span>
            <span className="notif-time">{timeAgo(n.created_at)}</span>
          </span>
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
        {!n.is_read && <span className="notif-dot" aria-label="Unread" />}
      </div>
    );
  };

  return (
    <AppShell active="notifications">
      <div className="notif-wrapper">
        <header className="notif-header">
          <div className="notif-head-main">
            <h1 className="notif-title">Notifications</h1>
            <p className="notif-sub">
              {unreadCount > 0
                ? `${unreadCount} new since you last looked`
                : 'Everything here is up to date'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" className="notif-read-all" onClick={handleReadAll}>
              Mark all read
            </button>
          )}
        </header>

        {notifications.length > 0 && (
          <div className="notif-filters" role="tablist" aria-label="Filter notifications">
            <button type="button" role="tab" aria-selected={!unreadOnly}
              className={`notif-filter ${!unreadOnly ? 'is-on' : ''}`}
              onClick={() => setUnreadOnly(false)}>
              All <span>{notifications.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={unreadOnly}
              className={`notif-filter ${unreadOnly ? 'is-on' : ''}`}
              onClick={() => setUnreadOnly(true)}>
              Unread <span>{unreadCount}</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-row"><PostCardSkeleton /><PostCardSkeleton /></div>
        ) : notifications.length === 0 ? (
          <div className="state-box">
            <h3>Nothing yet</h3>
            <p>Applications, hires and messages all land here. Post a gig or apply to one to get things moving.</p>
            <div className="state-box-actions">
              <button className="opp-cta" onClick={() => navigate('/')}>Find work nearby</button>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="state-box">
            <h3>All caught up</h3>
            <p>No unread notifications.</p>
            <div className="state-box-actions">
              <button className="opp-cta ghost" onClick={() => setUnreadOnly(false)}>Show everything</button>
            </div>
          </div>
        ) : (
          groups.map(([bucket, items]) => (
            <section key={bucket} className="notif-group">
              <h2 className="notif-group-title">{bucket}</h2>
              <div className="notif-list">{items.map(renderCard)}</div>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
