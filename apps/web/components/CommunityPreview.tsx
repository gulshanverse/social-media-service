'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicConfessionPage } from '@ggv/types';
import { ConfessionCard } from './ConfessionCard';
import { getConfessions } from '../lib/api';

export function CommunityPreview() {
  const [data, setData] = useState<PublicConfessionPage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getConfessions(1)
      .then(setData)
      .catch(() => setError(true));
  }, []);

  return (
    <section className="home-section home-community" aria-labelledby="community-preview-title">
      <div className="home-section-heading">
        <div>
          <p className="home-eyebrow">FROM THE COMMUNITY</p>
          <h2 id="community-preview-title">A little of what campus is saying.</h2>
        </div>
        <Link className="home-text-link" href="/confessions">
          Explore all confessions <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {error ? (
        <div className="home-state" role="status">
          <strong>The community wall is taking a pause.</strong>
          <p>Explore the full community page when you’re ready.</p>
          <Link className="home-button home-button--secondary" href="/confessions">
            Open confessions
          </Link>
        </div>
      ) : !data ? (
        <div className="home-preview-grid" aria-label="Loading community preview" aria-busy="true">
          <div className="home-skeleton" />
          <div className="home-skeleton" />
          <div className="home-skeleton" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="home-state" role="status">
          <strong>The wall is ready for its first thought.</strong>
          <p>Share something kind, useful, or unmistakably yours.</p>
          <Link className="home-button" href="/send">
            Send a confession
          </Link>
        </div>
      ) : (
        <div className="home-preview-grid">
          {data.items.slice(0, 3).map((confession) => (
            <ConfessionCard
              key={confession.publicId}
              confession={confession}
              display={data.display}
            />
          ))}
        </div>
      )}
    </section>
  );
}
