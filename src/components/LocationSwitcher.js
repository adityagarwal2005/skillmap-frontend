import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';
import { getSavedAddresses, saveAddress, deleteSavedAddress, geocodeSearch } from '../api/users';
import { locateDevice } from '../utils/geo';
import './LocationSwitcher.css';

const ic = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const PIN      = ic(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>);
const CROSSHAIR = ic(<><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>);
const SEARCH   = ic(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
const X        = ic(<path d="M18 6 6 18M6 6l12 12" />);
const PLUS     = ic(<path d="M12 5v14M5 12h14" />);
const CHEVRON  = ic(<path d="m6 9 6 6 6-6" />);

/* Where the feed is pointed.

   DoitHere ranks every listing against one pair of coordinates, and until now
   that pair was always the device's current fix. That is wrong for the normal
   case rather than an edge case: you are at work and want to line up a shoot
   near your flat, or you have come home for a week and the board is still
   showing the city you study in. So this is the control a food-delivery app
   puts in the same corner — current location, a few saved places, and a search
   for anywhere else — because people already know how it works.

   `place` is null until a location is known. Callers own the value; this only
   offers the ways of changing it. */
export default function LocationSwitcher({ place, onPick }) {
  const { showToast } = useToast();

  const [open, setOpen]       = useState(false);
  const [saved, setSaved]     = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // The place being named before it is saved, as {label, address, lat, lon}.
  const [naming, setNaming]   = useState(null);
  const [name, setName]       = useState('');
  const [busy, setBusy]       = useState(false);

  const wrapRef  = useRef(null);
  const panelRef = useRef(null);
  const nameRef  = useRef(null);
  // Where to draw the panel. It is rendered into <body> rather than next to
  // the pill because the feed toolbar carries a backdrop-filter, and a filter
  // makes its element the containing block for any position:fixed descendant
  // — so a sheet nested inside it would be positioned against the toolbar and
  // hang off the side of a phone screen.
  const [anchor, setAnchor] = useState(null);

  const close = useCallback(() => {
    setOpen(false);
    setNaming(null);
    setQuery('');
    setResults([]);
  }, []);

  // Saved places are only worth a request once the sheet is actually opened.
  useEffect(() => {
    if (!open || loaded) return;
    getSavedAddresses()
      .then(r => setSaved(r.data.addresses || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 8, left: r.left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      // The panel is portalled out of the wrapper, so it needs its own check
      // or every click inside it would count as a click outside.
      if (panelRef.current?.contains(e.target)) return;
      close();
    };
    const onKey  = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => { if (naming) nameRef.current?.focus(); }, [naming]);

  // Typed addresses are looked up a beat after typing stops — the geocoder is
  // a shared public service, so one request per keystroke would be abuse.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); setSearching(false); setUnavailable(false); return; }
    setSearching(true);
    let alive = true;
    const t = setTimeout(() => {
      geocodeSearch(q)
        .then(r => {
          if (!alive) return;
          setResults(r.data.results || []);
          setUnavailable(!!r.data.unavailable);
        })
        .catch(() => { if (alive) { setResults([]); setUnavailable(true); } })
        .finally(() => { if (alive) setSearching(false); });
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const pick = (next) => { onPick(next); close(); };

  const useDevice = async () => {
    setLocating(true);
    const fix = await locateDevice();
    setLocating(false);
    if (!fix) {
      showToast('Location is blocked. Allow it for this site in your browser settings.', 'error');
      return;
    }
    pick({ kind: 'device', label: 'Current location', lat: fix.lat, lon: fix.lon });
  };

  const startNaming = async (seed) => {
    if (seed) { setNaming(seed); setName(seed.label || ''); return; }
    // Naming the spot you are standing in needs a fix first.
    setLocating(true);
    const fix = await locateDevice();
    setLocating(false);
    if (!fix) {
      showToast("Couldn't read your location, so there's nothing to save yet.", 'error');
      return;
    }
    setNaming({ label: '', address: '', lat: fix.lat, lon: fix.lon });
    setName('');
  };

  const commitSave = async (e) => {
    e.preventDefault();
    const label = name.trim();
    if (!label) return;
    setBusy(true);
    try {
      const r = await saveAddress({
        label,
        address: naming.address || '',
        latitude: naming.lat,
        longitude: naming.lon,
      });
      const a = r.data.address;
      setSaved(prev => [a, ...prev.filter(p => p.id !== a.id)]);
      showToast(`Saved as ${a.label}`, 'success');
      pick({ kind: 'saved', id: a.id, label: a.label, address: a.address, lat: a.latitude, lon: a.longitude });
    } catch (err) {
      showToast(err.response?.data?.error || "Couldn't save that place", 'error');
    } finally { setBusy(false); }
  };

  const remove = async (a) => {
    try {
      await deleteSavedAddress(a.id);
      setSaved(prev => prev.filter(p => p.id !== a.id));
      // Removing the place you are currently browsing from shouldn't move the
      // feed — you deleted a shortcut, not a location. It just stops being one
      // of the saved entries, so the highlight and the × go away.
      if (place?.kind === 'saved' && place.id === a.id) {
        onPick({ kind: 'search', label: a.label, address: a.address, lat: a.latitude, lon: a.longitude });
      }
    } catch { showToast("Couldn't remove that place", 'error'); }
  };

  const label = place?.label || 'Set your location';

  return (
    <div className="loc" ref={wrapRef}>
      <button type="button" className={`loc-pill ${open ? 'is-open' : ''}`}
        aria-expanded={open} aria-haspopup="dialog"
        onClick={() => (open ? close() : setOpen(true))}>
        <span className="loc-pill-ic">{PIN}</span>
        <span className="loc-pill-text">
          <span className="loc-pill-eyebrow">Work near</span>
          <span className="loc-pill-label">{label}</span>
        </span>
        <span className="loc-pill-chev">{CHEVRON}</span>
      </button>

      {open && anchor && createPortal(
        <>
        <div className="loc-scrim" onClick={close} aria-hidden="true" />
        <div className="loc-panel" role="dialog" aria-label="Choose a location" ref={panelRef}
          style={{ top: anchor.top, left: anchor.left }}>
          <span className="loc-grab" aria-hidden="true" />
          <label className="loc-search">
            <span className="loc-search-ic">{SEARCH}</span>
            <input className="loc-search-input" type="text" autoComplete="off"
              placeholder="Search a city, sector or area"
              value={query} onChange={e => setQuery(e.target.value)} />
            {query && (
              <button type="button" className="loc-search-clear" aria-label="Clear"
                onClick={() => setQuery('')}>{X}</button>
            )}
          </label>

          {query.trim().length >= 3 && (
            <div className="loc-group">
              {searching && <p className="loc-note">Looking…</p>}
              {!searching && unavailable && (
                <p className="loc-note">Address search is unavailable right now. Current location and your saved places still work.</p>
              )}
              {!searching && !unavailable && results.length === 0 && (
                <p className="loc-note">Nothing found for “{query.trim()}”.</p>
              )}
              {results.map((r, i) => (
                <div className="loc-row" key={`${r.latitude}-${r.longitude}-${i}`}>
                  <button type="button" className="loc-row-main"
                    onClick={() => pick({ kind: 'search', label: r.label, address: r.address, lat: r.latitude, lon: r.longitude })}>
                    <span className="loc-row-ic">{PIN}</span>
                    <span className="loc-row-text">
                      <span className="loc-row-label">{r.label}</span>
                      <span className="loc-row-sub">{r.address}</span>
                    </span>
                  </button>
                  <button type="button" className="loc-row-side" aria-label={`Save ${r.label}`}
                    onClick={() => startNaming({ label: r.label, address: r.address, lat: r.latitude, lon: r.longitude })}>
                    {PLUS}
                  </button>
                </div>
              ))}
            </div>
          )}

          {naming && (
            <form className="loc-naming" onSubmit={commitSave}>
              <span className="loc-naming-q">Call it what?</span>
              <div className="loc-naming-row">
                <input ref={nameRef} className="loc-naming-input" type="text" maxLength={40}
                  placeholder="Home, PG, office…" value={name}
                  onChange={e => setName(e.target.value)} />
                <button type="submit" className="loc-naming-save" disabled={busy || !name.trim()}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="loc-naming-cancel" onClick={() => setNaming(null)}>
                  Cancel
                </button>
              </div>
              {naming.address && <span className="loc-naming-sub">{naming.address}</span>}
            </form>
          )}

          <div className="loc-group">
            <button type="button" className="loc-row-main is-wide" onClick={useDevice} disabled={locating}>
              <span className="loc-row-ic is-live">{CROSSHAIR}</span>
              <span className="loc-row-text">
                <span className="loc-row-label">{locating ? 'Finding you…' : 'Use my current location'}</span>
                <span className="loc-row-sub">Reads the device, once</span>
              </span>
            </button>
          </div>

          <div className="loc-group">
            <div className="loc-group-head">
              <span className="loc-group-title">Saved places</span>
              <button type="button" className="loc-group-add" onClick={() => startNaming(null)} disabled={locating}>
                Save where I am
              </button>
            </div>
            {!loaded && <p className="loc-note">Loading…</p>}
            {loaded && saved.length === 0 && (
              <p className="loc-note">None yet. Search a place and tap ＋, or save where you are — then you can switch between them in one tap.</p>
            )}
            {saved.map(a => (
              <div className={`loc-row ${place?.kind === 'saved' && place.id === a.id ? 'is-on' : ''}`} key={a.id}>
                <button type="button" className="loc-row-main"
                  onClick={() => pick({ kind: 'saved', id: a.id, label: a.label, address: a.address, lat: a.latitude, lon: a.longitude })}>
                  <span className="loc-row-ic">{PIN}</span>
                  <span className="loc-row-text">
                    <span className="loc-row-label">{a.label}</span>
                    {a.address && <span className="loc-row-sub">{a.address}</span>}
                  </span>
                </button>
                <button type="button" className="loc-row-side is-danger" aria-label={`Remove ${a.label}`}
                  onClick={() => remove(a)}>{X}</button>
              </div>
            ))}
          </div>
        </div>
        </>,
        document.body,
      )}
    </div>
  );
}
