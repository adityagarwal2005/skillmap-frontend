import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCategories, addSkill, editUser, sendPhoneOTP, verifyPhoneOTP, updateStatus } from '../api/users';
import Logo from '../components/Logo';
import { SKILL_CATEGORIES, categoryByBackendName } from '../utils/skillCategories';
import './OnboardingPage.css';

const STEPS = ['You', 'Skills', 'Verify', 'Availability', 'Location'];

const STATUS_OPTIONS = [
  { value: 'open_to_freelance', label: 'Taking gigs',      desc: 'Show me paid work nearby and let people hire me', tone: 'gig' },
  { value: 'open_to_work',      label: 'Open to work',     desc: 'Looking for part-time or full-time roles',      tone: 'work' },
  { value: 'not_available',     label: 'Just hiring',      desc: "I'm here to post gigs and find people",          tone: 'off' },
];

// Until a category is picked, suggest a spread from the busiest ones.
const STARTER_SKILLS = SKILL_CATEGORIES.slice(0, 4).flatMap(c => c.skills.slice(0, 3));

const sameSkill = (a, b) => a.toLowerCase() === b.toLowerCase();

export default function OnboardingPage() {
  const { user }      = useAuth();
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const [step, setStep]             = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills]         = useState([]);
  const [phone, setPhone]           = useState('');
  const [phoneOtp, setPhoneOtp]     = useState('');
  const [phoneSent, setPhoneSent]   = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [status, setStatus]         = useState(null);   // only saved if picked
  const [location, setLocation]     = useState({ lat: '', lon: '' });
  const [saving, setSaving]         = useState(false);
  const [gettingLoc, setGettingLoc] = useState(false);

  const loadCategories = () => {
    setCategoriesFailed(false);
    getCategories()
      .then(r => setCategories(r.data.categories || []))
      .catch(() => setCategoriesFailed(true));
  };

  useEffect(() => { loadCategories(); }, []);

  const selectedMeta = selectedCat ? categoryByBackendName(selectedCat.name) : null;
  const suggestions  = selectedMeta?.skills || STARTER_SKILLS;
  const hasSkill     = (s) => skills.some(x => sameSkill(x, s));

  const toggleSkill = (s) => setSkills(prev => (
    prev.some(x => sameSkill(x, s)) ? prev.filter(x => !sameSkill(x, s)) : [...prev, s]
  ));

  const addTypedSkill = () => {
    const s = skillInput.trim();
    if (s && !hasSkill(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const getLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGettingLoc(false);
      },
      () => { showToast('Could not get location', 'error'); setGettingLoc(false); }
    );
  };

  const handleSendPhoneOtp = async () => {
    if (!phone.trim()) { showToast('Enter your phone number', 'error'); return; }
    try {
      setSendingOtp(true);
      await sendPhoneOTP(phone.trim());
      setPhoneSent(true);
      showToast('Code sent on WhatsApp!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send code', 'error');
    } finally { setSendingOtp(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) { showToast('Enter the code', 'error'); return; }
    try {
      setVerifyingOtp(true);
      await verifyPhoneOTP(phone.trim(), phoneOtp.trim());
      setPhoneVerified(true);
      showToast('Phone verified!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Invalid code', 'error');
    } finally { setVerifyingOtp(false); }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      const payload = {};
      if (selectedCat) payload.category_id = selectedCat.id;
      if (location.lat) { payload.latitude = location.lat; payload.longitude = location.lon; }
      if (Object.keys(payload).length > 0) await editUser(user.id, payload);
      if (status) await updateStatus(status);
      for (const skill of skills) {
        try { await addSkill(user.id, skill); } catch {}
      }
      showToast("You're in. Here's what's near you.", 'success');
      navigate('/');
    } catch {
      showToast('Something went wrong', 'error');
    } finally { setSaving(false); }
  };

  const canNext = () => {
    // Don't trap the user on a backend hiccup — only enforce a pick when
    // categories actually loaded.
    if (step === 0) return !!selectedCat || categoriesFailed;
    if (step === 1) return skills.length > 0;
    // Verify, availability and location are optional. A verified contact is
    // still required before posting or accepting work (require_contact() on
    // the backend), so verification is deferred, not dropped.
    return true;
  };

  // Skipping the last step still has to save the category and skills
  // picked earlier — it used to navigate away and drop them.
  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="ob-page">
      <div className="ob-card">
        <div className="ob-top">
          <Logo size={2} />
          <span className="ob-count">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
        </div>

        <div className="ob-progress" role="progressbar" aria-label="Profile setup"
          aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((s, i) => (
            <span key={s} className={`ob-seg ${i < step ? 'is-done' : ''} ${i === step ? 'is-on' : ''}`} />
          ))}
        </div>

        <div className="ob-content" key={step}>
          {step === 0 && (
            <>
              <span className="ob-eyebrow">Set up your profile</span>
              <h1 className="ob-title">What do you do best?</h1>
              <p className="ob-sub">Pick the closest fit. It decides which gigs and people you see first, and you can change it later.</p>
              {categoriesFailed ? (
                <div className="ob-note">
                  <span>Couldn't load categories. Skip for now and set it later in Settings.</span>
                  <button type="button" className="ob-ghost" onClick={loadCategories}>Try again</button>
                </div>
              ) : (
                <div className="ob-cats">
                  {categories.length === 0
                    ? Array.from({ length: 9 }, (_, i) => <span key={i} className="ob-cat is-loading" />)
                    : categories.map(c => {
                        const meta = categoryByBackendName(c.name);
                        const on = selectedCat?.id === c.id;
                        return (
                          <button key={c.id} type="button" aria-pressed={on} title={c.name}
                            className={`ob-cat ${on ? 'is-on' : ''}`}
                            style={meta ? { '--hue': meta.hue } : undefined}
                            onClick={() => setSelectedCat(c)}>
                            <span className="ob-cat-icon">{meta?.icon || c.name[0]}</span>
                            <span className="ob-cat-name">{meta?.label || c.name}</span>
                          </button>
                        );
                      })}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <span className="ob-eyebrow">{selectedMeta?.label || 'Your skills'}</span>
              <h1 className="ob-title">What can people hire you for?</h1>
              <p className="ob-sub">Tap the ones you're good at, or type your own. Gigs that need them will find you.</p>
              <div className="ob-row">
                <input className="ob-input" placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTypedSkill(); } }} />
                <button type="button" className="ob-ghost" onClick={addTypedSkill} disabled={!skillInput.trim()}>Add</button>
              </div>
              <div className="ob-chips">
                {/* Typed skills lead; suggestions hold their place when tapped. */}
                {[...skills.filter(s => !suggestions.some(x => sameSkill(x, s))), ...suggestions].map(s => (
                  <button key={s} type="button" aria-pressed={hasSkill(s)}
                    className={`ob-chip ${hasSkill(s) ? 'is-on' : ''}`}
                    onClick={() => toggleSkill(s)}>
                    {hasSkill(s) ? '✓' : '+'} {s}
                  </button>
                ))}
              </div>
              <p className="ob-meta">
                {skills.length === 0 ? 'Add at least one to continue'
                  : `${skills.length} ${skills.length === 1 ? 'skill' : 'skills'} added`}
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <span className="ob-eyebrow">Optional</span>
              <h1 className="ob-title">Verify your number</h1>
              <p className="ob-sub">
                A WhatsApp code shows people they're dealing with someone real. You can skip it now, but you'll need it before posting or taking on work.
              </p>
              {phoneVerified ? (
                <div className="ob-done">
                  <span className="ob-done-mark" aria-hidden="true">✓</span>
                  <div>
                    <div className="ob-done-title">Number verified</div>
                    <div className="ob-done-sub">{phone}</div>
                  </div>
                </div>
              ) : !phoneSent ? (
                <div className="ob-row">
                  <input className="ob-input" type="tel" inputMode="tel" autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendPhoneOtp(); } }} />
                  <button type="button" className="ob-primary is-inline" onClick={handleSendPhoneOtp} disabled={sendingOtp}>
                    {sendingOtp ? 'Sending…' : 'Send code'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="ob-row">
                    <input className="ob-input is-otp" inputMode="numeric" autoComplete="one-time-code"
                      placeholder="000000" maxLength={6}
                      value={phoneOtp}
                      onChange={e => setPhoneOtp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyPhoneOtp(); } }} />
                    <button type="button" className="ob-primary is-inline" onClick={handleVerifyPhoneOtp} disabled={verifyingOtp}>
                      {verifyingOtp ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                  <p className="ob-meta">
                    Sent to {phone}.{' '}
                    <button type="button" className="ob-link" onClick={() => { setPhoneSent(false); setPhoneOtp(''); }}>
                      Change number
                    </button>
                  </p>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <span className="ob-eyebrow">Availability</span>
              <h1 className="ob-title">Are you taking work?</h1>
              <p className="ob-sub">This shows on your profile. Change it any time from Settings.</p>
              <div className="ob-options" role="radiogroup" aria-label="Availability">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" role="radio" aria-checked={status === opt.value}
                    className={`ob-option is-${opt.tone} ${status === opt.value ? 'is-on' : ''}`}
                    onClick={() => setStatus(opt.value)}>
                    <span className="ob-option-dot" aria-hidden="true" />
                    <span className="ob-option-text">
                      <span className="ob-option-label">{opt.label}</span>
                      <span className="ob-option-desc">{opt.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <span className="ob-eyebrow">Last step</span>
              <h1 className="ob-title">Where are you?</h1>
              <p className="ob-sub">Gigs and collabs are matched by distance, so this is what makes your feed local. Other people see how far away you are, never where.</p>
              {location.lat ? (
                <div className="ob-done">
                  <span className="ob-done-mark" aria-hidden="true">✓</span>
                  <div>
                    <div className="ob-done-title">Location set</div>
                    <div className="ob-done-sub">Your feed will show what's closest first</div>
                  </div>
                </div>
              ) : (
                <button type="button" className="ob-locate" onClick={getLocation} disabled={gettingLoc}>
                  <span className="ob-locate-pulse" aria-hidden="true" />
                  {gettingLoc ? 'Finding you…' : 'Use my location'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="ob-actions">
          {step > 0
            ? <button type="button" className="ob-ghost" onClick={() => setStep(s => s - 1)}>Back</button>
            : <span />}
          <div className="ob-actions-right">
            {step >= 2 && (
              <button type="button" className="ob-link" onClick={handleNext} disabled={saving}>
                {isLast ? 'Skip and finish' : 'Skip'}
              </button>
            )}
            <button type="button" className="ob-primary" onClick={handleNext} disabled={saving || !canNext()}>
              {saving ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
