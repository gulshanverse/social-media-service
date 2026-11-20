'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Gesture = {
  pointerId?: number;
  startX: number;
  startY: number;
  lastX: number;
  startedAt: number;
  active: boolean;
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
  const [boundaryPages, setBoundaryPages] = useState<Record<number, BrowseState>>({});
  const [related, setRelated] = useState<PublicConfession[] | null>(null);
  const [browseError, setBrowseError] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const navigationLockRef = useRef(false);
  const gestureRef = useRef<Gesture | null>(null);
  const touchGestureRef = useRef<Gesture | null>(null);
  const touchSeenDuringPointerRef = useRef(false);
  const adjacentRequestsRef = useRef(new Map<number, Promise<BrowseState | undefined>>());
  const adjacentGenerationRef = useRef(0);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const wheelGestureRef = useRef({ deltaX: 0, resetTimer: 0 as number | undefined });

  function setTrackOffset(offset: number, animate = false) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    track.style.transform = `translate3d(calc(-33.333333% + ${Math.round(offset)}px), 0, 0)`;
  }

  function resetTrack() {
    setTrackOffset(0, true);
  }

  useEffect(() => {
    navigationLockRef.current = false;
    gestureRef.current = null;
    touchGestureRef.current = null;
    adjacentGenerationRef.current += 1;
    adjacentRequestsRef.current.clear();
    setBoundaryPages({});
    if (settleTimerRef.current !== undefined) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = undefined;
    }
    setTrackOffset(0);
  }, [publicId]);

  useEffect(
    () => () => {
      if (wheelGestureRef.current.resetTimer !== undefined) {
        window.clearTimeout(wheelGestureRef.current.resetTimer);
      }
      if (settleTimerRef.current !== undefined) {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    let timer: number | undefined;
    let visible = true;

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        visible = !visible;
        setShowSwipeHint(visible);
        schedule(visible ? 2000 : 60000);
      }, delay);
    };

    setShowSwipeHint(true);
    schedule(2000);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [publicId]);

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

  const loadAdjacentPage = useCallback(
    (page: number) => {
      if (page < 1 || boundaryPages[page]) return adjacentRequestsRef.current.get(page);
      const existingRequest = adjacentRequestsRef.current.get(page);
      if (existingRequest) return existingRequest;
      const generation = adjacentGenerationRef.current;
      const request = getConfessions({ ...context, page })
        .then((result) => {
          if (generation === adjacentGenerationRef.current) {
            setBoundaryPages((current) => ({ ...current, [page]: result }));
          }
          return result;
        })
        .catch(() => {
          if (generation === adjacentGenerationRef.current) {
            setBrowseError('Browsing is unavailable.');
          }
          return undefined;
        })
        .finally(() => {
          adjacentRequestsRef.current.delete(page);
        });
      adjacentRequestsRef.current.set(page, request);
      return request;
    },
    [boundaryPages, context],
  );

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
  const previousPage = browse && currentIndex === 0 ? boundaryPages[browse.page - 1] : undefined;
  const nextPage =
    browse && currentIndex === browse.items.length - 1 ? boundaryPages[browse.page + 1] : undefined;
  const previousConfession =
    currentIndex > 0 ? browse?.items[currentIndex - 1] : previousPage?.items.at(-1);
  const nextConfession =
    currentIndex >= 0 && browse && currentIndex < browse.items.length - 1
      ? browse.items[currentIndex + 1]
      : nextPage?.items[0];
  const position =
    browse && currentIndex >= 0 ? (browse.page - 1) * browse.limit + currentIndex + 1 : 0;
  const canGoPrevious = Boolean(previousConfession);
  const canGoNext = Boolean(nextConfession);

  const primeBoundaryPages = useCallback(() => {
    if (!browse || currentIndex < 0) return;
    if (currentIndex === 0 && browse.page > 1) void loadAdjacentPage(browse.page - 1);
    if (currentIndex === browse.items.length - 1 && browse.hasMore) {
      void loadAdjacentPage(browse.page + 1);
    }
  }, [browse, currentIndex, loadAdjacentPage]);

  useEffect(() => {
    primeBoundaryPages();
  }, [primeBoundaryPages]);

  function openConfession(nextId: string, nextPage = context.page) {
    const query = contextQuery({ ...context, page: nextPage });
    router.push(`/confessions/${encodeURIComponent(nextId)}${query ? `?${query}` : ''}`);
  }

  function navigate(direction: -1 | 1, settle = false) {
    if (!browse || navigationLockRef.current) return;
    navigationLockRef.current = true;
    if (currentIndex >= 0) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < browse.items.length) {
        const nextId = browse.items[nextIndex].publicId;
        if (settle) {
          const width = viewportRef.current?.clientWidth ?? window.innerWidth;
          setTrackOffset(direction > 0 ? -width : width, true);
          settleTimerRef.current = window.setTimeout(() => {
            settleTimerRef.current = undefined;
            openConfession(nextId, browse.page);
          }, 360);
        } else {
          openConfession(nextId, browse.page);
        }
        return;
      }
      const targetPage = browse.page + direction;
      const boundary = direction > 0 ? nextPage?.items[0] : previousPage?.items.at(-1);
      if (!boundary) {
        navigationLockRef.current = false;
        return;
      }
      if (settle) {
        const width = viewportRef.current?.clientWidth ?? window.innerWidth;
        setTrackOffset(direction > 0 ? -width : width, true);
        settleTimerRef.current = window.setTimeout(() => {
          settleTimerRef.current = undefined;
          openConfession(boundary.publicId, targetPage);
        }, 360);
      } else {
        openConfession(boundary.publicId, targetPage);
      }
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

  function canDrag(direction: -1 | 1) {
    return direction > 0 ? Boolean(nextConfession) : Boolean(previousConfession);
  }

  function updateDrag(
    gesture: Gesture,
    clientX: number,
    clientY: number,
    event?: { preventDefault(): void },
  ) {
    if (!gesture.active) return;
    const deltaX = clientX - gesture.startX;
    const deltaY = clientY - gesture.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      gesture.active = false;
      resetTrack();
      return;
    }
    if (Math.abs(deltaX) <= 8 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const direction = deltaX < 0 ? 1 : -1;
    if (!canDrag(direction)) {
      const resistance = deltaX * 0.18;
      setTrackOffset(resistance);
    } else {
      setTrackOffset(deltaX);
    }
    gesture.lastX = clientX;
    event?.preventDefault();
  }

  function finishDrag(gesture: Gesture, clientX: number, clientY: number) {
    if (!gesture.active) return;
    const deltaX = clientX - gesture.startX;
    const deltaY = clientY - gesture.startY;
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const velocity = Math.abs(deltaX) / elapsed;
    const direction = deltaX < 0 ? 1 : -1;
    const shouldNavigate =
      Math.abs(deltaX) >= Math.max(56, (viewportRef.current?.clientWidth ?? 360) * 0.2) ||
      (elapsed >= 40 && velocity > 0.55);
    gesture.active = false;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || !shouldNavigate || !canDrag(direction)) {
      resetTrack();
      return;
    }
    navigate(direction, true);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (
      event.isPrimary === false ||
      event.pointerType === 'mouse' ||
      isInteractiveTarget(event.target)
    ) {
      gestureRef.current = null;
      touchGestureRef.current = null;
      touchSeenDuringPointerRef.current = false;
      return;
    }
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      startedAt: performance.now(),
      active: true,
    };
    touchSeenDuringPointerRef.current = false;
    primeBoundaryPages();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    updateDrag(gesture, event.clientX, event.clientY, event);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (touchSeenDuringPointerRef.current) {
      gestureRef.current = null;
      return;
    }
    gestureRef.current = null;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    finishDrag(gesture, event.clientX, event.clientY);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch || isInteractiveTarget(event.target)) {
      gestureRef.current = null;
      touchGestureRef.current = null;
      touchSeenDuringPointerRef.current = false;
      return;
    }
    touchSeenDuringPointerRef.current = gestureRef.current !== null;
    touchGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      startedAt: performance.now(),
      active: true,
    };
    primeBoundaryPages();
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    const gesture = touchGestureRef.current;
    const touch = event.touches[0];
    if (!gesture || !touch) return;
    updateDrag(gesture, touch.clientX, touch.clientY, event);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const gesture = touchGestureRef.current;
    const touch = event.changedTouches[0];
    gestureRef.current = null;
    touchGestureRef.current = null;
    touchSeenDuringPointerRef.current = false;
    if (!gesture || !touch) return;
    finishDrag(gesture, touch.clientX, touch.clientY);
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
      className="site-shell confession-detail-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        gestureRef.current = null;
        if (!touchSeenDuringPointerRef.current) {
          touchGestureRef.current = null;
          resetTrack();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        gestureRef.current = null;
        touchGestureRef.current = null;
        touchSeenDuringPointerRef.current = false;
        resetTrack();
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
            <div
              className="detail-carousel"
              ref={viewportRef}
              aria-label="Swipe between confessions"
            >
              <div className="detail-carousel__track" ref={trackRef}>
                <div className="detail-carousel__slide" aria-hidden={!previousConfession}>
                  {previousConfession ? (
                    <ConfessionCard confession={previousConfession} detailed />
                  ) : null}
                </div>
                <div className="detail-carousel__slide" data-testid="current-confession-slide">
                  <ConfessionCard confession={confession} detailed />
                </div>
                <div className="detail-carousel__slide" aria-hidden={!nextConfession}>
                  {nextConfession ? <ConfessionCard confession={nextConfession} detailed /> : null}
                </div>
              </div>
              <p
                className="detail-carousel__hint"
                data-visible={showSwipeHint}
                aria-hidden={!showSwipeHint}
              >
                <span>←</span> Swipe to explore <span>→</span>
              </p>
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
