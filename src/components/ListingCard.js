import { cldAvatar } from '../utils/cloudinaryUrl';
import '../pages/Marketplace.css';

/* The two listing shapes — a gig's payout ticket and a collab's lobby —
   shared by the feed and the create-post preview, so what a poster sees
   while writing is exactly what people nearby will see. */

const HOUR = 3600000;

// Listings run 48 hours at most, so hours are the unit that means something:
// "1d left" would cover anything from 24 to 47 hours.
export function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / 60000))}m left`;
  const hrs = Math.floor(diff / HOUR);
  if (hrs <= 48) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

export const money = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const distance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`);

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
        ? <img className="ava-img" src={cldAvatar(user.profile_image)} alt="" />
        : (user.username?.[0] || '?').toUpperCase()}
    </span>
  );
}

/* A collab reads as a lobby: the host's seat, then one seat per person
   they're looking for, filled as people are accepted. */
export function Seats({ host, needed, filled }) {
  const shown = Math.min(needed, 5);
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

export function Skills({ skills, limit = 3 }) {
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

export function MetaChips({ item }) {
  const left = timeLeft(item.expires_at);
  const urgent = !!left && new Date(item.expires_at) - Date.now() < 6 * HOUR;
  return (
    <>
      {left && <span className={`mk-chip ${urgent ? 'is-urgent' : ''}`}>{ICONS.clock}{left}</span>}
      {item.distance_km != null && <span className="mk-chip">{ICONS.pin}{distance(item.distance_km)}</span>}
    </>
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

export function GigCard({ item, isNew, saved, onSave, onOpen, style, interactive = true }) {
  const needed = item.people_needed || 1;
  const spotsLeft = Math.max(0, needed - (item.hired_count || 0));
  return (
    <article className={`mk-card is-gig ${isNew ? 'is-new' : ''}`} style={style}
      {...cardProps(interactive, onOpen, `Paid gig, ${money(item.payment_amount)}: ${item.title}`)}>
      <div className="mk-ticket">
        <div className="mk-payout">
          <span className="mk-eyebrow">Payout</span>
          <span className="mk-payout-val">
            {Number(item.payment_amount) > 0 ? money(item.payment_amount) : '₹ —'}
          </span>
        </div>
        <div className="mk-ticket-meta"><MetaChips item={item} /></div>
      </div>
      <div className="mk-perf" aria-hidden="true" />
      <div className="mk-body">
        <div className="mk-body-top">
          <span className="mk-kind is-gig">Paid gig</span>
          {isNew && <span className="mk-new">New</span>}
          {needed > 1 && <span className="mk-cap">Hiring {needed} · {spotsLeft} left</span>}
          {interactive && <SaveButton saved={saved} onClick={onSave} />}
        </div>
        <h3 className="mk-title">{item.description || item.title}</h3>
        <Skills skills={item.skills} />
        <div className="mk-foot">
          <span className="mk-poster">
            <Avatar user={item.user} />
            <span className="mk-poster-text">
              <span className="mk-poster-name">{item.user.username}</span>
              <span className="mk-poster-sub">
                {item.gender_preference && item.gender_preference !== 'any'
                  ? (item.gender_preference === 'male' ? 'Male applicants only' : 'Female applicants only')
                  : (item.user.category || 'Independent')}
              </span>
            </span>
          </span>
          <span className="mk-cta is-gig">Apply</span>
        </div>
      </div>
    </article>
  );
}

export function TeamCard({ item, isNew, saved, onSave, onOpen, style, interactive = true }) {
  const needed = item.people_needed || 1;
  const filled = item.hired_count || 0;
  const open = Math.max(0, needed - filled);
  const desc = item.description && item.description !== item.title ? item.description : null;
  return (
    <article className={`mk-card is-team ${isNew ? 'is-new' : ''}`} style={style}
      {...cardProps(interactive, onOpen, `Team forming, ${open} open: ${item.title}`)}>
      <div className="mk-lobby">
        <div className="mk-lobby-row">
          <Seats host={item.user} needed={needed} filled={filled} />
          <div className="mk-lobby-count">
            <span className="mk-lobby-open">{open}</span>
            <span className="mk-eyebrow">{open === 1 ? 'seat open' : 'seats open'}</span>
          </div>
        </div>
        <div className="mk-ticket-meta"><MetaChips item={item} /></div>
      </div>
      <div className="mk-body">
        <div className="mk-body-top">
          <span className="mk-kind is-team">Team forming</span>
          {isNew && <span className="mk-new">New</span>}
          {interactive && <SaveButton saved={saved} onClick={onSave} />}
        </div>
        <h3 className="mk-title">{item.title}</h3>
        {desc && <p className="mk-desc">{desc}</p>}
        <Skills skills={item.skills} />
        <div className="mk-foot">
          <span className="mk-poster">
            <Avatar user={item.user} />
            <span className="mk-poster-text">
              <span className="mk-poster-sub">Hosted by</span>
              <span className="mk-poster-name">{item.user.username}</span>
            </span>
          </span>
          <span className="mk-cta is-team">Apply</span>
        </div>
      </div>
    </article>
  );
}
