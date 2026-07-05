import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, sendOTP, verifyAndRegister } from '../api/auth';
import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin]   = useState(true);
  const [step, setStep]         = useState(1);
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

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(form.identifier, form.password);
        const { access, refresh, user_id } = res.data;
        loginUser({ id: user_id, username: res.data.username || form.identifier }, access, refresh);
      } else if (step === 1) {
        await sendOTP(form.identifier, form.email);
        setSuccess(`Verification code sent to ${form.email}`);
        setStep(2);
      } else {
        const res = await verifyAndRegister(
          form.identifier, form.email, form.password, form.otp,
          location.lat, location.lon
        );
        const { access, refresh, user_id } = res.data;
        loginUser({ id: user_id, username: res.data.username || form.identifier }, access, refresh);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-wordmark">
          <div className="login-wordmark-icon">S</div>
          <span className="login-wordmark-name">SkillMap</span>
        </div>

        <h1 className="login-heading">
          {isLogin ? 'Sign in' : step === 1 ? 'Create account' : 'Verify email'}
        </h1>
        <p className="login-sub">
          {isLogin ? 'Welcome back — your feed is waiting.'
            : step === 1 ? 'Join skilled people across India.'
            : `Enter the 6-digit code sent to ${form.email}`}
        </p>

        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {isLogin && (
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

          {!isLogin && step === 1 && (
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

          {!isLogin && step === 2 && (
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
            {loading ? 'Please wait...'
              : isLogin ? 'Sign in'
              : step === 1 ? 'Send verification code'
              : 'Create account'}
          </button>
        </form>

        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>

        <p className="login-toggle">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="login-toggle-link"
            onClick={() => { setIsLogin(!isLogin); setStep(1); setError(''); setSuccess(''); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </p>

        <p className="login-footer">
          By continuing, you agree to SkillMap's Terms of Service.
        </p>
      </div>
    </div>
  );
}