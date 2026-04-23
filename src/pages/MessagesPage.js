import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getConversations, sendMessage, getMessages } from '../api/work';
import { ConversationSkeleton } from '../components/Skeleton';
import './FeedPage.css';
import './MessagesPage.css';

const SVGsun  = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const SVGmoon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

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
  const { user, logoutUser } = useAuth();
  const { showToast }        = useToast();
  const navigate             = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [theme, setTheme]                 = useState(localStorage.getItem('theme') || 'dark');
  const messagesEndRef                    = useRef(null);
  const pollRef                           = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      pollRef.current = setInterval(() => loadMessages(activeConv.id), 5000);
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
      setConversations(res.data.conversations || []);
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
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <div className="topbar-icon">S</div>
          <span className="topbar-name">SkillMap</span>
        </div>
        <div className="topbar-right">
          <button className="topbar-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? SVGsun : SVGmoon}
          </button>
          <div className="topbar-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="topbar-username">{user?.username}</span>
          <button className="topbar-signout" onClick={logoutUser}>Sign out</button>
        </div>
      </header>

      <div className="messages-layout">
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
              <div className="conv-ava">{conv.with?.[0]?.toUpperCase() || '?'}</div>
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
                <div className="conv-ava">{activeConv.with?.[0]?.toUpperCase() || '?'}</div>
                <div>
                  <div className="thread-name">{activeConv.with}</div>
                  <div className="thread-type">{activeConv.type} project</div>
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
                        <div className="msg-ava">{msg.sender[0].toUpperCase()}</div>
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
    </div>
  );
}