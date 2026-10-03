import { LEGAL } from '../legal';
import { CONSENT_TEXT } from './PrivacyChoices';

/**
 * Plain-language privacy policy and terms, written to match what the app
 * actually does and the EU rules it falls under (GDPR, the ePrivacy rules
 * on cookies, the Digital Services Act for uploads, EU consumer law).
 * A careful starting point, not legal advice — have a lawyer read it
 * before a wider launch.
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

const Mail = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

function Authority() {
  return LEGAL.authority.url ? (
    <a href={LEGAL.authority.url} target="_blank" rel="noreferrer">
      {LEGAL.authority.name}
    </a>
  ) : (
    <>{LEGAL.authority.name}</>
  );
}

function Privacy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>
        This app is run by {LEGAL.operator} ({LEGAL.country}), the “controller” responsible for your
        personal data under the EU General Data Protection Regulation (GDPR). Questions, requests or
        complaints: <Mail />.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account</strong>: your name, email, and password — only as a secure one-way hash, never the password itself.</li>
        <li><strong>Profile picture</strong>, if you add one.</li>
        <li><strong>Training</strong>: workouts, sets, weights, reps, RPE, notes, programs, training blocks, exercises you add, and workouts in progress.</li>
        <li><strong>Cardio</strong> sessions (time, distance, heart rate, calories, notes) and your own activity names.</li>
        <li><strong>Body weight</strong> readings.</li>
        <li><strong>Set videos</strong> you upload, and your comments on them.</li>
        <li><strong>Messages</strong> and files (photos, documents) you send to friends or your coach.</li>
        <li><strong>Connections</strong>: friends, coaching links, programs you share.</li>
        <li><strong>Your privacy choices</strong>, with the date and policy version, so we can show what you agreed to.</li>
        <li><strong>Technical data</strong>: one essential login cookie, and server logs (including IP addresses) used to keep the service secure — e.g. to block password guessing.</li>
      </ul>
      <p>
        Body weight, workouts, cardio and videos of you are <strong>health data</strong>, which the law
        protects specially. We only store them with your explicit consent (given when you sign up), and
        only to run the app for you — unless you also switch on one of the optional choices below.
      </p>

      <h2>Why we use it, and on what legal basis</h2>
      <ul>
        <li>
          <strong>To run the app for you</strong> — save and show your training, let you share it with
          the people you pick, chat, reset your password. Basis: our contract with you (GDPR art. 6(1)(b)),
          and your explicit consent for health data (art. 9(2)(a)).
        </li>
        <li>
          <strong>To keep it secure</strong> — logs, rate limits, stopping abuse. Basis: our legitimate
          interest in a safe service (art. 6(1)(f)).
        </li>
        <li>
          <strong>To improve the app</strong> — e.g. seeing which features are used or where errors happen,
          using our own records. No third-party analytics or tracking. Basis: legitimate interest
          (art. 6(1)(f)); you can object (see “Your rights”).
        </li>
        <li>
          <strong>Anonymous statistics</strong> — we may combine data from many users into totals or
          averages (e.g. “average squat progress over 12 weeks”) and publish or share them. These can’t
          identify you: no names, emails, pictures, videos or messages, and no groups so small that a
          person could be singled out. Once truly anonymous they are no longer personal data.
        </li>
        <li>
          <strong>Sharing with partners</strong> — <em>only if you switch it on</em>: “{CONSENT_TEXT.partners}”
          Basis: your explicit consent (art. 6(1)(a) and 9(2)(a)).{' '}
          {LEGAL.partners.length === 0 ? (
            <>We don’t share with any partner today. Before we do, we will list them here.</>
          ) : (
            <>Current partners: {LEGAL.partners.map((p) => `${p.name} (${p.country}) — ${p.purpose}`).join('; ')}.</>
          )}
        </li>
        <li>
          <strong>Training AI models</strong> — <em>only if you switch it on</em>: “{CONSENT_TEXT.ai}” Basis:
          your explicit consent (art. 6(1)(a) and 9(2)(a)).
        </li>
      </ul>
      <p>
        For partners and AI, data is <strong>pseudonymised</strong> first: your name, email, profile
        picture, videos and messages are removed. The two optional choices are off unless you turn them
        on, saying no never limits the app, and you can change them any time under{' '}
        <strong>Account → Your data choices</strong>. Withdrawing stops future use; it doesn’t undo use
        already made while it was on.
      </p>
      <p>We don’t sell your data, show ads, or use tracking cookies. We make no automated decisions about you that have legal or similar effects.</p>

      <h2>Who can see it</h2>
      <ul>
        <li><strong>You</strong> see everything.</li>
        <li><strong>A coach you accepted</strong> sees your workouts, programs, progress, set videos and video comments.</li>
        <li><strong>Friends</strong> you accepted see your progress, programs you share, and your profile picture — not your videos.</li>
        <li><strong>Messages and their files</strong> are only for you and the person you sent them to. We don’t read them, except where needed to deal with a report of illegal content or abuse, or when the law requires it.</li>
        <li>
          <strong>Service providers</strong> who store or carry data for us under contract, and may not
          use it for themselves: hosting — {LEGAL.hosting}; network — {LEGAL.network}
          {LEGAL.emailProvider && <>; password-reset emails — {LEGAL.emailProvider}</>}.
        </li>
        <li><strong>Authorities</strong>, only when the law requires us to.</li>
      </ul>

      <h2>Outside the EU</h2>
      <p>
        Your connection to the app passes through {LEGAL.network}. Transfers to the USA are covered by
        the EU–US Data Privacy Framework and/or the European Commission’s standard contractual clauses.
        Ask us for details.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and everything in it: until you delete it (or a part of it). Deleting your account removes your data straight away.</li>
        <li>Messages: deleted when either person deletes their account.</li>
        <li>Server logs: kept briefly — old entries are overwritten automatically.</li>
        <li>Backups: deleted within 30 days.</li>
        <li>Records of your consent choices: as long as your account exists, so we can show what you agreed to.</li>
      </ul>

      <h2>Your rights</h2>
      <p>Under the GDPR you can, free of charge:</p>
      <ul>
        <li><strong>see</strong> your data and get a copy — Account → Download your data;</li>
        <li><strong>take it elsewhere</strong> (that download is a machine-readable file);</li>
        <li><strong>correct</strong> it — edit it in the app, or ask us;</li>
        <li><strong>delete</strong> it — delete entries in the app, or your whole account under Account;</li>
        <li><strong>withdraw consent</strong> at any time — Account → Your data choices; for health data, by deleting it or your account;</li>
        <li><strong>object</strong> to use based on our legitimate interests (such as improving the app), or ask us to <strong>restrict</strong> use while a question is sorted out.</li>
      </ul>
      <p>
        Write to <Mail /> — we answer within one month. You can also complain to a data-protection
        authority: ours is <Authority />, or the one where you live or work.
      </p>

      <h2>Cookies and storage on your device</h2>
      <p>
        We use one cookie, only to keep you logged in, and your browser’s storage to keep things like a
        workout in progress and your settings. These are needed for the app to work, so we don’t ask
        about them. No advertising or tracking cookies.
      </p>

      <h2>Security</h2>
      <p>
        Connections are encrypted (HTTPS), passwords are hashed, every request is checked on the server,
        and videos, files and pictures are only sent to the people allowed to see them. If a breach put
        your data at risk, we would tell you and the authority as the law requires.
      </p>

      <h2>Age</h2>
      <p>You need to be at least 16 to use the app.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy in a way that matters, we’ll tell you in the app. If a change needs your
        consent, we’ll ask again — nothing new is switched on for you without it.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>
        These terms are between you and {LEGAL.operator} ({LEGAL.country}), who runs this app. By creating an
        account you agree to them. How we handle your data is in the <a href="/privacy">privacy policy</a>.
      </p>

      <h2>The service</h2>
      <p>
        A free training log, with chat and sharing between friends and coaches, in an early (beta) stage.
        Features may change. We take care of your data, but can’t promise the app will always be available
        or error-free — download your data now and then if it matters to you.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Nothing in the app — programs, numbers, estimated maxes, or anything a coach or friend shares — is
        medical advice. Train within your limits, and see a professional if you’re injured or unsure.
      </p>

      <h2>Your content</h2>
      <p>
        What you log, upload and send stays yours. You allow us to store it and show it to the people you
        choose, as needed to run the app, and — if you switch them on — to use it as described in your data
        choices. We may also make anonymous statistics from it, which can’t identify you.
      </p>
      <p>
        Only upload things you have the right to share. Don’t film or post pictures of other people without
        their permission.
      </p>

      <h2>Using it fairly</h2>
      <p>
        Don’t use the app to break the law, post or send illegal content, harass or threaten anyone, try to
        get into other people’s accounts, or overload or attack the service.
      </p>

      <h2>Reporting illegal content</h2>
      <p>
        If you find illegal content, or someone is misusing the app, write to <Mail /> with where it is and
        why it’s illegal. We’ll look at it promptly and let you know what we did. If we remove your content or
        restrict your account, we’ll tell you why, and you can reply to <Mail /> to ask us to look again.
      </p>

      <h2>Ending</h2>
      <p>
        You can delete your account at any time from the Account page. We may suspend or close accounts that
        seriously or repeatedly break these terms, after warning you where we reasonably can. If we close the
        service, we’ll give you notice and time to download your data.
      </p>

      <h2>Liability</h2>
      <p>
        The app is free and provided as it is. We aren’t liable for indirect losses, such as lost data you
        could have downloaded, or injuries from how you choose to train. We are always liable where the law
        doesn’t allow a limit — for example for harm we cause on purpose or through gross negligence, or for
        death or personal injury caused by our fault. Nothing here takes away your rights as a consumer.
      </p>

      <h2>Law and disputes</h2>
      <p>
        The law of {LEGAL.country} applies, but if you live elsewhere in the EU you keep the protection of
        the consumer laws of your country, and you can bring a claim in your local courts. Please contact us
        first — most things can be sorted out quickly.
      </p>

      <h2>Changes</h2>
      <p>
        If we change these terms in a way that matters, we’ll tell you in the app before it takes effect. If
        you don’t agree, you can delete your account. Contact: <Mail />.
      </p>
    </>
  );
}
