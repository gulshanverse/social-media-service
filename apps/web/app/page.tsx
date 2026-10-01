import Link from 'next/link';
import { AdSenseScript } from '../components/AdSenseScript';

export default function Home() {
  return (
    <>
      <AdSenseScript eligible />
      <main className="site-shell">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">COLLEGE CONFESSION · YOUR CAMPUS, UNFILTERED</p>
            <h1 aria-label="Your thoughts. Your secrets. Your campus.">
              Your thoughts.
              <br />
              Your secrets.
              <br />
              <span>Your campus.</span>
            </h1>
            <p className="hero-lede">
              The anonymous corner of campus for crushes, chaos, advice, appreciation and everything
              you never say out loud.
            </p>
            <div className="button-row">
              <Link className="ggv-button" href="/send">
                Send a Confession 💌
              </Link>
              <Link className="ghost-button" href="/confessions">
                Browse Confessions ↗
              </Link>
            </div>
            <div className="trust-row">
              <span>◎ Anonymous by default</span>
              <span>✦ Reviewed before publishing</span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card__glow" />
            <p className="eyebrow">ANONYMOUS BY DESIGN</p>
            <p className="hero-quote">No public profile. A moderator reviews each post.</p>
            <div className="hero-card__footer">
              <span>No account required</span>
              <span>Review before publishing</span>
            </div>
          </div>
        </section>

        <section className="how-section">
          <div>
            <p className="eyebrow">WHAT THIS IS</p>
            <h2>
              A student space
              <br />
              <span>for real campus life.</span>
            </h2>
          </div>
          <div className="info-copy">
            <p>
              College Confession is an independent, student-focused community for first-person
              campus experiences, questions, appreciation, advice and harmless stories. You can
              participate without creating a public profile, while remembering that anonymous does
              not mean technically untraceable.
            </p>
            <p>
              Posts are community conversation, not official university statements or verified
              reporting. Leave out names, contact details and identifying clues so your story does
              not put another person at risk.
            </p>
          </div>
        </section>

        <section className="how-section">
          <div>
            <p className="eyebrow">HOW MODERATION WORKS</p>
            <h2>
              A pause before
              <br />
              <span>publication.</span>
            </h2>
          </div>
          <div className="steps">
            <div>
              <b>01</b>
              <h3>Submit</h3>
              <p>Your confession enters a pending queue without a public account.</p>
            </div>
            <div>
              <b>02</b>
              <h3>Human review</h3>
              <p>An authorized moderator may approve, edit for safety, or reject it.</p>
            </div>
            <div>
              <b>03</b>
              <h3>Share or report</h3>
              <p>Approved posts appear on the wall; community reports return to moderation.</p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <div className="info-panel">
            <p className="eyebrow">WHAT BELONGS HERE</p>
            <h2>Keep it personal, useful and respectful.</h2>
            <ul>
              <li>First-person experiences and campus questions</li>
              <li>Appreciation, advice and harmless observations</li>
              <li>Disagreement about ideas without targeting a person</li>
            </ul>
          </div>
          <div className="info-panel info-panel--warning">
            <p className="eyebrow">KEEP OFF THE WALL</p>
            <h2>Protect people before you post.</h2>
            <ul>
              <li>Names, phone numbers, addresses, handles or identifying clues</li>
              <li>Threats, harassment, targeted bullying or sexual exploitation</li>
              <li>Scams, malicious links, impersonation or dangerous instructions</li>
            </ul>
          </div>
        </section>

        <section className="how-section">
          <div>
            <p className="eyebrow">PRIVACY &amp; ANONYMITY</p>
            <h2>
              Share with
              <br />
              <span>care.</span>
            </h2>
          </div>
          <div className="info-copy">
            <p>
              No name or email is required to submit. The service may process technical information
              for security and abuse prevention, and the details in a post can identify you or
              someone else. Read the <Link href="/privacy">Privacy Policy</Link> before posting.
            </p>
            <p>
              Have a concern? See the <Link href="/community-guidelines">Community Guidelines</Link>
              , use <Link href="/report">Report Content</Link>, or read the{' '}
              <Link href="/faq">FAQ</Link>.
            </p>
          </div>
        </section>

        <section className="final-cta">
          <p className="eyebrow">HAVE SOMETHING TO SAY?</p>
          <h2>
            Make it anonymous.
            <br />
            <span>Make it count.</span>
          </h2>
          <Link className="ggv-button" href="/send">
            Send your confession
          </Link>
        </section>
      </main>
    </>
  );
}
