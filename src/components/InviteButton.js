import { useAuth } from '../context/AuthContext';

// One-tap WhatsApp invite. Opens WhatsApp with a prefilled message carrying the
// user's own referral link (/join/<username>), so whoever joins is credited to
// them. The fastest way to spread the app inside one cluster (a hostel, a
// class) where everyone's already on WhatsApp.
const WA_ICON = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.57 15.13L2 22l4.98-1.3A10 10 0 1 0 12 2zm0 18.2a8.17 8.17 0 0 1-4.16-1.14l-.3-.18-3.08.8.82-3-.2-.31A8.2 8.2 0 1 1 12 20.2zm4.5-6.13c-.25-.12-1.46-.72-1.69-.8s-.39-.12-.56.13-.64.8-.78.97-.29.18-.54.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5l.37-.44c.12-.14.16-.25.25-.41a.46.46 0 0 0-.02-.44c-.06-.12-.56-1.34-.76-1.84s-.4-.42-.56-.42h-.48a.92.92 0 0 0-.67.31 2.8 2.8 0 0 0-.87 2.08 4.86 4.86 0 0 0 1.02 2.58 11.1 11.1 0 0 0 4.27 3.78c.6.26 1.06.41 1.42.53a3.4 3.4 0 0 0 1.57.1c.48-.07 1.46-.6 1.67-1.18s.2-1.07.14-1.17-.22-.17-.47-.29z"/>
  </svg>
);

export default function InviteButton({ className = '', children }) {
  const { user } = useAuth();

  const invite = () => {
    const link = `${window.location.origin}/join/${user?.username || ''}`;
    const msg =
      `Yo! Join me on DoitHere 🙌 — quick gigs & collabs with people near you on campus. ` +
      `Post what you need, or earn doing what you're good at 👇\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button type="button" className={`wa-invite-btn ${className}`} onClick={invite}>
      {WA_ICON}<span>{children || 'Invite on WhatsApp'}</span>
    </button>
  );
}
