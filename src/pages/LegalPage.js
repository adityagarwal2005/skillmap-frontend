import { useLocation, useNavigate, Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';
import './LegalPage.css';

const LAST_UPDATED = 'July 2026';

function TermsContent() {
  return (
    <>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p>
        DoitHere ("we", "us", "the platform") is a campus talent network that helps students
        find skilled people nearby, post and apply to freelance work, and team up on collabs.
        By creating an account you agree to these terms.
      </p>

      <h2>1. Who can use DoitHere</h2>
      <p>
        DoitHere is built for students on our campus. You must provide accurate information when
        you register, and you're responsible for keeping your account secure. You must be old
        enough to legally enter into agreements in your jurisdiction to use paid freelance features.
      </p>

      <h2>2. DoitHere is a connector, not a party to your agreements</h2>
      <p>
        <strong>DoitHere does not process, hold, or guarantee any payment.</strong> Freelance jobs,
        collabs, and any pay you arrange with another user are agreements directly between you and
        them — DoitHere has no part in that transaction, doesn't verify anyone's ability to pay or
        deliver, and isn't liable if a job goes badly, payment doesn't happen, or work isn't
        completed as expected. Use good judgment: agree on scope and payment terms clearly before
        starting work, and prefer meeting in safe, public places for anything in person.
      </p>
      <p>
        Nothing on DoitHere creates an employment relationship between you, DoitHere, or anyone you
        work with through the platform.
      </p>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of anything you post — portfolio work, job/collab listings, photos,
        videos, and messages. By posting, you give DoitHere permission to store and display it to
        other users as part of running the platform. Don't post anything you don't have the right
        to share.
      </p>

      <h2>4. Community guidelines</h2>
      <p>
        Be respectful. Harassment, hate speech, threats, spam, scams, and impersonation are not
        allowed and may get your account suspended or removed. Use the Block and Report features on
        any profile or post if someone violates this — reports are reviewed by the DoitHere team.
      </p>

      <h2>5. Location & identity</h2>
      <p>
        Some features (radius-filtered jobs/collabs) use your device location, which you can
        decline — those features just won't work as well. Finding people by username doesn't use
        location at all. To help people verify who they're dealing with, posting or applying to
        freelance/collab work requires at least one connected account (GitHub, LinkedIn, or
        Instagram) on your profile.
      </p>

      <h2>6. Account deletion</h2>
      <p>
        You can delete your account at any time from Settings. This removes your profile;
        some records tied to completed transactions (e.g. past reviews) may be retained in
        anonymized or aggregate form for trust and safety purposes.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms as DoitHere evolves. Material changes will be reflected here with
        an updated date.
      </p>

      <h2>8. Contact</h2>
      <p>Questions about these terms? Reach out to the DoitHere team through the app.</p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p>
        This explains what DoitHere collects, why, and how it's used. We collect the minimum
        needed to make the platform work.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> username, email, password (stored hashed, never in plain text), date of birth.</li>
        <li><strong>Profile info:</strong> category, skills, headline, bio, profile photo, social links (LinkedIn/GitHub/Instagram/WhatsApp).</li>
        <li><strong>Location:</strong> only if you grant permission — used to show distance and filter nearby people/jobs/collabs. You can deny this and still use the app.</li>
        <li><strong>Content:</strong> portfolio posts, freelance/collab listings, messages (including any photos/videos you attach), comments, reactions.</li>
        <li><strong>Usage:</strong> basic activity like profile views and notification interactions, used to power features like notifications and your applications list.</li>
        <li><strong>Push notifications:</strong> if you opt in, your browser's push subscription details — only used to deliver notifications you'd otherwise see in-app.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        To run the core features: matching you with relevant people/jobs/collabs, showing your
        profile to others, delivering messages and notifications, and keeping the platform safe
        (via block/report tools). We don't sell your data to third parties.
      </p>

      <h2>3. Who can see what</h2>
      <p>
        Your profile (username, category, skills, photo, bio, social links, ratings) is visible to
        other logged-in users. Your exact location is never shown to others — only a computed
        distance (e.g. "2.3 km"). Messages are only visible to the people in that conversation.
        Your email is never shown to other users.
      </p>

      <h2>4. Third-party services</h2>
      <p>
        We use a small number of infrastructure providers to run DoitHere: a hosting provider for
        the app and database, Cloudinary for storing images/videos you upload, and an email
        provider for sending one-time login/verification codes. These providers only process data
        on our behalf and don't use it for their own purposes.
      </p>

      <h2>5. Your choices</h2>
      <p>
        You can edit or remove most profile information anytime from Edit Profile. You can turn
        location and push notifications off anytime. You can block any user, which also hides your
        content from them. You can delete your account from Settings.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We keep your data while your account is active. If you delete your account, your profile
        and personal content are removed; some anonymized records (e.g. aggregate ratings) may
        persist for platform integrity.
      </p>

      <h2>7. Changes</h2>
      <p>We may update this policy as DoitHere evolves. Material changes will be reflected here.</p>

      <h2>8. Contact</h2>
      <p>Questions about your data? Reach out to the DoitHere team through the app.</p>
    </>
  );
}

export default function LegalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrivacy = location.pathname.startsWith('/privacy');

  usePageMeta({
    title: isPrivacy ? 'Privacy Policy' : 'Terms of Service',
    description: isPrivacy
      ? 'How DoitHere collects, uses, and protects your data.'
      : 'The terms that govern using DoitHere, the campus talent network.',
    path: isPrivacy ? '/privacy' : '/terms',
  });

  return (
    <div className="legal-page">
      <div className="legal-card">
        <button className="legal-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="legal-tabs">
          <Link to="/terms" className={`legal-tab ${!isPrivacy ? 'active' : ''}`}>Terms of Service</Link>
          <Link to="/privacy" className={`legal-tab ${isPrivacy ? 'active' : ''}`}>Privacy Policy</Link>
        </div>
        <h1 className="legal-title">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <div className="legal-body">
          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </div>
      </div>
    </div>
  );
}
