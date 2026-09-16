import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import { getConversations, sendMessage, getMessages, setTyping } from '../api/work';
import { ConversationSkeleton } from '../components/Skeleton';
import Lightbox from '../components/Lightbox';
import CollabTasksPanel from '../components/CollabTasksPanel';
import { cldAvatar, cldThumb } from '../utils/cloudinaryUrl';
import AppShell from '../components/AppShell';
import usePoll from '../hooks/usePoll';
import NotificationBell from '../components/NotificationBell';
import { ICONS as I, parseTs, money } from '../components/ListingCard';
import './FeedPage.css';
import './MessagesPage.css';

function timeAgo(value) {
  const ts = parseTs(value);
  if (Number.isNaN(ts)) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const clockTime = (value) =>
  new Date(parseTs(value)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// "Today" / "Yesterday" / "12 Sep" above the first message of each day.
function dayLabel(value) {
  const ts = parseTs(value);
  if (Number.isNaN(ts)) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    day: 'numeric', month: 'short',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

const sameDay = (a, b) => {
  const x = parseTs(a);
  const y = parseTs(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  return new Date(x).toDateString() === new Date(y).toDateString();
};

const GIG_STATUS = {
  open:     { label: 'Hiring', tone: 'open' },
  assigned: { label: 'In progress', tone: 'live' },
  closed:   { label: 'Closed', tone: 'done' },
};

function Ava({ conv, className = '' }) {
  if (conv.is_group) {
    return <span className={`conv-ava is-group ${className}`}>{I.team}</span>;
  }
  return (
    <span className={`conv-ava ${className}`}>
      {conv.with_avatar
        ? <img className="ava-img" src={cldAvatar(conv.with_avatar)} alt="" />
        : (conv.with?.[0] || '?').toUpperCase()}
    </span>
  );
}

/* What this conversation is about: the gig's payout and title, or the collab.
   Chats exist because of work, so the work is part of the chat. */
function WorkChip({ work }) {
  if (!work) return null;
  if (work.kind === 'collab') return <span className="conv-work is-team">Collab · {work.title}</span>;
  return (
    <span className="conv-work is-gig">
      <strong>{money(work.payment_amount)}</strong> · {work.title}
    </span>
  );
}

export default function MessagesPage() {
  const { user }             = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [file, setFile]                   = useState(null);
  const [query, setQuery]                 = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [searchParams]                    = useSearchParams();

  const [lightboxSrc, setLightboxSrc]      = useState(null);
  const [showTasks, setShowTasks]          = useState(false);
  const [typingUsers, setTypingUsers]      = useState([]);
  const lastTypingPingRef                  = useRef(0);
  const threadRef                          = useRef(null);
  const atBottomRef                        = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadConversations(); }, []);

  // Quietly poll the conversation list so a new conversation, a new last-
  // message preview, or someone else's group thread shows up without a
  // manual refresh — no loading spinner, just a silent swap. Slower than the
  // open thread, and paused while the tab is hidden.
  usePoll(() => {
    getConversations().then(res => setConversations(res.data.conversations || [])).catch(() => {});
  }, 15000);

  // Keep the mobile bottom nav out of the way while actually in a thread —
  // it was competing with the input bar for the same reserved space,
  // producing a visible dead gap that shifted around as the keyboard opened.
  useEffect(() => {
    document.body.classList.toggle('conv-active', !!activeConv);
    return () => document.body.classList.remove('conv-active');
  }, [activeConv]);

  useEffect(() => { setShowTasks(false); setTypingUsers([]); }, [activeConv?.id]);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv]);

  // The open thread stays near-real-time (6s) — but only while a thread is
  // actually open AND the tab is visible, so a backgrounded chat costs
  // nothing. This is the one poll that genuinely needs to be fast.
  usePoll(() => {
    if (activeConv) loadMessages(activeConv.id);
  }, 6000, !!activeConv);

  // Follow new messages only when you're already at the bottom — otherwise
  // reading back through a thread yanked you to the end every few seconds.
  useEffect(() => {
    const el = threadRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, typingUsers.length]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
  }, [activeConv?.id]);

  const onThreadScroll = () => {
    const el = threadRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await getConversations();
      const convs = res.data.conversations || [];
      setConversations(convs);
      // Opened from a profile's "Message" button (/messages?c=<id>) → auto-open it.
      const cid = searchParams.get('c');
      if (cid) {
        const match = convs.find(cv => String(cv.id) === String(cid));
        if (match) openConv(match);
      }
    } catch { showToast('Failed to load conversations', 'error'); }
    finally { setLoadingConvs(false); }
  };

  // Opening a thread marks it read on the server, so clear the badge here
  // rather than waiting for the next list poll to catch up.
  const openConv = (conv) => {
    setActiveConv(conv);
    setConversations(prev => prev.map(c => (c.id === conv.id ? { ...c, unread: 0 } : c)));
  };

  const loadMessages = async (convId) => {
    try {
      if (!loadingMsgs) setLoadingMsgs(true);
      const res = await getMessages(convId);
      setMessages(res.data.messages || []);
      setTypingUsers(res.data.typing_users || []);
    } catch {}
    finally { setLoadingMsgs(false); }
  };

  // Pinged (throttled to once per 2s) while the user has this thread open and
  // is actively typing — the recipient's poll picks it up and shows dots.
  // The 4s server-side expiry (work/views.py) is what makes it disappear
  // again, not an explicit "stopped typing" signal.
  const handleTextChange = e => {
    setText(e.target.value);
    if (!activeConv) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current > 2000) {
      lastTypingPingRef.current = now;
      setTyping(activeConv.id).catch(() => {});
    }
  };

  const handleSend = async e => {
    e.preventDefault();
    if ((!text.trim() && !file) || !activeConv) return;
    const msgText = text.trim();
    const media = file;
    setText('');
    setFile(null);
    atBottomRef.current = true;
    // Optimistic (local preview for media)
    const tempMsg = {
      id: Date.now(), sender: user.username, text: msgText,
      media_url: media ? URL.createObjectURL(media) : null,
      media_type: media ? (media.type.startsWith('video') ? 'video' : 'image') : null,
      created_at: new Date().toISOString(), sending: true,
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      setSending(true);
      await sendMessage(activeConv.id, msgText, media);
      await loadMessages(activeConv.id);
    } catch {
      showToast('Failed to send message', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(msgText);
    } finally { setSending(false); }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q
    ? conversations.filter(c => [c.with, c.last_message, c.work?.title]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : conversations), [conversations, q]);
  const totalUnread = conversations.reduce((n, c) => n + (c.unread || 0), 0);

  const work = activeConv?.work;
  const gigStatus = work?.kind === 'freelance' ? (GIG_STATUS[work.status] || GIG_STATUS.open) : null;
  const openWork = () => {
    if (!work) return;
    if (work.is_poster) navigate(`/applicants/${work.kind}/${work.id}`);
    else navigate('/applications');
  };

  return (
    <AppShell active="messages">
      <div className={`messages-layout ${activeConv ? 'has-active-conv' : ''}`}>
        {/* Conversation list */}
        <aside className="convs-panel">
          <div className="convs-header">
            <div className="convs-title-row">
              <h2 className="convs-title">Messages</h2>
              {totalUnread > 0 && <span className="convs-unread">{totalUnread}</span>}
            </div>
            <NotificationBell />
          </div>

          {conversations.length > 0 && (
            <label className="convs-search">
              <span className="convs-search-ic">{I.search}</span>
              <input className="convs-search-input" type="text" placeholder="Search chats"
                aria-label="Search chats" value={query} onChange={e => setQuery(e.target.value)} />
              {query && (
                <button type="button" className="convs-search-clear" aria-label="Clear search"
                  onClick={() => setQuery('')}>{I.x}</button>
              )}
            </label>
          )}

          <div className="convs-list">
            {loadingConvs ? (
              <><ConversationSkeleton /><ConversationSkeleton /><ConversationSkeleton /></>
            ) : conversations.length === 0 ? (
              <div className="convs-empty">
                <p>No chats yet</p>
                <span>Apply to a gig, or hire someone for one, and the chat opens itself.</span>
                <button type="button" className="convs-empty-cta" onClick={() => navigate('/')}>
                  Find work nearby
                </button>
              </div>
            ) : shown.length === 0 ? (
              <div className="convs-empty"><p>No chats match “{query}”</p></div>
            ) : shown.map(conv => (
              <button type="button" key={conv.id}
                className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''} ${conv.unread > 0 ? 'is-unread' : ''}`}
                onClick={() => openConv(conv)}>
                <Ava conv={conv} />
                <span className="conv-info">
                  <span className="conv-top-row">
                    <span className="conv-name">{conv.with || 'Unknown'}</span>
                    {conv.last_message_at && <span className="conv-time">{timeAgo(conv.last_message_at)}</span>}
                  </span>
                  <span className="conv-bottom-row">
                    <span className="conv-preview">{conv.last_message || 'No messages yet'}</span>
                    {conv.unread > 0 && <span className="conv-badge">{conv.unread}</span>}
                  </span>
                  <WorkChip work={conv.work} />
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Thread */}
        <main className="thread-panel">
          {!activeConv ? (
            <div className="thread-empty">
              <span className="thread-empty-ic">{I.wallet}</span>
              <h3>Your work chats live here</h3>
              <p>Every gig you're hired for and every collab you join opens a chat with the people involved.</p>
            </div>
          ) : (
            <>
              <div className="thread-header">
                <button className="thread-back-btn" aria-label="Back to chats"
                  onClick={() => setActiveConv(null)}>←</button>
                <Ava conv={activeConv} />
                <div className="thread-info">
                  <div className="thread-name">{activeConv.with}</div>
                  <div className="thread-type">
                    {activeConv.is_group
                      ? `Collab team · ${activeConv.participant_count} people`
                      : activeConv.type === 'direct' ? 'Direct message' : 'Gig chat'}
                  </div>
                </div>
                {activeConv.is_group && activeConv.collab_post_id && (
                  <button type="button" className="thread-tasks-btn" onClick={() => setShowTasks(s => !s)}>
                    Tasks
                  </button>
                )}
                <NotificationBell className="thread-bell" />
              </div>

              {work && (
                <div className={`thread-work ${work.kind === 'collab' ? 'is-team' : 'is-gig'}`}>
                  <div className="thread-work-main">
                    <span className="thread-work-label">
                      {work.kind === 'collab' ? 'Collab' : work.is_poster ? 'You posted' : 'You were hired for'}
                    </span>
                    <span className="thread-work-title">{work.title}</span>
                  </div>
                  {work.kind === 'freelance' && (
                    <span className="thread-work-pay">{money(work.payment_amount)}</span>
                  )}
                  {gigStatus && <span className={`thread-work-state is-${gigStatus.tone}`}>{gigStatus.label}</span>}
                  <button type="button" className="thread-work-go" onClick={openWork}>
                    {work.is_poster ? 'Manage' : 'Track'} {I.arrow}
                  </button>
                </div>
              )}

              <div className="thread-messages" ref={threadRef} onScroll={onThreadScroll}>
                {loadingMsgs && messages.length === 0 ? (
                  <div className="msgs-loading"><span className="msgs-spinner" />Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="msgs-empty">
                    {work
                      ? `Say hello and sort out the details${work.kind === 'freelance' ? ' — timing, delivery, payment' : ''}.`
                      : 'No messages yet. Say hello!'}
                  </div>
                ) : messages.map((msg, i) => {
                  const isOwn = msg.sender === user?.username;
                  const prev = messages[i - 1];
                  const next = messages[i + 1];
                  const newDay = !prev || !sameDay(prev.created_at, msg.created_at);
                  const startsGroup = newDay || prev.sender !== msg.sender;
                  const endsGroup = !next || next.sender !== msg.sender
                    || !sameDay(next.created_at, msg.created_at);
                  return (
                    <div key={msg.id}>
                      {newDay && <div className="msg-day"><span>{dayLabel(msg.created_at)}</span></div>}
                      <div className={`msg-row ${isOwn ? 'own' : 'other'} ${endsGroup ? 'ends' : ''}`}>
                        {!isOwn && (startsGroup
                          ? <span className="msg-ava">
                              {msg.sender_avatar
                                ? <img className="ava-img" src={cldAvatar(msg.sender_avatar)} alt="" />
                                : msg.sender[0].toUpperCase()}
                            </span>
                          : <span className="msg-ava-spacer" />)}
                        <div className={`msg-bubble ${isOwn ? 'own' : ''} ${msg.sending ? 'sending' : ''} ${startsGroup ? 'starts' : ''} ${endsGroup ? 'ends' : ''}`}>
                          {!isOwn && startsGroup && activeConv.is_group && (
                            <span className="msg-sender">{msg.sender}</span>
                          )}
                          {msg.media_url && (
                            msg.media_type === 'video'
                              ? <video className="msg-media" src={msg.media_url} controls playsInline />
                              : <img className="msg-media" src={cldThumb(msg.media_url, 480)} alt=""
                                  onClick={() => setLightboxSrc(msg.media_url)} />
                          )}
                          {msg.text && <p className="msg-text">{msg.text}</p>}
                          {endsGroup && (
                            <span className="msg-time">
                              {msg.sending ? 'sending…' : clockTime(msg.created_at)}
                              {isOwn && !msg.sending && (
                                <span className={`msg-tick ${msg.read_at ? 'is-read' : ''}`}
                                  aria-label={msg.read_at ? 'Seen' : 'Sent'}>
                                  {msg.read_at ? '✓✓' : '✓'}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typingUsers.length > 0 && (
                  <div className="msg-row other ends">
                    <span className="msg-ava-spacer" />
                    <div className="msg-bubble typing-bubble" aria-label={`${typingUsers.join(', ')} typing`}>
                      <span className="typing-dots"><span /><span /><span /></span>
                    </div>
                  </div>
                )}
              </div>

              {file && (
                <div className="msg-attach-preview">
                  {file.type.startsWith('video')
                    ? <video className="msg-attach-thumb" src={URL.createObjectURL(file)} />
                    : <img className="msg-attach-thumb" src={URL.createObjectURL(file)} alt="" />}
                  <span className="msg-attach-name">{file.name}</span>
                  <button type="button" className="msg-attach-x" onClick={() => setFile(null)}
                    aria-label="Remove attachment">×</button>
                </div>
              )}

              <form className="msg-input-bar" onSubmit={handleSend}>
                <label className="msg-attach-btn" title="Attach image or video">
                  <input type="file" accept="image/*,video/*" hidden
                    onChange={async e => {
                      const f = e.target.files[0]; e.target.value = '';
                      if (!f) return;
                      const prepared = await prepareMediaFile(f, showToast);
                      if (prepared) setFile(prepared);
                    }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.88 18.6a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" />
                  </svg>
                </label>
                <input
                  className="msg-input"
                  placeholder={activeConv.is_group ? 'Message the team…' : `Message ${activeConv.with}…`}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                />
                <button type="submit" className="msg-send-btn" aria-label="Send"
                  disabled={sending || (!text.trim() && !file)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </form>

              {showTasks && activeConv.is_group && activeConv.collab_post_id && (
                <CollabTasksPanel
                  postId={activeConv.collab_post_id}
                  participants={[
                    { id: user.id, username: user.username },
                    ...(activeConv.participants || []),
                  ]}
                  currentUserId={user.id}
                  isCollabOwner={!!activeConv.is_collab_owner}
                  onClose={() => setShowTasks(false)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </AppShell>
  );
}
