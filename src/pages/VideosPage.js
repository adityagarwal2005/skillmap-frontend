import { useEffect, useRef, useState, useCallback } from 'react';
import AppShell from '../components/AppShell';
import { useToast } from '../context/ToastContext';
import { prepareMediaFile } from '../utils/mediaUpload';
import { getVideoFeed, createVideo, likeVideo, viewVideo } from '../api/videos';
import DEMO_VIDEOS from '../data/demoVideos';
import './VideosPage.css';

const Avatar = ({ user }) => (
  user?.avatar
    ? <img className="rv-ava" src={user.avatar} alt="" />
    : <span className="rv-ava rv-ava-fallback">{(user?.username || '?')[0].toUpperCase()}</span>
);

export default function VideosPage() {
  const { showToast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState(null);   // { file, previewUrl, caption } while posting
  const [posting, setPosting] = useState(false);

  const videoEls = useRef({});   // id -> <video>
  const viewed = useRef(new Set());
  const fileInput = useRef();

  const load = useCallback(async (offset) => {
    try {
      const r = await getVideoFeed(offset);
      const incoming = r.data.videos || [];
      setHasMore(r.data.has_more);
      setVideos(prev => {
        if (offset) return [...prev, ...incoming];
        // Fresh load. Once we've reached the end of the real feed and there
        // still aren't many clips, top it up with sample clips so a visitor
        // never lands on a dead, empty feed. They sit after the real ones and
        // fall away on their own as real uploads arrive.
        if (!r.data.has_more && incoming.length < 6) {
          const seen = new Set(incoming.map(v => v.url));
          const fill = DEMO_VIDEOS.filter(d => !seen.has(d.url))
            .slice(0, Math.max(0, 10 - incoming.length));
          return [...incoming, ...fill];
        }
        return incoming;
      });
    } catch {
      if (!offset) showToast('Could not load videos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(0); }, [load]);

  // Play whichever clip is centred on screen; pause the rest. One observer,
  // re-attached whenever the list grows.
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          el.play().catch(() => {});
          const id = el.dataset.id;
          if (!viewed.current.has(id)) {
            viewed.current.add(id);
            if (!el.dataset.demo) viewVideo(id).catch(() => {});   // sample clips aren't counted
          }
        } else {
          el.pause();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    Object.values(videoEls.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [videos]);

  const togglePlay = (el) => { if (el.paused) el.play().catch(() => {}); else el.pause(); };

  const toggleLike = async (v) => {
    setVideos(list => list.map(x => x.id === v.id
      ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    if (v.demo) return;   // sample clip — the like is local-only, nothing to persist
    try { await likeVideo(v.id); }
    catch { setVideos(list => list.map(x => x.id === v.id
      ? { ...x, liked: v.liked, likes: v.likes } : x)); }
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) { showToast('Pick a video file', 'error'); return; }
    const ok = await prepareMediaFile(file, showToast);   // validates size/type
    if (!ok) return;
    setSheet({ file: ok, previewUrl: URL.createObjectURL(ok), caption: '' });
  };

  const submit = async () => {
    if (!sheet || posting) return;
    setPosting(true);
    try {
      const r = await createVideo({ video: sheet.file, caption: sheet.caption.trim() });
      setVideos(list => [r.data.video, ...list]);
      setSheet(null);
      showToast('Posted', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not post that video', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <AppShell active="videos">
      <div className="rv-wrap">
        <header className="rv-head">
          <div>
            <h1 className="rv-title">Videos</h1>
            <p className="rv-sub">Show your work. Scroll to watch.</p>
          </div>
          <button className="rv-post-btn" onClick={() => fileInput.current?.click()}>
            Post a video
          </button>
          <input ref={fileInput} type="file" accept="video/*" hidden onChange={onPick} />
        </header>

        {loading ? (
          <div className="rv-state">Loading…</div>
        ) : videos.length === 0 ? (
          <div className="rv-state">
            <h3>No videos yet</h3>
            <p>Be the first. Post a short clip of your work — a reel, a build, a before-and-after.</p>
            <button className="rv-post-btn" onClick={() => fileInput.current?.click()}>Post a video</button>
          </div>
        ) : (
          <div className="rv-feed">
            {videos.map(v => (
              <section className="rv-slide" key={v.id}>
                <video
                  className="rv-video"
                  data-id={v.id}
                  data-demo={v.demo ? '1' : undefined}
                  ref={el => { videoEls.current[v.id] = el; }}
                  src={v.url}
                  poster={v.thumbnail || undefined}
                  muted={muted}
                  loop
                  playsInline
                  preload="metadata"
                  onClick={(e) => togglePlay(e.currentTarget)}
                />

                <button className="rv-mute" onClick={() => setMuted(m => !m)}
                  aria-label={muted ? 'Unmute' : 'Mute'}>
                  {muted ? '🔇' : '🔊'}
                </button>

                <div className="rv-overlay">
                  <div className="rv-meta">
                    <div className="rv-poster">
                      <Avatar user={v.user} />
                      <span className="rv-name">@{v.user?.username}</span>
                      {v.user?.category && <span className="rv-cat">{v.user.category}</span>}
                    </div>
                    {v.caption && <p className="rv-caption">{v.caption}</p>}
                  </div>
                  <div className="rv-actions">
                    <button className={`rv-like ${v.liked ? 'is-on' : ''}`} onClick={() => toggleLike(v)}
                      aria-pressed={v.liked} aria-label="Like">
                      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"
                        fill={v.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />
                      </svg>
                      <span>{v.likes}</span>
                    </button>
                    <span className="rv-views">{v.views} views</span>
                  </div>
                </div>
              </section>
            ))}
            {hasMore && (
              <div className="rv-more">
                <button className="rv-more-btn" onClick={() => load(videos.length)}>Load more</button>
              </div>
            )}
          </div>
        )}

        {sheet && (
          <div className="rv-up-overlay" onClick={() => !posting && setSheet(null)}>
            <div className="rv-up" onClick={e => e.stopPropagation()}>
              <h2 className="rv-up-title">New video</h2>
              <video className="rv-up-preview" src={sheet.previewUrl} controls muted playsInline />
              <textarea className="rv-up-caption" rows={2} maxLength={200}
                placeholder="Say what this is (optional)"
                value={sheet.caption}
                onChange={e => setSheet(s => ({ ...s, caption: e.target.value }))} />
              <div className="rv-up-actions">
                <button className="rv-up-cancel" onClick={() => setSheet(null)} disabled={posting}>Cancel</button>
                <button className="rv-up-submit" onClick={submit} disabled={posting}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
