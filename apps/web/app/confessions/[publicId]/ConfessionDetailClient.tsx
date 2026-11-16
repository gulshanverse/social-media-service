'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { PublicConfession } from '@ggv/types';
import { ConfessionCard } from '../../../components/ConfessionCard';
import { getConfession, getConfessions, type ConfessionFeedQuery } from '../../../lib/api';
import DiscussionSection from './DiscussionSection';

type DetailContext = ConfessionFeedQuery & { page: number };

type BrowseState = {
  items: PublicConfession[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function readContext(): DetailContext {
  if (typeof window === 'undefined') return { page: 1, sort: 'newest', dateRange: 'all' };
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page') ?? '1');
  const sort = params.get('sort');
  const dateRange = params.get('dateRange');
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    search: params.get('search') || undefined,
    category: params.get('category') || undefined,
    customCategory: params.get('customCategory') || undefined,
    dateRange:
      dateRange === 'today' || dateRange === '7d' || dateRange === '30d' || dateRange === 'custom'
        ? dateRange
        : 'all',
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    sort: sort === 'oldest' || sort === 'relevance' ? sort : 'newest',
  };
}

function contextQuery(context: DetailContext) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value && value !== 'all' && !(key === 'page' && value === 1))
      params.set(key, String(value));
  }
  return params.toString();
}

export default function ConfessionDetailClient({
  publicId,
  initialConfession,
}: {
  publicId: string;
  initialConfession?: PublicConfession;
}) {
  const router = useRouter();
  const [confession, setConfession] = useState<PublicConfession | null>(initialConfession ?? null);
  const [error, setError] = useState('');
  const [context, setContext] = useState<DetailContext>(() => readContext());
  const [browse, setBrowse] = useState<BrowseState | null>(null);
  const [related, setRelated] = useState<PublicConfession[] | null>(null);
  const [browseError, setBrowseError] = useState('');

  useEffect(() => {
    if (initialConfession) return;
    getConfession(publicId)
      .then(setConfession)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Confession not found.'),
      );
  }, [initialConfession, publicId]);

  useEffect(() => {
    const nextContext = readContext();
    setContext(nextContext);
    setBrowse(null);
    setBrowseError('');
    getConfessions(nextContext)
      .then((result) => setBrowse(result))
      .catch((caught) =>
        setBrowseError(caught instanceof Error ? caught.message : 'Browsing is unavailable.'),
      );
  }, [publicId]);

  useEffect(() => {
    if (!confession) return;
    const relatedQuery: ConfessionFeedQuery = {
      page: 1,
      limit: 4,
      sort: 'newest',
      ...(confession.category ? { category: confession.category } : {}),
      ...(confession.customCategory ? { customCategory: confession.customCategory } : {}),
    };
    getConfessions(relatedQuery)
      .then((result) =>
        setRelated(result.items.filter((item) => item.publicId !== publicId).slice(0, 3)),
      )
      .catch(() => setRelated([]));
  }, [confession, publicId]);

  const currentIndex = useMemo(
    () => browse?.items.findIndex((item) => item.publicId === publicId) ?? -1,
    [browse, publicId],
  );
  const position =
    browse && currentIndex >= 0 ? (browse.page - 1) * browse.limit + currentIndex + 1 : 0;
  const canGoPrevious = currentIndex > 0 || Boolean(browse && browse.page > 1);
  const canGoNext = Boolean(
    browse &&
    (currentIndex >= 0 ? currentIndex < browse.items.length - 1 || browse.hasMore : browse.hasMore),
  );

  function openConfession(nextId: string, nextPage = context.page) {
    const query = contextQuery({ ...context, page: nextPage });
    router.push(`/confessions/${encodeURIComponent(nextId)}${query ? `?${query}` : ''}`);
  }

  function navigate(direction: -1 | 1) {
    if (!browse) return;
    if (currentIndex >= 0) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < browse.items.length) {
        openConfession(browse.items[nextIndex].publicId);
        return;
      }
      const nextPage = browse.page + direction;
      if (direction > 0 && browse.hasMore) {
        getConfessions({ ...context, page: nextPage }).then((result) => {
          setBrowse(result);
          const next = result.items[0];
          if (next) openConfession(next.publicId, nextPage);
        });
      } else if (direction < 0 && browse.page > 1) {
        getConfessions({ ...context, page: nextPage }).then((result) => {
          setBrowse(result);
          const next = result.items[result.items.length - 1];
          if (next) openConfession(next.publicId, nextPage);
        });
      }
      return;
    }
    if (direction > 0 && browse.hasMore) {
      getConfessions({ ...context, page: browse.page + 1 }).then((result) => setBrowse(result));
    }
  }

  return (
    <main className="site-shell">
      <section className="detail-page">
        <header className="detail-header">
          <Link className="back-link" href="/confessions">
            ← Back to community
          </Link>
          <div className="detail-header__context">
            <p className="eyebrow">COLLEGE CONFESSION</p>
            <span>Community detail</span>
          </div>
        </header>
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
            <nav className="detail-browse" aria-label="Confession navigation">
              <button type="button" onClick={() => navigate(-1)} disabled={!canGoPrevious}>
                <span aria-hidden="true">‹</span> Previous
              </button>
              <span aria-live="polite">
                {position ? `${position} / ${browse?.total ?? '—'}` : 'Current confession'}
              </span>
              <button type="button" onClick={() => navigate(1)} disabled={!canGoNext}>
                Next <span aria-hidden="true">›</span>
              </button>
            </nav>
            {browseError && (
              <p className="detail-browse__error" role="status">
                {browseError}
              </p>
            )}
            <div className="detail-card">
              <ConfessionCard confession={confession} detailed />
            </div>
            <DiscussionSection publicId={publicId} confession={confession} />
            <section className="related-confessions" aria-labelledby="related-confessions-heading">
              <div className="related-confessions__heading">
                <div>
                  <p className="eyebrow">KEEP EXPLORING</p>
                  <h2 id="related-confessions-heading">Related confessions</h2>
                </div>
                <Link href="/confessions">
                  View more <span aria-hidden="true">↗</span>
                </Link>
              </div>
              {related === null ? (
                <div className="related-confessions__state" aria-busy="true">
                  Loading more from the wall…
                </div>
              ) : related.length === 0 ? (
                <div className="related-confessions__state">No related confessions yet.</div>
              ) : (
                <div className="related-confessions__grid">
                  {related.map((item) => (
                    <ConfessionCard key={item.publicId} confession={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
