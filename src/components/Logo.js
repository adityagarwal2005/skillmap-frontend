import './Logo.css';

/**
 * DoitHere wordmark — "Doit" in white, "Here" in orange, set in a bold
 * script (Pacifico). Scalable/transparent text so it stays crisp on any
 * background and in either theme (unlike a baked-in JPEG).
 *
 * size: font-size in rem (defaults to 1.5). onClick optional.
 */
export default function Logo({ size = 1.5, onClick, className = '' }) {
  return (
    <span
      className={`brand-logo ${onClick ? 'is-clickable' : ''} ${className}`}
      style={{ fontSize: `${size}rem` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label="DoitHere"
    >
      <span className="brand-logo-doit">Doit</span>
      <span className="brand-logo-here">Here</span>
    </span>
  );
}
