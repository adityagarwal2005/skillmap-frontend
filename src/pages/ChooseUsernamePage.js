import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { editUser } from '../api/users';
import Logo from '../components/Logo';
import './ChooseUsernamePage.css';

const clean = (v) => v.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30);

/**
 * One-time forced step for a brand-new Google sign-in: their account was
 * created with a username auto-generated from their email address (e.g.
 * "adityaisbuildingsomething@gmail.com" -> "adityaisbuildingsomething"),
 * which nobody wants as their public handle. App.js redirects any user with
 * needsUsername=true here before they can reach the rest of the app.
 */
export default function ChooseUsernamePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const tooShort = username.trim().length < 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 3) { setError('Username must be at least 3 characters'); return; }
    setError('');
    setSaving(true);
    try {
      await editUser(user.id, { username: trimmed });
      updateUser({ username: trimmed, needsUsername: false });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save that username');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cu-page">
      <div className="cu-box">
        <Logo size={2.25} />
        <h1 className="cu-title">Pick a username</h1>
        <p className="cu-sub">
          This is how people on campus find and see you — not your email.
          You can change it later in Settings.
        </p>

        <form onSubmit={handleSubmit} className="cu-form">
          <div className="cu-input-wrap">
            <span className="cu-at">@</span>
            <input
              className="cu-input"
              value={username}
              onChange={e => { setUsername(clean(e.target.value)); setError(''); }}
              placeholder="yourname"
              autoFocus
              autoComplete="off"
              maxLength={30}
            />
          </div>
          {error && <p className="cu-error">{error}</p>}
          <button className="cu-submit" type="submit" disabled={saving || tooShort}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
