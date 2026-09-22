import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  login, sendOTP, verifyAndRegister, sendLoginOTP, verifyLoginOTP, resetPasswordWithOTP, googleLogin,
} from '../api/auth';
import Logo from '../components/Logo';
import './LoginPage.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const ic = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const IC = {
  wallet: ic(<><rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M2.5 10.5h19M16 15h2" /></>),
  team:   ic(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2a4.8 4.8 0 0 1 5 4.8" /></>),
  pin:    ic(<><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>),
  eye:    ic(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: ic(<><path d="M3 3l18 18" /><path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.4 4.2" /><path d="M6.6 6.7C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
};

// What people get for signing up, next to the form rather than left behind
// on the landing page.
const POINTS = [
  { icon: IC.wallet, title: 'Paid gigs, budget up front',
    text: 'Every listing shows what it pays before you apply.' },
  { icon: IC.team, title: 'Collabs and teams',
    text: 'Find people to build with, up to five per post.' },
  { icon: IC.pin, title: 'Genuinely nearby',
    text: 'Sorted by distance from you, 500 m to 10 km.' },
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  // Land straight in the sign-up form when arriving via an invite link
  // (/join/:username -> /login?mode=register).
  const [mode, setMode]         = useState(searchParams.get('mode') === 'register' ? 'register' : 'login'); // 'login' | 'otp' | 'register' | 'forgot'
  const [step, setStep]         = useState(1);       // used by 'otp', 'register' and 'forgot'
  const [form, setForm]         = useState({ identifier: '', email: '', password: '', otp: '', newPassword: '' });
  const [location, setLocation] = useState({ lat: '', lon: '' });
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const { loginUser }           = useAuth();
  const googleBtnRef            = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      });
    }
  }, []);

  const handleGoogleCredential = async (response) => {
    setError('');
    setLoading(true);
    try {
      const referredBy = localStorage.getItem('smReferredBy') || '';
      const res = await googleLogin(response.credential, location.lat, location.lon, referredBy);
      localStorage.removeItem('smReferredBy');
      signIn(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Renders Google's own button into our div once the GIS script (loaded in
  // index.html) is ready. Skipped entirely if no client ID is configured —
  // this keeps the button silently absent on any environment that hasn't
  // set REACT_APP_GOOGLE_CLIENT_ID yet, instead of throwing.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode === 'forgot') return undefined;
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { setTimeout(tryInit, 200); return; }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 320,
          text: mode === 'register' ? 'signup_with' : 'signin_with',
        });
      }
    };
    tryInit();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, location.lat]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = m => {
    setMode(m);
    setStep(1);
    setError('');
    setSuccess('');
    setShowPw(false);
    setForm(f => ({ ...f, otp: '', password: '', newPassword: '' }));
  };

  const signIn = (res) => {
    const { access, refresh, user_id } = res.data;
    loginUser(
      {
        id: user_id,
        username: res.data.username || form.identifier || form.email,
        // Only set on a brand-new Google sign-in — the account got an
        // auto-generated username from the email and hasn't picked a real
        // one yet. App.js redirects here until they do.
        needsUsername: !!res.data.is_new_user,
      },
      access, refresh,
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        signIn(await login(form.identifier, form.password));

      } else if (mode === 'otp') {
        if (step === 1) {
          await sendLoginOTP(form.email);
          setSuccess(`Login code sent to ${form.email}`);
          setStep(2);
        } else {
          signIn(await verifyLoginOTP(form.email, form.otp));
        }

      } else if (mode === 'forgot') {
        if (step === 1) {
          await sendLoginOTP(form.email);
          setSuccess(`Reset code sent to ${form.email}`);
          setStep(2);
        } else {
          signIn(await resetPasswordWithOTP(form.email, form.otp, form.newPassword));
        }

      } else { // register
        if (step === 1) {
          await sendOTP(form.identifier, form.email);
          setSuccess(`Verification code sent to ${form.email}`);
          setStep(2);
        } else {
          const referredBy = localStorage.getItem('smReferredBy') || '';
          signIn(await verifyAndRegister(
            form.identifier, form.email, form.password, form.otp,
            location.lat, location.lon, referredBy,
          ));
          localStorage.removeItem('smReferredBy');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === 'login' ? 'Welcome back'
    : mode === 'otp' ? (step === 1 ? 'Sign in with a code' : 'Enter your code')
    : mode === 'forgot' ? (step === 1 ? 'Reset your password' : 'Choose a new password')
    : (step === 1 ? 'Create your account' : 'Verify your email');

  const sub =
    mode === 'login' ? 'Your feed, your chats and your applications are waiting.'
    : mode === 'otp' ? (step === 1 ? "We'll email you a one-time code — no password needed." : `We sent a 6-digit code to ${form.email}`)
    : mode === 'forgot' ? (step === 1 ? "We'll email you a code to set a new password." : `We sent a 6-digit code to ${form.email}`)
    : (step === 1 ? 'Takes a minute. Free, and no card needed.' : `We sent a 6-digit code to ${form.email}`);

  const submitLabel =
    loading ? 'Please wait…'
    : mode === 'login' ? 'Sign in'
    : mode === 'otp' ? (step === 1 ? 'Email me a code' : 'Verify & sign in')
    : mode === 'forgot' ? (step === 1 ? 'Send reset code' : 'Reset password')
    : (step === 1 ? 'Send verification code' : 'Create account');

  const showTabs = step === 1 && (mode === 'login' || mode === 'register');
  const pwType = showPw ? 'text' : 'password';

  const PwToggle = (
    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)}
      aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>
      {showPw ? IC.eyeOff : IC.eye}
    </button>
  );

  return (
    <div className="auth-page">
      {/* The pitch, kept beside the form instead of left behind on the
          landing page. Folds away on phones, where the form is the job. */}
      <aside className="auth-aside">
        <Link to="/" className="auth-aside-brand" aria-label="DoitHere home">
          <Logo size={1.9} />
        </Link>
        <h2 className="auth-aside-title">Work near you,<br />from people near you.</h2>
        <ul className="auth-points">
          {POINTS.map(p => (
            <li key={p.title}>
              <span className="auth-point-ic">{p.icon}</span>
              <span className="auth-point-text">
                <strong>{p.title}</strong>
                <span>{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="auth-sample" aria-hidden="true">
          <div className="auth-sample-top">
            <span className="auth-sample-pay">₹800</span>
            <span className="auth-sample-meta">3h left · 450 m</span>
          </div>
          <p className="auth-sample-title">Poster for our fest — need it by Friday</p>
          <div className="auth-sample-foot">
            <span className="auth-sample-who">riya_s</span>
            <span className="auth-sample-cta">Apply</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-card-brand" aria-label="DoitHere home">
            <Logo size={1.7} />
          </Link>

          {showTabs && (
            <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
              <button type="button" role="tab" aria-selected={mode === 'login'}
                className={`auth-tab ${mode === 'login' ? 'is-on' : ''}`}
                onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'}
                className={`auth-tab ${mode === 'register' ? 'is-on' : ''}`}
                onClick={() => switchMode('register')}>Create account</button>
            </div>
          )}

          <h1 className="auth-heading">{heading}</h1>
          <p className="auth-sub">{sub}</p>

          {error   && <div className="auth-msg is-error" role="alert">{error}</div>}
          {success && <div className="auth-msg is-ok" role="status">{success}</div>}

          {GOOGLE_CLIENT_ID && (mode === 'login' || (mode === 'register' && step === 1)) && (
            <>
              <div ref={googleBtnRef} className="auth-google" />
              <div className="auth-divider"><span>or with email</span></div>
            </>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'login' && (
              <>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-id">Username or email</label>
                  <input id="auth-id" name="identifier" type="text" className="auth-input"
                    placeholder="yourname or you@email.com" autoComplete="username"
                    value={form.identifier} onChange={handleChange} required />
                </div>
                <div className="auth-field">
                  <span className="auth-label-row">
                    <label className="auth-label" htmlFor="auth-pw">Password</label>
                    <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>
                      Forgot password?
                    </button>
                  </span>
                  <span className="auth-input-wrap">
                    <input id="auth-pw" name="password" type={pwType} className="auth-input"
                      placeholder="Your password" autoComplete="current-password"
                      value={form.password} onChange={handleChange} required />
                    {PwToggle}
                  </span>
                </div>
              </>
            )}

            {(mode === 'otp' || mode === 'forgot') && step === 1 && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">Email</label>
                <input id="auth-email" name="email" type="email" className="auth-input"
                  placeholder="you@email.com" autoComplete="email" autoFocus
                  value={form.email} onChange={handleChange} required />
              </div>
            )}

            {mode === 'register' && step === 1 && (
              <>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-user">Username</label>
                  <input id="auth-user" name="identifier" type="text" className="auth-input"
                    placeholder="yourname" autoComplete="username"
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    value={form.identifier} onChange={handleChange} required />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-email2">Email</label>
                  <input id="auth-email2" name="email" type="email" className="auth-input"
                    placeholder="you@email.com" autoComplete="email"
                    value={form.email} onChange={handleChange} required />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-pw2">Password</label>
                  <span className="auth-input-wrap">
                    <input id="auth-pw2" name="password" type={pwType} className="auth-input"
                      placeholder="At least 8 characters" autoComplete="new-password"
                      value={form.password} onChange={handleChange} required />
                    {PwToggle}
                  </span>
                </div>
              </>
            )}

            {(mode === 'otp' || mode === 'register' || mode === 'forgot') && step === 2 && (
              <>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-otp">6-digit code</label>
                  <input id="auth-otp" name="otp" type="text" className="auth-input is-otp"
                    placeholder="000000" inputMode="numeric" autoComplete="one-time-code"
                    maxLength={6} autoFocus
                    value={form.otp} onChange={handleChange} required />
                </div>
                {mode === 'forgot' && (
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-newpw">New password</label>
                    <span className="auth-input-wrap">
                      <input id="auth-newpw" name="newPassword" type={pwType} className="auth-input"
                        placeholder="At least 8 characters" autoComplete="new-password"
                        value={form.newPassword} onChange={handleChange} required />
                      {PwToggle}
                    </span>
                  </div>
                )}
                <p className="auth-hint">
                  Didn't get it?{' '}
                  <button type="button" className="auth-link"
                    onClick={() => { setStep(1); setSuccess(''); setError(''); }}>
                    Go back and resend
                  </button>
                </p>
              </>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {submitLabel}
            </button>
          </form>

          {mode === 'login' ? (
            <button type="button" className="auth-secondary" onClick={() => switchMode('otp')}>
              Sign in with a one-time code instead
            </button>
          ) : !showTabs && (
            <button type="button" className="auth-secondary" onClick={() => switchMode('login')}>
              ← Back to sign in
            </button>
          )}

          <p className="auth-legal">
            By continuing you agree to our <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
