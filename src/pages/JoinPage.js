import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Landing spot for an invite link (doithere.in/join/<username>). Remembers
// who invited this visitor, then sends them to the public landing page —
// previously this went straight to a bare register form with zero context,
// so a friend's invite link looked like a random signup wall instead of
// something worth joining. The landing page reads smReferredBy and shows
// an "invited by @username" pill before they ever hit the form.
export default function JoinPage() {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (username) localStorage.setItem('smReferredBy', username);
    navigate('/', { replace: true });
  }, [username, navigate]);

  return null;
}
