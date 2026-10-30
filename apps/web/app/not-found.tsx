import type { Metadata } from 'next';
import Link from 'next/link';
import { unavailablePageMetadata } from '../lib/metadata';

export const metadata: Metadata = unavailablePageMetadata({
  title: 'Page Not Found',
  description: 'This page could not be found on College Confession.',
});

export default function NotFound() {
  return (
    <main className="site-shell">
      <section className="detail-page">
        <section className="state-panel" aria-labelledby="not-found-title">
          <h1 id="not-found-title">This page could not be found.</h1>
          <p>It may have moved or is no longer available.</p>
          <div className="home-actions">
            <Link className="home-button" href="/">
              Go to homepage
            </Link>
            <Link className="home-button home-button--secondary" href="/confessions">
              Explore confessions
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
