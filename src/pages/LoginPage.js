import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../api/auth';
import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isLogin
        ? await login(form.username, form.password)
        : await register(form.username, form.email, form.password);
      const { access, refresh, user_id } = res.data;
      const username = res.data.username || form.username;
      loginUser({ id: user_id, username }, access, refresh);
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
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h1>
        <p className="login-sub">
          {isLogin ? 'Welcome back — your feed is waiting.' : 'Join skilled people across India.'}
        </p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="field-label">Username</label>
            <input name="username" type="text" placeholder="yourname"
              value={form.username} onChange={handleChange}
              required className="field-input" autoComplete="username" />
          </div>
          {!isLogin && (
            <div>
              <label className="field-label">Email</label>
              <input name="email" type="email" placeholder="you@email.com"
                value={form.email} onChange={handleChange}
                required className="field-input" />
            </div>
          )}
          <div>
            <label className="field-label">Password</label>
            <input name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handleChange}
              required className="field-input" autoComplete="current-password" />
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
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
            onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </p>
        <p className="login-footer">By continuing, you agree to SkillMap's Terms of Service.</p>
      </div>
    </div>
  );
}