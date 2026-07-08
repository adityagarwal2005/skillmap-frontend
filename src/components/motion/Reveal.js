import { useEffect, useRef, useState } from 'react';

/**
 * Fade + slide-up a block into view as it enters the viewport.
 * Dependency-free (IntersectionObserver). Reveals once, then unobserves.
 *
 * Usage:
 *   <Reveal><PostCard /></Reveal>
 *   <Reveal as="article" delay={80} className="post-card">…</Reveal>
 *
 * Honors prefers-reduced-motion automatically (CSS guard in global.css
 * collapses the transition, and we start visible if IO is unavailable).
 */
export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true); // no IO support → show immediately, never hide content
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
