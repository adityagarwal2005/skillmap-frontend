import {
  ICONS as I, money, distance, timeLeft, windowLeft, isUrgent,
  Avatar, Seats, Skills, Thumb, Bookmark, COLLAB_LABEL, Applied,
} from './ListingCard';
import './BoardRow.css';

/* One line of the board.

   A card grid gives every listing the same rectangle and leaves you to read
   each one to find out whether it matters. A row puts the three facts that
   decide that — how long is left, what it pays, how far it is — in fixed
   columns, so the eye runs down a column instead of around a card. The
   countdown leads because it is the only one that is running out.

   The clock is not decoration: the bar beneath it is the share of the
   poster's own window still to run, so a six-hour gig posted five hours ago
   reads as nearly spent even while "1h left" still sounds comfortable. */

function Clock({ item, now }) {
  const left = timeLeft(item.expires_at, now);
  if (!left) return <span className="bd-clock" aria-hidden="true" />;
  return (
    <span className={`bd-clock ${isUrgent(item, now) ? 'is-urgent' : ''}`}>
      <span className="bd-clock-val">{left.replace(' left', '')}</span>
      <span className="bd-clock-bar" style={{ '--left': windowLeft(item, now) }} aria-hidden="true" />
    </span>
  );
}

const keys = (open) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
};

export default function BoardRow({ item, now, isNew, saved, onSave, onOpen, style }) {
  const gig = item.kind === 'freelance';
  const needed = item.people_needed || 1;
  const filled = item.hired_count || item.accepted_count || 0;
  const spotsLeft = Math.max(0, needed - filled);

  const pay = Number(item.payment_amount) > 0 ? money(item.payment_amount) : null;
  const title = gig ? (item.description || item.title) : item.title;
  const label = `${gig ? 'Paid gig' : 'Team'}${pay ? `, ${pay}` : ''}: ${title}`;

  return (
    <article
      className={`bd-row ${gig ? 'is-gig' : 'is-team'} ${isNew ? 'is-new' : ''}`}
      style={style} tabIndex={0} role="button" aria-label={label}
      onClick={onOpen} onKeyDown={keys(onOpen)}
    >
      <Clock item={item} now={now} />

      <div className="bd-main">
        {/* The thumbnail lives inside the text column rather than in a column
            of its own: most listings have no photo, and an empty fixed track
            would put a gap down the middle of the board. */}
        <Thumb item={item} />
        <div className="bd-text">
          <h3 className="bd-title">{title}</h3>
          <div className="bd-meta">
            <span className={`bd-kind ${gig ? 'is-gig' : 'is-team'}`}>
              {gig ? 'Paid gig' : (COLLAB_LABEL[item.collab_type] || 'Team')}
            </span>
            {gig
              ? needed > 1 && <span className="bd-seats-n">{spotsLeft} of {needed} left</span>
              : <Seats host={item.user} needed={needed} filled={filled} />}
            <Skills skills={item.skills} limit={2} />
            <Applied n={item.applicant_count} />
          </div>
        </div>
      </div>

      <div className="bd-figures">
        {pay
          ? <span className="bd-pay">{pay}</span>
          : <span className="bd-pay is-none">{COLLAB_LABEL[item.collab_type] || 'Team'}</span>}
        {item.distance_km != null && (
          <span className="bd-dist">{I.pin}{distance(item.distance_km)}</span>
        )}
      </div>

      <div className="bd-who">
        <Avatar user={item.user} className="bd-ava" />
        <span className="bd-by">{item.user?.username}</span>
      </div>

      <button type="button" className={`bd-save ${saved ? 'is-saved' : ''}`}
        onClick={onSave} aria-pressed={saved}
        aria-label={saved ? 'Remove from saved' : 'Save for later'}>
        <Bookmark on={saved} />
      </button>

      <span className="bd-go" aria-hidden="true">{I.arrow || '→'}</span>
    </article>
  );
}
