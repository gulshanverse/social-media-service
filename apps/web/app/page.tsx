import Link from 'next/link';
import { Logo } from '@ggv/ui';

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Logo />
        <nav>
          <Link href="/confessions">Community</Link>
          <Link className="nav-cta" href="/send">
            Send one 💌
          </Link>
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">COLLEGE CONFESSION · YOUR CAMPUS, UNFILTERED</p>
          <h1>
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
          <p className="eyebrow">TODAY&apos;S ENERGY</p>
          <p className="hero-quote">“I still look for you in every crowd.”</p>
          <div className="hero-card__footer">
            <span>— Anonymous</span>
            <span>CRUSH · JUST NOW</span>
          </div>
        </div>
      </section>
      <section className="how-section">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>
            Low stakes.
            <br />
            <span>High honesty.</span>
          </h2>
        </div>
        <div className="steps">
          <div>
            <b>01</b>
            <h3>Write it down</h3>
            <p>Drop your thought without a name, email, or login.</p>
          </div>
          <div>
            <b>02</b>
            <h3>We review it</h3>
            <p>Every submission stays pending until a moderator approves it.</p>
          </div>
          <div>
            <b>03</b>
            <h3>Campus reads</h3>
            <p>Published confessions become part of the shared campus story.</p>
          </div>
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
  );
}
