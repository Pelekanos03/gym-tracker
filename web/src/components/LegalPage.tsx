import { LEGAL } from '../legal';

/**
 * Plain-language privacy policy and terms, written to match what the app
 * actually does. A starting point, not legal advice — have someone check
 * it before a wider launch.
 */
export function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  return (
    <article className="panel legal">
      {page === 'privacy' ? <Privacy /> : <Terms />}
      <p className="muted">Last updated: {LEGAL.lastUpdated}</p>
      <p>
        <a href="/">Back to the app</a>
      </p>
    </article>
  );
}

function Privacy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>
        gym-app is run by {LEGAL.operator} ({LEGAL.country}), who is responsible for your data.
        Questions or requests: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Your account</strong>: name, email, and your password — only as a secure one-way hash, never the password itself.</li>
        <li><strong>Your training</strong>: workouts, sets, weights, reps, RPE, notes, programs, training blocks and exercises you add.</li>
        <li><strong>Body weight</strong> readings you log.</li>
        <li><strong>Videos</strong> of your sets that you choose to upload.</li>
        <li><strong>Connections</strong>: friends and coaching links, and programs you share.</li>
        <li><strong>Technical data</strong>: one essential cookie that keeps you logged in, and short-lived server logs (including IP addresses) used to keep the service secure, e.g. to block password guessing.</li>
      </ul>

      <h2>Why</h2>
      <p>
        Only to run the app for you: to save and show your training, and let you share it with the
        people you choose. Body weight and videos of you are health-related; we store them because
        you choose to add them, and you can delete them at any time.
      </p>
      <p>
        We don't sell your data, show ads, or use analytics or tracking cookies.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li><strong>You</strong> see everything.</li>
        <li><strong>A coach you've accepted</strong> can see your workouts, programs, progress and set videos.</li>
        <li><strong>Friends</strong> you've accepted can see your progress and programs you share with them — not your videos.</li>
        <li>Nobody else. Our providers store or send data for us but don't use it: hosting by {LEGAL.hosting}; password-reset emails by {LEGAL.emailProvider}.</li>
      </ul>

      <h2>How long</h2>
      <p>
        Until you delete it or your account. Deleting your account removes your data straight
        away; copies in backups are gone within 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see, download (Account → Download your data), correct and delete your data
        (Account → Delete account), and object to how we use it. If you think we've handled it
        wrongly you can complain to the data-protection authority in your country — but please
        contact us first so we can fix it.
      </p>

      <h2>Security</h2>
      <p>
        Traffic is encrypted (HTTPS), passwords are hashed, videos are only served to the people
        allowed to see them, and access is checked on the server for every request.
      </p>

      <h2>Age</h2>
      <p>You need to be at least 16 to use gym-app.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>
        These terms are between you and {LEGAL.operator} ({LEGAL.country}), who runs gym-app. By
        creating an account you agree to them.
      </p>

      <h2>The service</h2>
      <p>
        gym-app is a free training log in an early (beta) stage. It's provided as it is: features
        may change, and while we take care of your data, we can't promise it will always be
        available or error-free. Download your data now and then if it matters to you.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Nothing in the app — programs, numbers, estimated maxes, or anything a coach or friend
        shares — is medical advice. Train within your limits, and see a professional if you're
        injured or unsure.
      </p>

      <h2>Your content</h2>
      <p>
        What you log and upload stays yours. You let us store it and show it to the people you
        choose, only to run the app. Only upload videos you have the right to share, and don't
        film other people without their permission.
      </p>

      <h2>Using it fairly</h2>
      <p>
        Don't break the law with it, harass anyone, try to get into other people's accounts, or
        overload or attack the service. We may suspend accounts that do.
      </p>

      <h2>Ending</h2>
      <p>
        You can delete your account at any time from the Account page. We may close the service;
        if so, we'll give you notice and time to download your data where we can.
      </p>

      <h2>Liability</h2>
      <p>
        As far as the law allows, we're not liable for losses from using the app, including lost
        data or injuries from training. Nothing here limits rights you have by law as a consumer.
      </p>

      <h2>Changes</h2>
      <p>
        If we change these terms in a way that matters, we'll tell you in the app. Contact:{' '}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </>
  );
}
