'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const navigationLockRef = useRef(false);
  const pointerGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const wheelGestureRef = useRef({ deltaX: 0, resetTimer: 0 as number | undefined });

  useEffect(() => {
    navigationLockRef.current = false;
  }, [publicId]);

  useEffect(
    () => () => {
      if (wheelGestureRef.current.resetTimer !== undefined) {
        window.clearTimeout(wheelGestureRef.current.resetTimer);
      }
    },
    [],
  );

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
    if (!browse || navigationLockRef.current) return;
    navigationLockRef.current = true;
    if (currentIndex >= 0) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < browse.items.length) {
        openConfession(browse.items[nextIndex].publicId);
        return;
      }
      const nextPage = browse.page + direction;
      if (direction > 0 && browse.hasMore) {
        getConfessions({ ...context, page: nextPage })
          .then((result) => {
            setBrowse(result);
            const next = result.items[0];
            if (next) openConfession(next.publicId, nextPage);
          })
          .catch(() => setBrowseError('Browsing is unavailable.'))
          .finally(() => {
            navigationLockRef.current = false;
          });
      } else if (direction < 0 && browse.page > 1) {
        getConfessions({ ...context, page: nextPage })
          .then((result) => {
            setBrowse(result);
            const next = result.items[result.items.length - 1];
            if (next) openConfession(next.publicId, nextPage);
          })
          .catch(() => setBrowseError('Browsing is unavailable.'))
          .finally(() => {
            navigationLockRef.current = false;
          });
      } else {
        navigationLockRef.current = false;
      }
      return;
    }
    if (direction > 0 && browse.hasMore) {
      getConfessions({ ...context, page: browse.page + 1 })
        .then((result) => setBrowse(result))
        .catch(() => setBrowseError('Browsing is unavailable.'))
        .finally(() => {
          navigationLockRef.current = false;
        });
      return;
    }
    navigationLockRef.current = false;
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          'a, button, input, textarea, select, option, [role="button"], [contenteditable="true"], [data-no-confession-swipe]',
        ),
      )
    );
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (
      event.isPrimary === false ||
      event.pointerType === 'mouse' ||
      isInteractiveTarget(event.target)
    ) {
      pointerGestureRef.current = null;
      return;
    }
    pointerGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: true,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !gesture.active) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      gesture.active = false;
      return;
    }
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) event.preventDefault();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const gesture = pointerGestureRef.current;
    pointerGestureRef.current = null;
    if (!gesture || gesture.pointerId !== event.pointerId || !gesture.active) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    navigate(deltaX < 0 ? 1 : -1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch || isInteractiveTarget(event.target)) {
      pointerGestureRef.current = null;
      return;
    }
    pointerGestureRef.current = {
      pointerId: -1,
      startX: touch.clientX,
      startY: touch.clientY,
      active: true,
    };
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    const gesture = pointerGestureRef.current;
    const touch = event.touches[0];
    if (!gesture || gesture.pointerId !== -1 || !touch || !gesture.active) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      gesture.active = false;
      return;
    }
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) event.preventDefault();
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const gesture = pointerGestureRef.current;
    const touch = event.changedTouches[0];
    pointerGestureRef.current = null;
    if (!gesture || gesture.pointerId !== -1 || !touch || !gesture.active) return;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    navigate(deltaX < 0 ? 1 : -1);
  }

  function handleWheel(event: React.WheelEvent<HTMLElement>) {
    if (isInteractiveTarget(event.target) || Math.abs(event.deltaX) <= Math.abs(event.deltaY))
      return;
    wheelGestureRef.current.deltaX += event.deltaX;
    if (wheelGestureRef.current.resetTimer !== undefined) {
      window.clearTimeout(wheelGestureRef.current.resetTimer);
    }
    wheelGestureRef.current.resetTimer = window.setTimeout(() => {
      wheelGestureRef.current.deltaX = 0;
      wheelGestureRef.current.resetTimer = undefined;
    }, 180);
    if (Math.abs(wheelGestureRef.current.deltaX) < 72) return;
    event.preventDefault();
    const direction = wheelGestureRef.current.deltaX < 0 ? 1 : -1;
    wheelGestureRef.current.deltaX = 0;
    navigate(direction);
  }

  return (
    <main
      className="site-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerGestureRef.current = null;
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        pointerGestureRef.current = null;
      }}
      onWheel={handleWheel}
    >
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
