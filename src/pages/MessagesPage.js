import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import { getConversations, startConversation, sendMessage, getMessages, setTyping } from '../api/work';
import { getFriends } from '../api/users';
import { ConversationSkeleton } from '../components/Skeleton';
import Lightbox from '../components/Lightbox';
import CollabTasksPanel from '../components/CollabTasksPanel';
import { cldAvatar, cldThumb } from '../utils/cloudinaryUrl';
import AppShell from '../components/AppShell';
import './FeedPage.css';
import './MessagesPage.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesPage() {
  const { user }             = useAuth();
  const { showToast }        = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [file, setFile]                   = useState(null);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const messagesEndRef                    = useRef(null);
  const pollRef                           = useRef(null);
  const [searchParams]                    = useSearchParams();

  // "New message" friend picker
  const [friends, setFriends]             = useState([]);
  const [showNewMsg, setShowNewMsg]        = useState(false);
  const [startingWith, setStartingWith]    = useState(null);
  const [lightboxSrc, setLightboxSrc]      = useState(null);
  const [showTasks, setShowTasks]          = useState(false);
  const [typingUsers, setTypingUsers]      = useState([]);
  const lastTypingPingRef                  = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadConversations();
    getFriends().then(r => setFriends(r.data.friends || [])).catch(() => {});
  }, []);

  // Quietly poll the conversation list so a new conversation, a new last-
  // message preview, or someone else's group thread shows up without a
  // manual refresh — no loading spinner, just a silent swap. The currently
  // open thread (activeConv) isn't touched by this, so it can't disrupt
  // what's on screen while you're actually reading a conversation.
  useEffect(() => {
    const id = setInterval(() => {
      getConversations().then(res => setConversations(res.data.conversations || [])).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Keep the mobile bottom nav out of the way while actually in a thread —
  // it was competing with the input bar for the same reserved space,
  // producing a visible dead gap that shifted around as the keyboard opened.
  useEffect(() => {
    document.body.classList.toggle('conv-active', !!activeConv);
    return () => document.body.classList.remove('conv-active');
  }, [activeConv]);

  useEffect(() => { setShowTasks(false); setTypingUsers([]); }, [activeConv?.id]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      // Near-real-time: poll the open thread every 2.5s on both people's screens.
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 2500);
    }
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        if (match) setActiveConv(match);
      }
    } catch { showToast('Failed to load conversations', 'error'); }
    finally { setLoadingConvs(false); }
  };

  const startNewConversation = async (friend) => {
    try {
      setStartingWith(friend.id);
      const r = await startConversation(friend.id);
      const convId = r.data.conversation_id;
      const res = await getConversations();
      const convs = res.data.conversations || [];
      setConversations(convs);
      const match = convs.find(cv => String(cv.id) === String(convId));
      setActiveConv(match || { id: convId, with: friend.username, with_avatar: friend.profile_image, type: 'direct' });
      setShowNewMsg(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not start chat', 'error');
    } finally { setStartingWith(null); }
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

  return (
    <AppShell active="messages">
      <div className={`messages-layout ${activeConv ? 'has-active-conv' : ''}`}>
        {/* Conversation List */}
        <aside className="convs-panel">
          <div className="convs-header">
            <h2 className="convs-title">Messages</h2>
          </div>

          {loadingConvs ? (
            <>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </>
          ) : conversations.length === 0 ? (
            <div className="convs-empty">
              <p>No conversations yet</p>
              <span>Message a friend, or complete a freelance job or collab to start chatting</span>
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id}
              className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
              onClick={() => setActiveConv(conv)}>
              <div className={`conv-ava ${conv.is_group ? 'is-group' : ''}`}>
                {conv.is_group
                  ? '👥'
                  : conv.with_avatar
                    ? <img className="ava-img" src={cldAvatar(conv.with_avatar)} alt="" />
                    : conv.with?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="conv-info">
                <div className="conv-top-row">
                  <span className="conv-name">{conv.with || 'Unknown'}</span>
                  {conv.last_message_at && (
                    <span className="conv-time">{timeAgo(conv.last_message_at)}</span>
                  )}
                </div>
                <div className="conv-bottom-row">
                  <span className="conv-preview">{conv.last_message || 'No messages yet'}</span>
                  <span className="conv-type-tag">
                    {conv.is_group
                      ? `${conv.participant_count} people`
                      : conv.type === 'collab' ? 'Collab' : 'Direct'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </aside>

        {/* Message Thread */}
        <main className="thread-panel">
          {!activeConv ? (
            <div className="thread-empty">
              <div className="thread-empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose from your conversations on the left</p>
            </div>
          ) : (
            <>
              <div className="thread-header">
                <button className="thread-back-btn" aria-label="Back to conversations"
                  onClick={() => setActiveConv(null)}>←</button>
                <div className={`conv-ava ${activeConv.is_group ? 'is-group' : ''}`}>
                  {activeConv.is_group
                    ? '👥'
                    : activeConv.with_avatar
                      ? <img className="ava-img" src={cldAvatar(activeConv.with_avatar)} alt="" />
                      : activeConv.with?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="thread-info">
                  <div className="thread-name">{activeConv.with}</div>
                  <div className="thread-type">
                    {activeConv.is_group
                      ? `Collab team · ${activeConv.participant_count} people`
                      : activeConv.type === 'direct' ? 'Direct message' : `${activeConv.type} project`}
                  </div>
                </div>
                {activeConv.is_group && activeConv.collab_post_id && (
                  <button type="button" className="thread-tasks-btn"
                    onClick={() => setShowTasks(s => !s)}>
                    📋 Tasks
                  </button>
                )}
              </div>

              <div className="thread-messages">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="msgs-loading"><span className="msgs-spinner" />Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="msgs-empty">No messages yet. Say hello!</div>
                ) : messages.map((msg, i) => {
                  const isOwn = msg.sender === user?.username;
                  const prevMsg = messages[i - 1];
                  const showSender = !prevMsg || prevMsg.sender !== msg.sender;
                  return (
                    <div key={msg.id} className={`msg-row ${isOwn ? 'own' : 'other'}`}>
                      {!isOwn && showSender && (
                        <div className="msg-ava">
                          {msg.sender_avatar
                            ? <img className="ava-img" src={cldAvatar(msg.sender_avatar)} alt="" />
                            : msg.sender[0].toUpperCase()}
                        </div>
                      )}
                      {!isOwn && !showSender && <div className="msg-ava-spacer" />}
                      <div className={`msg-bubble ${isOwn ? 'own' : ''} ${msg.sending ? 'sending' : ''}`}>
                        {!isOwn && showSender && (
                          <span className="msg-sender">{msg.sender}</span>
                        )}
                        {msg.media_url && (
                          msg.media_type === 'video'
                            ? <video className="msg-media" src={msg.media_url} controls playsInline />
                            : <img className="msg-media" src={cldThumb(msg.media_url, 480)} alt=""
                                onClick={() => setLightboxSrc(msg.media_url)} />
                        )}
                        {msg.text && <p className="msg-text">{msg.text}</p>}
                        <span className="msg-time">
                          {timeAgo(msg.created_at)}
                          {isOwn && !msg.sending && (
                            <span className={`msg-tick ${msg.read_at ? 'is-read' : ''}`}
                              aria-label={msg.read_at ? 'Seen' : 'Sent'}>
                              {msg.read_at ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {typingUsers.length > 0 && (
                  <div className="msg-row other">
                    <div className="msg-ava-spacer" />
                    <div className="msg-bubble typing-bubble" aria-label={`${typingUsers.join(', ')} typing`}>
                      <span className="typing-dots"><span /><span /><span /></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {file && (
                <div className="msg-attach-preview">
                  {file.type.startsWith('video')
                    ? <video className="msg-attach-thumb" src={URL.createObjectURL(file)} />
                    : <img className="msg-attach-thumb" src={URL.createObjectURL(file)} alt="" />}
                  <span className="msg-attach-name">{file.name}</span>
                  <button type="button" className="msg-attach-x" onClick={() => setFile(null)}>×</button>
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
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.88 18.6a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" />
                  </svg>
                </label>
                <input
                  className="msg-input"
                  placeholder={activeConv.is_group ? 'Message the team...' : `Message ${activeConv.with}...`}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                />
                <button type="submit" className="msg-send-btn" disabled={sending || (!text.trim() && !file)}>
                  Send
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