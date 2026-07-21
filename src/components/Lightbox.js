import { useEffect } from 'react';
import './Lightbox.css';

/**
 * Full-screen in-app media viewer — replaces window.open(url, '_blank'),
 * which kicked users out to a bare browser tab (losing all app chrome/state)
 * every time they tapped a post or message image. Matches the Instagram/
 * WhatsApp pattern of viewing media without leaving the app.
 *
 * Props: src (string), type ('image' | 'video'), onClose (fn)
 */
export default function Lightbox({ src, type = 'image', onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" aria-label="Close" onClick={onClose}>×</button>
      {type === 'video' ? (
        <video className="lightbox-media" src={src} controls playsInline autoPlay
          onClick={e => e.stopPropagation()} />
      ) : (
        <img className="lightbox-media" src={src} alt=""
          onClick={e => e.stopPropagation()} />
      )}
    </div>
  );
}
