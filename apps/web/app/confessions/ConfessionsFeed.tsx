'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicConfessionPage } from '@ggv/types';
import { ConfessionCard } from '../../components/ConfessionCard';
import { getConfessions } from '../../lib/api';

type ConfessionsFeedProps = {
  page: number;
};

export default function ConfessionsFeed({ page }: ConfessionsFeedProps) {
  const [data, setData] = useState<PublicConfessionPage | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    setError('');
    getConfessions(page)
      .then(setData)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Could not load confessions.'),
      );
  }, [page]);
  return (
    <main className="site-shell">
      <section className="feed-heading">
        <div>
          <p className="eyebrow">THE CAMPUS WALL</p>
          <h1>
            Confessions from
            <br />
            <span>your people.</span>
          </h1>
        </div>
        <p>Anonymous thoughts, reviewed and shared with the community.</p>
      </section>
      {error ? (
        <section className="state-panel">
          <h2>Couldn’t load the wall.</h2>
          <p>{error}</p>
          <button className="ggv-button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      ) : !data ? (
        <section className="card-grid">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-card" key={item} />
          ))}
        </section>
      ) : data.items.length === 0 ? (
        <section className="state-panel">
          <div className="empty-orb">✦</div>
          <h2>The wall is quiet… for now.</h2>
          <p>Be the first to leave an anonymous thought for campus.</p>
          <Link className="ggv-button" href="/send">
            Start the conversation
          </Link>
        </section>
      ) : (
        <>
          <section className="card-grid">
            {data.items.map((item) => (
              <ConfessionCard key={item.publicId} confession={item} display={data.display} />
            ))}
          </section>
          {data.hasMore && (
            <div className="centered">
              <Link className="ghost-button" href={`/confessions?page=${page + 1}`}>
                Load more confessions
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
