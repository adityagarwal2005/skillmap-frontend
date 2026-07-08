import { useRef } from 'react';
import useReducedMotion from './useReducedMotion';

/**
 * A button/link wrapper that subtly pulls toward the cursor on hover
 * (Cuberto/Awwwards-style "magnetic" affordance). Pure pointer math +
 * transform, no dependency.
 *
 * IMPORTANT: this only adds a visual transform. It forwards every prop
 * (onClick, type, disabled, aria-*, etc.) to the underlying element, so
 * existing button behavior is 100% preserved.
 *
 * Usage:
 *   <MagneticButton className="login-submit" type="submit">Sign in</MagneticButton>
 *   <MagneticButton as="a" href="/x" className="btn">Link</MagneticButton>
 */
export default function MagneticButton({
  as: Tag = 'button',
  strength = 0.35,
  className = '',
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const handleMove = (e) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - (r.left + r.width / 2);
    const my = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  return (
    <Tag
      ref={ref}
      className={`magnetic ${className}`.trim()}
      style={{ transition: 'transform 0.35s var(--ease-out-expo)', ...style }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}
