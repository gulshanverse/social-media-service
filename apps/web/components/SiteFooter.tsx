import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <section className="footer-brand" aria-label="College Confession">
          <Link href="/" className="footer-brand-name">
            <span aria-hidden="true">♛</span>
            <strong>College Confession</strong>
          </Link>
          <p className="footer-tagline">A thoughtful corner of campus life.</p>
          <p className="footer-description">
            Anonymous submissions, human review, and room for real conversation.
          </p>
          <div className="footer-actions">
            <Link className="footer-button footer-button--secondary" href="/confessions">
              Explore confessions
            </Link>
            <Link className="footer-button" href="/send">
              Send confession
            </Link>
          </div>
        </section>

        <nav className="footer-nav" aria-label="Footer navigation">
          <section className="footer-nav-group" aria-labelledby="footer-explore">
            <h2 id="footer-explore">Explore</h2>
            <Link href="/confessions">Confessions</Link>
            <Link href="/vibematch">VibeMatch</Link>
            <Link href="/garba">Garba</Link>
            <span className="footer-coming-soon">
              Buy &amp; Sell <small>Coming soon</small>
            </span>
            <span className="footer-coming-soon">
              Find Your Partner <small>Coming soon</small>
            </span>
          </section>
          <section className="footer-nav-group" aria-labelledby="footer-support">
            <h2 id="footer-support">Support</h2>
            <Link href="/community-guidelines">Community guidelines</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/report">Report content</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </section>
        </nav>
      </div>

      <section className="footer-connect" aria-label="Trust note">
        <div>
          <h2>Built for students</h2>
          <p>Share it. Read it. Keep it thoughtful.</p>
        </div>
        <p className="footer-independent">
          Independent platform · Not an official university service
        </p>
      </section>

      <div className="footer-bottom">
        <span>© 2026 CollegeConfession</span>
        <span>Made for campus communities · All rights reserved.</span>
      </div>
    </footer>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="site-shell">
      <article className="legal-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-content">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>;
}
