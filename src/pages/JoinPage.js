import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Landing spot for an invite link (doithere.in/join/<username>). Remembers
// who invited this visitor, then sends them into registration. Works whether
// or not they're already logged in — App.js only routes here for anonymous
// visitors (a logged-in user hitting this URL is sent to their feed instead).
export default function JoinPage() {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (username) localStorage.setItem('smReferredBy', username);
    navigate('/login?mode=register', { replace: true });
  }, [username, navigate]);

  return null;
}
