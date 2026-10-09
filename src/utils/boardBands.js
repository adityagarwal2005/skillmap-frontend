import { parseTs } from '../components/ListingCard';

/* How the board is cut.

   A listing on DoitHere is perishable: it runs on a timer the poster set and
   disappears when that window closes. A sorted grid of identical cards hides
   that — it reads as a catalogue, which is what the board is not. So the feed
   is banded along one axis instead, and the axis is the thing you choose.

   Banding beats sorting here because the bands carry the judgement. "Closing
   within the hour" tells you to act now; the third row of a list sorted by
   soonest tells you nothing on its own. */

const MIN = 60000;
const HOUR = 3600000;

export const AXES = [
  { id: 'closing',  label: 'Closing',  hint: 'What disappears first' },
  { id: 'distance', label: 'Distance', hint: 'What you can get to' },
  { id: 'pay',      label: 'Pay',      hint: 'What it is worth' },
];

const endOfDay = (d) => {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e.getTime();
};

function closingBand(item, now) {
  const end = parseTs(item.expires_at);
  if (Number.isNaN(end)) return 'week';
  const left = end - now;
  if (left < HOUR) return 'hour';
  if (end <= endOfDay(now)) return 'today';
  if (end <= endOfDay(now + 24 * HOUR)) return 'tomorrow';
  return 'week';
}

function distanceBand(item) {
  const km = item.distance_km;
  if (km == null) return 'far';
  if (km <= 1) return 'walk';
  if (km <= 3) return 'ride';
  if (km <= 10) return 'town';
  return 'far';
}

function payBand(item) {
  const amount = Number(item.payment_amount) || 0;
  if (amount >= 5000) return 'top';
  if (amount >= 2000) return 'mid';
  if (amount > 0) return 'low';
  return 'none';
}

/* Band definitions in the order they appear. `note` is the second line — it
   says what the band means rather than repeating its name. */
const BANDS = {
  closing: [
    { id: 'hour',     title: 'Closing within the hour', note: 'Apply now or it is gone', hot: true },
    { id: 'today',    title: 'Later today',             note: 'Gone by midnight' },
    { id: 'tomorrow', title: 'Tomorrow' },
    { id: 'week',     title: 'Still open a while' },
  ],
  distance: [
    { id: 'walk', title: 'Walking distance', note: 'Under a kilometre' },
    { id: 'ride', title: 'A short ride',     note: '1–3 km' },
    { id: 'town', title: 'Across town',      note: '3–10 km' },
    { id: 'far',  title: 'Further out' },
  ],
  pay: [
    { id: 'top',  title: '₹5,000 and up' },
    { id: 'mid',  title: '₹2,000 to ₹5,000' },
    { id: 'low',  title: 'Under ₹2,000' },
    { id: 'none', title: 'Team-ups', note: 'Equity, credit or the experience' },
  ],
};

const BANDERS = { closing: closingBand, distance: distanceBand, pay: payBand };

/* Within a band, the same axis decides the order — so the first row of
   "Closing within the hour" really is the next thing to disappear. */
const WITHIN = {
  closing: (a, b) => parseTs(a.expires_at) - parseTs(b.expires_at),
  distance: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
  pay: (a, b) => (Number(b.payment_amount) || 0) - (Number(a.payment_amount) || 0),
};

/** Group listings into the bands of one axis. Empty bands are dropped. */
export function bandItems(items, axis, now) {
  const key = BANDERS[axis] ? axis : 'closing';
  const assign = BANDERS[key];
  const buckets = new Map();
  for (const item of items) {
    const id = assign(item, now);
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(item);
  }
  return BANDS[key]
    .filter(b => buckets.has(b.id))
    .map(b => ({ ...b, items: buckets.get(b.id).sort(WITHIN[key]) }));
}

/** Minutes left, for the row's own urgency treatment. */
export const minutesLeft = (item, now) => (parseTs(item.expires_at) - now) / MIN;
