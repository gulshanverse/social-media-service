import Link from 'next/link';

export default function ConfessionNotFound() {
  return (
    <main className="site-shell">
      <section className="detail-page">
        <Link className="back-link" href="/confessions">
          ← Back to community
        </Link>
        <section className="state-panel">
          <div className="empty-orb">?</div>
          <h1>That confession is unavailable.</h1>
          <p>It may still be pending review, archived, or no longer public.</p>
          <Link className="ggv-button" href="/confessions">
            Back to the wall
          </Link>
        </section>
      </section>
    </main>
  );
}
