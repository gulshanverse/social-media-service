'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicConfession } from '@ggv/types';
import { ConfessionCard } from '../../../components/ConfessionCard';
import { ShareMenu } from '../../../components/ShareMenu';
import { getConfession } from '../../../lib/api';

export default function ConfessionDetailClient({ publicId }: { publicId: string }) {
  const [confession, setConfession] = useState<PublicConfession | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getConfession(publicId)
      .then(setConfession)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Confession not found.'),
      );
  }, [publicId]);
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand-mark">
          ♛ <b>COLLEGE CONFESSION</b>
        </Link>
        <Link className="back-link" href="/confessions">
          ← Back to community
        </Link>
      </header>
      <section className="detail-page">
        {error ? (
          <section className="state-panel">
            <div className="empty-orb">?</div>
            <h1>That confession is unavailable.</h1>
            <p>It may still be pending review, archived, or no longer public.</p>
            <Link className="ggv-button" href="/confessions">
              Back to the wall
            </Link>
          </section>
        ) : !confession ? (
          <div className="detail-loading">Loading confession…</div>
        ) : (
          <>
            <p className="eyebrow">COLLEGE CONFESSION</p>
            <div className="detail-card">
              <ConfessionCard confession={confession} detailed />
            </div>
            <div className="detail-actions">
              <span>
                {confession.category?.replace('_', ' ') ?? 'CAMPUS THOUGHT'} ·{' '}
                {new Date(confession.publishedAt).toLocaleDateString()}
              </span>
              <ShareMenu
                url={
                  typeof window === 'undefined'
                    ? `https://www.confessions.live/confessions/${publicId}`
                    : window.location.href
                }
                title="College Confession"
              />
              <Link
                className="back-link"
                href={`/report?confession=${encodeURIComponent(publicId)}`}
              >
                Report this
              </Link>
            </div>
            <div className="detail-cta">
              <h2>Have something to say?</h2>
              <Link className="ggv-button" href="/send">
                Share your own anonymous confession
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
