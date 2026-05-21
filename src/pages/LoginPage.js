import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, sendOTP, verifyAndRegister } from '../api/auth';
import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin]   = useState(true);
  const [step, setStep]         = useState(1); // 1=form, 2=otp
  const [form, setForm]         = useState({ username: '', email: '', password: '', otp: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const { loginUser }           = useAuth();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login(form.username, form.password);
        const { access, refresh, user_id } = res.data;
        const username = res.data.username || form.username;
        loginUser({ id: user_id, username }, access, refresh);

      } else if (step === 1) {
        // Send OTP
        await sendOTP(form.username, form.email);
        setSuccess(`OTP sent to ${form.email}`);
        setStep(2);

      } else {
        // Verify OTP + register
        const res = await verifyAndRegister(form.username, form.email, form.password, form.otp);
        const { access, refresh, user_id } = res.data;
        const username = res.data.username || form.username;
        loginUser({ id: user_id, username }, access, refresh);
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setError('');
    setSuccess('');
    setForm({ username: '', email: '', password: '', otp: '' });
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

          {/* Login fields */}
          {isLogin && (
            <>
              <div>
                <label className="field-label">Username</label>
                <input name="username" type="text" placeholder="yourname"
                  value={form.username} onChange={handleChange}
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

          {/* Register step 1 */}
          {!isLogin && step === 1 && (
            <>
              <div>
                <label className="field-label">Username</label>
                <input name="username" type="text" placeholder="yourname"
                  value={form.username} onChange={handleChange}
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

          {/* Register step 2 — OTP */}
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
          <span className="login-toggle-link" onClick={switchMode}>
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