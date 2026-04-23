import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCategories, addSkill, editUser } from '../api/users';
import { updateStatus } from '../api/users';
import './OnboardingPage.css';

const STEPS = ['Category', 'Skills', 'Status', 'Location'];

export default function OnboardingPage() {
  const { user, loginUser } = useAuth();
  const { showToast }       = useToast();
  const navigate            = useNavigate();

  const [step, setStep]             = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills]         = useState([]);
  const [status, setStatus]         = useState('not_available');
  const [location, setLocation]     = useState({ lat: '', lon: '' });
  const [saving, setSaving]         = useState(false);
  const [gettingLoc, setGettingLoc] = useState(false);

  useEffect(() => {
    getCategories()
      .then(r => setCategories(r.data.categories || []))
      .catch(() => {});
  }, []);

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
    if (step === 0) return true;
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return true;
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
          <div className="onboard-icon">S</div>
          <span className="onboard-brand">SkillMap</span>
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
              <div className="category-grid">
                {categories.map(c => (
                  <button key={c.id}
                    className={`category-card ${selectedCat?.id === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCat(c)}>
                    <span className="category-name">{c.name}</span>
                  </button>
                ))}
              </div>
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
              <h2 className="onboard-title">Set your availability</h2>
              <p className="onboard-sub">Let people know if you're open to work</p>
              <div className="status-options">
                {[
                  { value: 'not_available', label: 'Not Available', desc: 'Not looking for work right now' },
                  { value: 'open_to_freelance', label: 'Open to Freelance', desc: 'Looking for paid freelance projects' },
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

          {step === 3 && (
            <>
              <h2 className="onboard-title">Share your location</h2>
              <p className="onboard-sub">This helps people near you find you — only city-level precision is shown</p>
              <div className="location-box">
                {location.lat ? (
                  <div className="location-captured">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Location captured</div>
                      <div className="location-coords">{parseFloat(location.lat).toFixed(4)}, {parseFloat(location.lon).toFixed(4)}</div>
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
          <button className="onboard-skip" onClick={() => {
            if (step < STEPS.length - 1) setStep(s => s + 1);
            else navigate('/');
          }}>
            Skip
          </button>
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