import './Logo.css';

/**
 * DoitHere wordmark: a mark plus "Doit" + "Here".
 *
 * The mark is a map pin whose inside is a countdown ring with a gap — the
 * two things that are actually true of every listing here: it is near you,
 * and it is running out. It is drawn rather than set in a font so it stays
 * crisp at any size and recolours with the theme.
 *
 * The script face is gone. Pacifico is a free Google script and the default
 * "friendly startup" choice; it read as a template the moment anyone who had
 * seen a few landing pages looked at it. The wordmark is now the product's
 * own display face, heavy and tight, which also means the logo and the
 * interface finally speak with one voice.
 *
 * size: font-size in rem (defaults to 1.5). mark=false drops the symbol for
 * places that are already obviously DoitHere, like the app's own sidebar.
 */
export default function Logo({ size = 1.5, onClick, className = '', mark = true }) {
  return (
    <span
      className={`brand-logo ${onClick ? 'is-clickable' : ''} ${className}`}
      style={{ fontSize: `${size}rem` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label="DoitHere"
    >
      {mark && (
        <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path className="brand-mark-pin"
            d="M12 21.5c0 0 7.25-6.75 7.25-11.75a7.25 7.25 0 1 0-14.5 0C4.75 14.75 12 21.5 12 21.5Z" />
          {/* A dashed circle rather than an arc path: the dash leaves a gap of
              about a quarter turn, and with no rotation it falls at the upper
              right — a timer with a bite out of it. */}
          <circle className="brand-mark-ring" cx="12" cy="9.75" r="3.3" />
        </svg>
      )}
      <span className="brand-logo-word">
        <span className="brand-logo-doit">Doit</span><span className="brand-logo-here">Here</span>
      </span>
    </span>
  );
}
