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
          <p className="footer-tagline">Share it. Read it. Keep it thoughtful.</p>
          <p className="footer-description">Campus thoughts, reviewed before publication.</p>
          <div className="footer-actions">
            <Link className="footer-button footer-button--secondary" href="/confessions">
              Explore
            </Link>
            <Link className="footer-button" href="/send">
              Send
            </Link>
          </div>
        </section>

        <nav className="footer-nav" aria-label="Footer navigation">
          <section className="footer-nav-group" aria-labelledby="footer-platform">
            <h2 id="footer-platform">Platform</h2>
            <Link href="/about">About</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/send">Send</Link>
            <Link href="/faq">FAQ</Link>
          </section>
          <section className="footer-nav-group" aria-labelledby="footer-community">
            <h2 id="footer-community">Community</h2>
            <Link href="/confessions">Explore the community</Link>
          </section>
          <section className="footer-nav-group" aria-labelledby="footer-safety">
            <h2 id="footer-safety">Safety &amp; trust</h2>
            <Link href="/community-guidelines">Guidelines</Link>
            <Link href="/report">Report content</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </section>
          <section className="footer-nav-group" aria-labelledby="footer-support">
            <h2 id="footer-support">Support</h2>
            <Link href="/contact">Help center &amp; contact</Link>
          </section>
        </nav>
      </div>

      <section className="footer-connect" aria-label="Connect">
        <div>
          <h2>Connect</h2>
          <p>Follow the campus pulse.</p>
        </div>
        <p className="footer-independent">
          Independent platform · Not an official university service
        </p>
      </section>

      <div className="footer-bottom">
        <span>© 2026 CollegeConfession</span>
        <span>Built for students · All rights reserved.</span>
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
