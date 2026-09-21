import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>GGV Confessions</strong>
        <p>A moderated, anonymous corner of campus for honest thoughts.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/confessions">Community</Link>
        <Link href="/send">Send</Link>
        <Link href="/about">About</Link>
        <Link href="/community-guidelines">Guidelines</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/report">Report content</Link>
      </nav>
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
      <header className="site-header">
        <Link href="/" className="brand-mark">
          ♛ <b>GGV</b>
        </Link>
        <Link className="nav-cta" href="/send">
          Send a confession
        </Link>
      </header>
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
