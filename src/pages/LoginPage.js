import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  login, sendOTP, verifyAndRegister, sendLoginOTP, verifyLoginOTP,
} from '../api/auth';
import './LoginPage.css';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  // Land straight in the sign-up form when arriving via an invite link
  // (/join/:username -> /login?mode=register).
  const [mode, setMode]         = useState(searchParams.get('mode') === 'register' ? 'register' : 'login'); // 'login' | 'otp' | 'register'
  const [step, setStep]         = useState(1);       // used by 'otp' and 'register'
  const [form, setForm]         = useState({ identifier: '', email: '', password: '', otp: '' });
  const [location, setLocation] = useState({ lat: '', lon: '' });
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const { loginUser }           = useAuth();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      });
    }
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = m => {
    setMode(m);
    setStep(1);
    setError('');
    setSuccess('');
    setForm(f => ({ ...f, otp: '', password: '' }));
  };

  const signIn = (res) => {
    const { access, refresh, user_id } = res.data;
    loginUser(
      { id: user_id, username: res.data.username || form.identifier || form.email },
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
    mode === 'login' ? 'Sign in'
    : mode === 'otp' ? (step === 1 ? 'Log in with a code' : 'Enter your code')
    : (step === 1 ? 'Create account' : 'Verify your email');

  const sub =
    mode === 'login' ? 'Welcome back — your feed is waiting.'
    : mode === 'otp' ? (step === 1 ? "We'll email you a one-time login code." : `Enter the 6-digit code sent to ${form.email}`)
    : (step === 1 ? 'Join skilled people across India.' : `Enter the 6-digit code sent to ${form.email}`);

  const submitLabel =
    loading ? 'Please wait…'
    : mode === 'login' ? 'Sign in'
    : mode === 'otp' ? (step === 1 ? 'Send login code' : 'Verify & sign in')
    : (step === 1 ? 'Send verification code' : 'Create account');

  return (
    <div className="login-page">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-tag">// SKILLMAP — HYPERLOCAL SKILL NETWORK</div>
          <h2 className="auth-brand-display">
            Get discovered<br />for what you<br /><em>actually</em> do.
          </h2>
          <p className="auth-brand-sub">
            Portfolios, freelance gigs, and collaborators — matched to the
            skills and people right around you, across India.
          </p>
          <div className="auth-brand-meta">
            <span>[ PORTFOLIO ]</span>
            <span>[ FREELANCE ]</span>
            <span>[ COLLAB ]</span>
          </div>
        </div>
        <div className="auth-brand-glow" aria-hidden="true" />
        <div className="auth-brand-grid" aria-hidden="true" />
      </aside>

      <div className="auth-form-col">
      <div className="login-box">
        <div className="login-wordmark">
          <div className="login-wordmark-icon">S</div>
          <span className="login-wordmark-name">SkillMap</span>
        </div>

        <h1 className="login-heading">{heading}</h1>
        <p className="login-sub">{sub}</p>

        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Password login */}
          {mode === 'login' && (
            <>
              <div>
                <label className="field-label">Username or Email</label>
                <input name="identifier" type="text"
                  placeholder="yourname or you@email.com"
                  value={form.identifier} onChange={handleChange}
                  required className="field-input" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input name="password" type="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  required className="field-input" />
              </div>
            </>
          )}

          {/* OTP login — step 1: email */}
          {mode === 'otp' && step === 1 && (
            <div>
              <label className="field-label">Email</label>
              <input name="email" type="email" placeholder="you@email.com"
                value={form.email} onChange={handleChange}
                required className="field-input" autoFocus />
            </div>
          )}

          {/* Register — step 1: details */}
          {mode === 'register' && step === 1 && (
            <>
              <div>
                <label className="field-label">Username</label>
                <input name="identifier" type="text" placeholder="yourname"
                  value={form.identifier} onChange={handleChange}
                  required className="field-input" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input name="email" type="email" placeholder="you@email.com"
                  value={form.email} onChange={handleChange}
                  required className="field-input" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input name="password" type="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  required className="field-input" />
              </div>
            </>
          )}

          {/* OTP code entry (shared by otp-login step 2 & register step 2) */}
          {(mode === 'otp' || mode === 'register') && step === 2 && (
            <div>
              <label className="field-label">Verification Code</label>
              <input name="otp" type="text" placeholder="000000"
                value={form.otp} onChange={handleChange}
                required className="field-input otp-input"
                maxLength={6} autoFocus />
              <p className="otp-resend">
                Didn't get it?{' '}
                <span onClick={() => { setStep(1); setSuccess(''); setError(''); }}>
                  Go back
                </span>
              </p>
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {submitLabel}
          </button>
        </form>

        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>

        {/* Alternate options */}
        {mode === 'login' ? (
          <div className="login-alt-options">
            <button type="button" className="login-alt-btn" onClick={() => switchMode('otp')}>
              Log in with a one-time code
            </button>
            <button type="button" className="login-alt-btn" onClick={() => switchMode('register')}>
              Create an account
            </button>
          </div>
        ) : (
          <p className="login-toggle">
            <span className="login-toggle-link" onClick={() => switchMode('login')}>
              ← Back to password sign-in
            </span>
          </p>
        )}

        <p className="login-footer">
          By continuing, you agree to SkillMap's Terms of Service.
        </p>
      </div>
      </div>
    </div>
  );
}
