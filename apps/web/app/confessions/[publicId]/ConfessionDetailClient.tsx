'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicConfession } from '@ggv/types';
import { ConfessionCard } from '../../../components/ConfessionCard';
import { getConfession } from '../../../lib/api';
import DiscussionSection from './DiscussionSection';

export default function ConfessionDetailClient({
  publicId,
  initialConfession,
}: {
  publicId: string;
  initialConfession?: PublicConfession;
}) {
  const [confession, setConfession] = useState<PublicConfession | null>(initialConfession ?? null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (initialConfession) return;
    getConfession(publicId)
      .then(setConfession)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Confession not found.'),
      );
  }, [initialConfession, publicId]);
  return (
    <main className="site-shell">
      <section className="detail-page">
        <Link className="back-link" href="/confessions">
          ← Back to community
        </Link>
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
            <DiscussionSection publicId={publicId} confession={confession} />
          </>
        )}
      </section>
    </main>
  );
}
