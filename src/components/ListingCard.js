import { cldAvatar } from '../utils/cloudinaryUrl';
import '../pages/Marketplace.css';

/* The two listing shapes — a paid gig and a collab — shared by the feed and
   the create-post preview, so what a poster sees while writing is exactly
   what people nearby will see.

   Density over decoration: these used to lead with a big tinted band and a
   30px number, which filled a laptop screen with three listings. The money
   still leads, but as a number in a row you can scan down. */

const MIN = 60000;
const HOUR = 3600000;

// Django's str(datetime) reads "2026-09-14 10:22:33.123456+00:00". The space
// and six-digit fraction are outside the format Safari's Date parser accepts,
// so normalise before parsing rather than trusting the browser.
export function parseTs(value) {
  if (!value) return NaN;
  return new Date(String(value).replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1')).getTime();
}

/** Time left in a listing's window, the way people say it: 35m, 4h 12m, 14h. */
export function timeLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  const diff = parseTs(expiresAt) - now;
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return 'Expired';
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MIN))}m left`;
  const hrs = Math.floor(diff / HOUR);
  const mins = Math.floor((diff % HOUR) / MIN);
  if (hrs < 10) return mins ? `${hrs}h ${mins}m left` : `${hrs}h left`;
  if (hrs <= 48) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

/** Share of the listing's window still to run, from 1 (just posted) to 0. */
export function windowLeft(item, now = Date.now()) {
  const end = parseTs(item.expires_at);
  const start = parseTs(item.created_at);
  if (Number.isNaN(end)) return 1;
  if (Number.isNaN(start) || end <= start) return end > now ? 1 : 0;
  return Math.min(1, Math.max(0, (end - now) / (end - start)));
}

export const isUrgent = (item, now = Date.now()) => {
  const left = parseTs(item.expires_at) - now;
  return !Number.isNaN(left) && left < 3 * HOUR;
};

export const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const distance = (km) => (
  km < 0.1 ? '<100 m' : km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`
);

const svg = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
export const ICONS = {
  pin:     svg(<><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>),
  clock:   svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  search:  svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  chevron: svg(<path d="m6 9 6 6 6-6" />),
  wallet:  svg(<><rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M2.5 10.5h19" /><path d="M16 15h2" /><path d="M6 6V5a2 2 0 0 1 2-2h8" /></>),
  team:    svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2a4.8 4.8 0 0 1 5 4.8" /></>),
  x:       svg(<path d="M18 6 6 18M6 6l12 12" />),
  check:   svg(<path d="M20 6 9 17l-5-5" />),
  plus:    svg(<path d="M12 5v14M5 12h14" />),
  arrow:   svg(<path d="M5 12h14M13 6l6 6-6 6" />),
};

export const Bookmark = ({ on }) => (
  <svg viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill={on ? 'currentColor' : 'none'}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4.2L5 20V5a1 1 0 0 1 1-1z" />
  </svg>
);

export function Avatar({ user, className = '' }) {
  return (
    <span className={`mk-ava ${className}`}>
      {user.profile_image
        ? <img className="ava-img" src={cldAvatar(user.profile_image, 80)} alt="" />
        : (user.username?.[0] || '?').toUpperCase()}
    </span>
  );
}

/* A collab's seats: the host, then one per person they're looking for. */
export function Seats({ host, needed, filled }) {
  const shown = Math.min(needed, 4);
  const taken = Math.min(filled, shown);
  return (
    <div className="mk-seats" aria-label={`${filled} of ${needed} seats filled`}>
      <Avatar user={host} className="mk-seat is-host" />
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`mk-seat ${i < taken ? 'is-filled' : 'is-open'}`}>
          {i < taken ? ICONS.check : ICONS.plus}
        </span>
      ))}
    </div>
  );
}

export function Skills({ skills, limit = 2 }) {
  if (!skills?.length) return null;
  const extra = skills.length - limit;
  return (
    <div className="mk-skills">
      {skills.slice(0, limit).map(s => <span key={s} className="mk-skill">{s}</span>)}
      {extra > 0 && <span className="mk-skill is-more">+{extra}</span>}
    </div>
  );
}

function SaveButton({ saved, onClick }) {
  return (
    <button type="button" className={`mk-save ${saved ? 'is-saved' : ''}`} onClick={onClick}
      aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save for later'}>
      <Bookmark on={saved} />
    </button>
  );
}

export function MetaChips({ item, now }) {
  const left = timeLeft(item.expires_at, now);
  return (
    <>
      {left && (
        <span className={`mk-chip is-time ${isUrgent(item, now) ? 'is-urgent' : ''}`}>{ICONS.clock}{left}</span>
      )}
      {item.distance_km != null && <span className="mk-chip">{ICONS.pin}{distance(item.distance_km)}</span>}
    </>
  );
}

/* A hairline across the top of the card that burns down with the listing's
   window — how long is left, readable without reading. */
function Fuse({ item, now }) {
  if (!item.expires_at) return null;
  return (
    <span className={`mk-fuse ${isUrgent(item, now) ? 'is-urgent' : ''}`}
      style={{ '--left': windowLeft(item, now) }} aria-hidden="true" />
  );
}

// The card is one big button; keys pressed on the save button inside it
// shouldn't also open the listing.
const cardKeys = (open) => (e) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
};

// interactive=false renders the card as a picture (the create-post preview):
// no focus stop, no handlers, no save button.
const cardProps = (interactive, onOpen, label) => (interactive
  ? { tabIndex: 0, role: 'button', onClick: onOpen, onKeyDown: cardKeys(onOpen), 'aria-label': label }
  : {});

export function GigCard({ item, now, isNew, saved, onSave, onOpen, style, interactive = true }) {
  const needed = item.people_needed || 1;
  const spotsLeft = Math.max(0, needed - (item.hired_count || 0));
  const pay = Number(item.payment_amount) > 0 ? money(item.payment_amount) : '₹ —';
  return (
    <article className={`mk-card is-gig ${isNew ? 'is-new' : ''}`} style={style}
      {...cardProps(interactive, onOpen, `Paid gig, ${pay}: ${item.title}`)}>
      <Fuse item={item} now={now} />
      <div className="mk-head">
        <span className="mk-pay">{pay}</span>
        <div className="mk-head-meta"><MetaChips item={item} now={now} /></div>
        {interactive && <SaveButton saved={saved} onClick={onSave} />}
      </div>

      <h3 className="mk-title">{item.description || item.title}</h3>

      <div className="mk-tags">
        <span className="mk-kind is-gig">Paid gig</span>
        {isNew && <span className="mk-new">New</span>}
        {needed > 1 && <span className="mk-cap">{needed} needed · {spotsLeft} left</span>}
        <Skills skills={item.skills} />
      </div>

      <div className="mk-foot">
        <span className="mk-poster">
          <Avatar user={item.user} />
          <span className="mk-poster-name">{item.user.username}</span>
          {item.gender_preference && item.gender_preference !== 'any' && (
            <span className="mk-poster-note">
              {item.gender_preference === 'male' ? 'Male only' : 'Female only'}
            </span>
          )}
        </span>
        <span className="mk-cta is-gig">Apply</span>
      </div>
    </article>
  );
}

export function TeamCard({ item, now, isNew, saved, onSave, onOpen, style, interactive = true }) {
  const needed = item.people_needed || 1;
  const filled = item.hired_count || 0;
  const open = Math.max(0, needed - filled);
  return (
    <article className={`mk-card is-team ${isNew ? 'is-new' : ''}`} style={style}
      {...cardProps(interactive, onOpen, `Team forming, ${open} open: ${item.title}`)}>
      <Fuse item={item} now={now} />
      <div className="mk-head">
        <Seats host={item.user} needed={needed} filled={filled} />
        <span className="mk-open">{open} of {needed} open</span>
        <div className="mk-head-meta"><MetaChips item={item} now={now} /></div>
        {interactive && <SaveButton saved={saved} onClick={onSave} />}
      </div>

      <h3 className="mk-title">{item.title}</h3>

      <div className="mk-tags">
        <span className="mk-kind is-team">Team</span>
        {isNew && <span className="mk-new">New</span>}
        <Skills skills={item.skills} />
      </div>

      <div className="mk-foot">
        <span className="mk-poster">
          <Avatar user={item.user} />
          <span className="mk-poster-name">{item.user.username}</span>
        </span>
        <span className="mk-cta is-team">Apply</span>
      </div>
    </article>
  );
}
