import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getConversations, sendMessage, getMessages } from '../api/work';
import { ConversationSkeleton } from '../components/Skeleton';
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
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const messagesEndRef                    = useRef(null);
  const pollRef                           = useRef(null);
  const [searchParams]                    = useSearchParams();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadConversations(); }, []);

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

  const loadMessages = async (convId) => {
    try {
      if (!loadingMsgs) setLoadingMsgs(true);
      const res = await getMessages(convId);
      setMessages(res.data.messages || []);
    } catch {}
    finally { setLoadingMsgs(false); }
  };

  const handleSend = async e => {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;
    const msgText = text.trim();
    setText('');
    // Optimistic
    const tempMsg = { id: Date.now(), sender: user.username, text: msgText, created_at: new Date().toISOString(), sending: true };
    setMessages(prev => [...prev, tempMsg]);
    try {
      setSending(true);
      await sendMessage(activeConv.id, msgText);
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
              <span>Complete a freelance job or collab to start chatting</span>
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id}
              className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
              onClick={() => setActiveConv(conv)}>
              <div className="conv-ava">
                {conv.with_avatar
                  ? <img className="ava-img" src={conv.with_avatar} alt="" />
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
                  <span className="conv-type-tag">{conv.type}</span>
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
                <div className="conv-ava">
                  {activeConv.with_avatar
                    ? <img className="ava-img" src={activeConv.with_avatar} alt="" />
                    : activeConv.with?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="thread-name">{activeConv.with}</div>
                  <div className="thread-type">
                    {activeConv.type === 'direct' ? 'Direct message' : `${activeConv.type} project`}
                  </div>
                </div>
              </div>

              <div className="thread-messages">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="msgs-loading">Loading messages...</div>
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
                            ? <img className="ava-img" src={msg.sender_avatar} alt="" />
                            : msg.sender[0].toUpperCase()}
                        </div>
                      )}
                      {!isOwn && !showSender && <div className="msg-ava-spacer" />}
                      <div className={`msg-bubble ${isOwn ? 'own' : ''} ${msg.sending ? 'sending' : ''}`}>
                        {!isOwn && showSender && (
                          <span className="msg-sender">{msg.sender}</span>
                        )}
                        <p className="msg-text">{msg.text}</p>
                        <span className="msg-time">{timeAgo(msg.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className="msg-input-bar" onSubmit={handleSend}>
                <input
                  className="msg-input"
                  placeholder={`Message ${activeConv.with}...`}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                />
                <button type="submit" className="msg-send-btn" disabled={sending || !text.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}