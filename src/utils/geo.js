/* One device position fix, resolved to null on refusal, failure or timeout
   rather than thrown — every caller treats "no fix" as a normal outcome and
   falls back to the location saved on the profile. */
export function locateDevice() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: +pos.coords.latitude.toFixed(5), lon: +pos.coords.longitude.toFixed(5) }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}

/* Whether the browser will hand over a fix without showing a prompt. The feed
   must never open on a permission dialog, so it only reads the device when the
   answer is already yes. */
export function geolocationAlreadyAllowed() {
  return new Promise(resolve => {
    let q = null;
    try { q = navigator.permissions?.query({ name: 'geolocation' }); } catch { q = null; }
    if (!q) { resolve(false); return; }
    q.then(s => resolve(s.state === 'granted')).catch(() => resolve(false));
  });
}

/* The place the feed is currently pointed at, remembered across visits the way
   a food-delivery app remembers it — reopening on a different city than you
   left is disorienting, and re-asking the device every load is worse. */
const PLACE_KEY = 'smPlace';

export function readStoredPlace() {
  try {
    const raw = localStorage.getItem(PLACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.lat === 'number' && typeof p?.lon === 'number' ? p : null;
  } catch { return null; }
}

export function storePlace(place) {
  try {
    if (place) localStorage.setItem(PLACE_KEY, JSON.stringify(place));
    else localStorage.removeItem(PLACE_KEY);
  } catch { /* private mode — the choice just won't survive the tab */ }
}
