import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCategories, addSkill, editUser, sendPhoneOTP, verifyPhoneOTP } from '../api/users';
import { updateStatus } from '../api/users';
import Logo from '../components/Logo';
import './OnboardingPage.css';

const STEPS = ['Category', 'Skills', 'Verify', 'Status', 'Location'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const { showToast }       = useToast();
  const navigate            = useNavigate();

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
  const [status, setStatus]         = useState('not_available');
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

  const addLocalSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const removeLocalSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const getLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGettingLoc(false);
        showToast('Location captured!', 'success');
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
      if (status !== 'not_available') await updateStatus(status);
      for (const skill of skills) {
        try { await addSkill(user.id, skill); } catch {}
      }
      showToast('Profile set up!', 'success');
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
    // Connect an account — optional at onboarding (most new users don't have
    // a LinkedIn/GitHub handy yet). Still required before posting/accepting
    // work (require_contact() on the backend), so it's just deferred, not
    // dropped — Settings and this page both let you add one any time. A
    // Google sign-in also counts, so anyone who used it here already has it.
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  return (
    <div className="onboard-page">
      <div className="onboard-card">

        {/* Wordmark */}
        <div className="onboard-wordmark">
          <Logo size={2.4} className="onboard-logo" />
        </div>

        {/* Progress */}
        <div className="onboard-progress">
          {STEPS.map((s, i) => (
            <div key={s} className={`onboard-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="onboard-step-dot">{i < step ? '✓' : i + 1}</div>
              <span className="onboard-step-label">{s}</span>
            </div>
          ))}
        </div>

        <div className="onboard-bar">
          <div className="onboard-bar-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Step Content */}
        <div className="onboard-content">

          {step === 0 && (
            <>
              <h2 className="onboard-title">What best describes you?</h2>
              <p className="onboard-sub">Pick your primary category — you can change this later</p>
              {categoriesFailed ? (
                <div className="no-skills" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
                  <span>Couldn't load categories — you can skip this for now and set it later in Settings.</span>
                  <button type="button" className="create-cancel" onClick={loadCategories}>Try again</button>
                </div>
              ) : (
                <div className="category-grid">
                  {categories.map(c => (
                    <button key={c.id}
                      className={`category-card ${selectedCat?.id === c.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCat(c)}>
                      <span className="category-name">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="onboard-title">Add your skills</h2>
              <p className="onboard-sub">What can you do? Add as many as you like</p>
              <div className="skill-input-row">
                <input className="create-input" style={{ flex: 1 }}
                  placeholder="e.g. React, Figma, Python"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocalSkill(); } }} />
                <button type="button" className="create-submit" onClick={addLocalSkill}>Add</button>
              </div>
              <div className="skills-list" style={{ marginTop: '14px' }}>
                {skills.map(s => (
                  <span key={s} className="skill-tag">
                    {s}
                    <button className="skill-remove" onClick={() => removeLocalSkill(s)}>×</button>
                  </span>
                ))}
                {skills.length === 0 && <span className="no-skills">No skills added yet</span>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="onboard-title">Verify your phone <span style={{fontWeight:400,color:'var(--text-3)',fontSize:'0.7em'}}>(optional)</span></h2>
              <p className="onboard-sub">
                We'll send a code on WhatsApp so people can trust who they're dealing with. You can skip this — you'll just need it before posting or accepting work.
              </p>

              {phoneVerified ? (
                <div className="location-captured">
                  <span className="location-icon">✅</span>
                  <div>
                    <div className="location-label">Phone verified</div>
                    <div className="location-coords">{phone}</div>
                  </div>
                </div>
              ) : !phoneSent ? (
                <div className="skill-input-row">
                  <input className="create-input" style={{ flex: 1 }} type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendPhoneOtp(); } }} />
                  <button type="button" className="create-submit" onClick={handleSendPhoneOtp} disabled={sendingOtp}>
                    {sendingOtp ? 'Sending…' : 'Send code'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="skill-input-row">
                    <input className="create-input otp-input" style={{ flex: 1 }}
                      placeholder="000000" maxLength={6}
                      value={phoneOtp}
                      onChange={e => setPhoneOtp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyPhoneOtp(); } }} />
                    <button type="button" className="create-submit" onClick={handleVerifyPhoneOtp} disabled={verifyingOtp}>
                      {verifyingOtp ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                  <p className="otp-resend">
                    Didn't get it?{' '}
                    <span onClick={() => { setPhoneSent(false); setPhoneOtp(''); }}>Go back</span>
                  </p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="onboard-title">Set your availability</h2>
              <p className="onboard-sub">Let people know if you're open to work</p>
              <div className="status-options">
                {[
                  { value: 'not_available', label: 'Not Available', desc: 'Not looking for work right now' },
                  { value: 'open_to_freelance', label: 'Open to gigs', desc: 'Looking for paid gig work' },
                  { value: 'open_to_work', label: 'Open to Work', desc: 'Looking for full-time or part-time work' },
                ].map(opt => (
                  <button key={opt.value}
                    className={`status-option ${status === opt.value ? 'selected' : ''}`}
                    onClick={() => setStatus(opt.value)}>
                    <span className="status-option-label">{opt.label}</span>
                    <span className="status-option-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="onboard-title">Share your location</h2>
              <p className="onboard-sub">Powers radius filtering on freelance/collab posts — only city-level precision is shown. People search doesn't use this.</p>
              <div className="location-box">
                {location.lat ? (
                  <div className="location-captured">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Location captured</div>
                      <div className="location-coords">You're all set — only your city-level area is used</div>
                    </div>
                  </div>
                ) : (
                  <button className="location-btn" onClick={getLocation} disabled={gettingLoc}>
                    {gettingLoc ? 'Getting location...' : '📍 Share my location'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="onboard-actions">
          {/* Category and Skills are required — Connect, Status, and Location can be skipped */}
          {step >= 2 ? (
            <button className="onboard-skip" onClick={() => {
              if (step < STEPS.length - 1) setStep(s => s + 1);
              else navigate('/');
            }}>
              Skip
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 0 && (
              <button className="create-cancel" onClick={() => setStep(s => s - 1)}>Back</button>
            )}
            <button className="create-submit" onClick={handleNext}
              disabled={saving || !canNext()}>
              {saving ? 'Saving...' : step === STEPS.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}