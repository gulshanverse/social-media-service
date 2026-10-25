'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicConfessionPage } from '@ggv/types';
import { allConfessionCategories } from '@ggv/types';
import { ConfessionCard } from '../../components/ConfessionCard';
import { type ConfessionFeedQuery, getConfessions } from '../../lib/api';

type Props = { initialQuery: ConfessionFeedQuery };
type DateRange = NonNullable<ConfessionFeedQuery['dateRange']>;
type HistoryMode = 'push' | 'replace';
type ServiceSlide = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  href?: string;
};

type PageItem = number | 'ellipsis';

const categoryLabels: Record<string, string> = {
  CRUSH: 'Crush',
  ADMIRATION: 'Admiration',
  RELATIONSHIP: 'Relationship',
  FRIENDSHIP: 'Friendship',
  FUNNY: 'Funny',
  COLLEGE_LIFE: 'College life',
  APPRECIATION: 'Appreciation',
  ADVICE: 'Advice',
  RANT: 'Rant',
  CUSTOM: 'Custom',
  OTHER: 'Other',
};

const categoryIcons: Record<string, string> = {
  ALL: '✦',
  CRUSH: '♡',
  ADMIRATION: '✧',
  RELATIONSHIP: '↗',
  FRIENDSHIP: '♧',
  FUNNY: '☺',
  COLLEGE_LIFE: '⌂',
  APPRECIATION: '★',
  ADVICE: '?',
  RANT: '!',
  CUSTOM: '⌁',
  OTHER: '•',
};

const categoryAccents: Record<string, string> = {
  ALL: 'pink',
  CRUSH: 'rose',
  ADMIRATION: 'lilac',
  RELATIONSHIP: 'peach',
  FRIENDSHIP: 'sky',
  FUNNY: 'mint',
  COLLEGE_LIFE: 'amber',
  APPRECIATION: 'lemon',
  ADVICE: 'blue',
  RANT: 'coral',
  CUSTOM: 'violet',
  OTHER: 'slate',
};

const serviceSlides: ServiceSlide[] = [
  {
    id: 'vibematch',
    title: 'VibeMatch',
    description: 'Meet your campus vibe.',
    icon: '◌',
    accent: 'pink',
    href: '/vibematch',
  },
  {
    id: 'garba',
    title: 'Campus Garba',
    description: 'Celebrate together.',
    icon: '✺',
    accent: 'amber',
    href: '/garba',
  },
  {
    id: 'rentals',
    title: 'Rentals & Finds',
    description: 'Student essentials, made easier.',
    icon: '＋',
    accent: 'cyan',
  },
];

const defaultQuery: ConfessionFeedQuery = { page: 1, dateRange: 'all', sort: 'newest' };

function label(value?: string) {
  return value ? (categoryLabels[value] ?? value) : '';
}

function queryString(query: ConfessionFeedQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && value !== 'all' && value !== 1) params.set(key, String(value));
  }
  return params.toString();
}

function pageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  const ordered = [...pages].filter((page) => page > 0 && page <= totalPages).sort((a, b) => a - b);
  return ordered.flatMap((page, index) => [
    ...(index > 0 && page - ordered[index - 1] > 1 ? (['ellipsis'] as const) : []),
    page,
  ]);
}

export default function ConfessionsFeed({ initialQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    page: initialPage,
    search: initialSearch,
    category: initialCategory,
    customCategory: initialCustomCategory,
    dateRange: initialDateRange,
    startDate: initialStartDate,
    endDate: initialEndDate,
    sort: initialSort,
  } = initialQuery;
  const [query, setQuery] = useState<ConfessionFeedQuery>({ ...defaultQuery, ...initialQuery });
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const [data, setData] = useState<PublicConfessionPage | null>(null);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState({ ...defaultQuery, ...initialQuery });
  const [serviceIndex, setServiceIndex] = useState(0);
  const requestId = useRef(0);
  const serviceTrack = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);
  const serviceDragged = useRef(false);

  const navigate = useCallback(
    (nextQuery: ConfessionFeedQuery, mode: HistoryMode = 'push') => {
      const next = { ...defaultQuery, ...nextQuery };
      setQuery(next);
      const search = queryString(next);
      const href = search ? `${pathname}?${search}` : pathname;
      if (mode === 'replace') router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;
    if (nextSearch === query.search) return;
    const timer = window.setTimeout(() => {
      navigate(
        {
          ...query,
          search: nextSearch,
          page: 1,
          sort: nextSearch ? query.sort : query.sort === 'relevance' ? 'newest' : query.sort,
        },
        'replace',
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [navigate, query, query.search, searchInput]);

  useEffect(() => {
    const nextInitialQuery = {
      ...defaultQuery,
      page: initialPage,
      search: initialSearch,
      category: initialCategory,
      customCategory: initialCustomCategory,
      dateRange: initialDateRange,
      startDate: initialStartDate,
      endDate: initialEndDate,
      sort: initialSort,
    };
    setQuery(nextInitialQuery);
    setSearchInput(initialSearch ?? '');
    setDraft(nextInitialQuery);
  }, [
    initialCategory,
    initialCustomCategory,
    initialDateRange,
    initialEndDate,
    initialPage,
    initialSearch,
    initialSort,
    initialStartDate,
  ]);

  useEffect(() => {
    const id = ++requestId.current;
    setData(null);
    setError('');
    getConfessions(query)
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((caught) => {
        if (id === requestId.current)
          setError(caught instanceof Error ? caught.message : 'Could not load confessions.');
      });
  }, [query]);

  useEffect(() => {
    if (sheetOpen) setDraft(query);
  }, [sheetOpen, query]);

  const activeFilters = useMemo(
    () =>
      [
        query.category && { key: 'category', text: label(query.category) },
        query.customCategory && { key: 'customCategory', text: `Topic: ${query.customCategory}` },
        query.dateRange &&
          query.dateRange !== 'all' && {
            key: 'dateRange',
            text:
              query.dateRange === 'custom'
                ? `${query.startDate} – ${query.endDate}`
                : query.dateRange === 'today'
                  ? 'Today'
                  : `Last ${query.dateRange.replace('d', ' days')}`,
          },
      ].filter(Boolean) as { key: keyof ConfessionFeedQuery; text: string }[],
    [query],
  );

  const clearAll = () => {
    setSearchInput('');
    navigate({ ...defaultQuery });
    setSortOpen(false);
  };

  const removeFilter = (key: keyof ConfessionFeedQuery) =>
    navigate({
      ...query,
      [key]: undefined,
      ...(key === 'dateRange'
        ? { dateRange: 'all', startDate: undefined, endDate: undefined }
        : {}),
      page: 1,
    });

  const retry = () => setQuery((current) => ({ ...current }));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const firstResult = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const lastResult = data ? Math.min(data.page * data.limit, data.total) : 0;

  const selectService = (index: number) => {
    setServiceIndex(index);
    serviceTrack.current?.scrollTo({
      left: index * (serviceTrack.current.clientWidth || 1),
      behavior: 'smooth',
    });
  };

  return (
    <main className="site-shell">
      <section className="feed-heading">
        <div>
          <p className="eyebrow">THE CAMPUS HUB</p>
          <h1 aria-label="Your campus. Your people.">
            Your campus.
            <br />
            <span>Your people.</span>
          </h1>
        </div>
        <p>Confessions, connections and campus life.</p>
      </section>

      <section className="featured-services" aria-label="Featured campus services">
        <div
          className="featured-services__track"
          ref={serviceTrack}
          onScroll={(event) => {
            const track = event.currentTarget;
            const nextIndex = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
            if (nextIndex !== serviceIndex) setServiceIndex(nextIndex);
          }}
          onPointerDown={(event) => {
            pointerStart.current = event.clientX;
            serviceDragged.current = false;
          }}
          onPointerMove={(event) => {
            if (pointerStart.current !== null && Math.abs(event.clientX - pointerStart.current) > 8)
              serviceDragged.current = true;
          }}
          onPointerUp={() => {
            pointerStart.current = null;
          }}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
        >
          {serviceSlides.map((slide) => {
            const content = (
              <>
                <span className="featured-service__icon" aria-hidden="true">
                  {slide.icon}
                </span>
                <span>
                  <strong>{slide.title}</strong>
                  <small>{slide.description}</small>
                </span>
                {!slide.href && <em>Coming soon</em>}
                {slide.href && (
                  <span className="featured-service__arrow" aria-hidden="true">
                    ↗
                  </span>
                )}
              </>
            );
            return slide.href ? (
              <Link
                className={`featured-service featured-service--${slide.accent}`}
                href={slide.href}
                key={slide.id}
                onClick={(event) => {
                  if (serviceDragged.current) event.preventDefault();
                }}
              >
                {content}
              </Link>
            ) : (
              <div className={`featured-service featured-service--${slide.accent}`} key={slide.id}>
                {content}
              </div>
            );
          })}
        </div>
        <div className="featured-services__dots" aria-label="Featured service slides">
          {serviceSlides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              className={index === serviceIndex ? 'is-active' : ''}
              aria-label={`Show ${slide.title}`}
              aria-current={index === serviceIndex ? 'true' : undefined}
              onClick={() => selectService(index)}
            />
          ))}
        </div>
      </section>

      <section className="discovery-controls" aria-label="Find confessions">
        <div className="search-row">
          <div className="search-field">
            <span className="search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="10.8" cy="10.8" r="6.2" />
                <path d="m16 16 4.3 4.3" />
              </svg>
            </span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search confessions…"
              aria-label="Search confessions"
            />
            {searchInput && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            className="filter-button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
          >
            <svg className="filter-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 6h16M7 12h10M10 18h4" />
              <circle cx="8" cy="6" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
            <span>Filter</span>
          </button>
        </div>
        <div className="category-scroller-wrap">
          <div className="category-scroller" aria-label="Categories">
            {['ALL', ...allConfessionCategories].map((category) => {
              const selected = category === 'ALL' ? !query.category : query.category === category;
              return (
                <button
                  type="button"
                  key={category}
                  aria-pressed={selected}
                  className={`category-tile category-tile--${categoryAccents[category]} ${selected ? 'category-tile--active' : ''}`}
                  onClick={() =>
                    navigate({
                      ...query,
                      category: category === 'ALL' ? undefined : category,
                      page: 1,
                    })
                  }
                >
                  <span className="category-tile__icon" aria-hidden="true">
                    {categoryIcons[category]}
                  </span>
                  <small>{category === 'ALL' ? 'All' : label(category)}</small>
                </button>
              );
            })}
          </div>
        </div>
        {!!activeFilters.length && (
          <div className="active-filters" aria-label="Active filters">
            {activeFilters.map((filter) => (
              <button
                type="button"
                className="filter-chip"
                key={filter.key}
                onClick={() => removeFilter(filter.key)}
              >
                {filter.text} ×
              </button>
            ))}
            <button type="button" className="clear-all" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </section>

      <div className="feed-toolbar">
        <div>
          <h2>Recent confessions</h2>
          {data && (
            <p className="result-summary">
              Showing {firstResult}–{lastResult} of {data.total} results
            </p>
          )}
        </div>
        <div className="sort-wrap">
          <button
            type="button"
            className="sort-button"
            onClick={() => setSortOpen((open) => !open)}
            aria-expanded={sortOpen}
            aria-label={`Sort confessions: ${query.sort === 'oldest' ? 'Oldest' : query.sort === 'relevance' ? 'Relevance' : 'Newest'}`}
          >
            <svg className="sort-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M7 5v14M7 5 4.5 7.5M7 5l2.5 2.5M17 19V5m0 14 2.5-2.5M17 19l-2.5-2.5" />
            </svg>
            <span>
              {query.sort === 'oldest'
                ? 'Oldest'
                : query.sort === 'relevance'
                  ? 'Relevance'
                  : 'Newest'}
            </span>
            <span className="sort-chevron" aria-hidden="true">
              ⌄
            </span>
          </button>
          {sortOpen && (
            <div className="sort-popup" role="menu">
              {(
                ['newest', 'oldest', ...(query.search ? ['relevance'] : [])] as Array<
                  NonNullable<ConfessionFeedQuery['sort']>
                >
              ).map((sort) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={query.sort === sort}
                  key={sort}
                  onClick={() => {
                    navigate({ ...query, sort, page: 1 });
                    setSortOpen(false);
                  }}
                >
                  {sort === 'newest'
                    ? 'Newest first'
                    : sort === 'oldest'
                      ? 'Oldest first'
                      : 'Relevance'}
                  {query.sort === sort && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <section className="state-panel feed-error-state">
          <h2>Couldn’t load the wall.</h2>
          <p>{error}</p>
          <button className="ggv-button" onClick={retry}>
            Try again
          </button>
        </section>
      ) : !data ? (
        <section className="card-grid" aria-busy="true" aria-label="Loading confessions">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-card" key={item} />
          ))}
        </section>
      ) : data.items.length === 0 ? (
        <section className="state-panel">
          <div className="empty-orb">✦</div>
          <h2>No confessions found.</h2>
          <p>Try a different keyword or clear a filter to explore the wall.</p>
          <button className="ghost-button" onClick={clearAll}>
            Clear filters
          </button>
        </section>
      ) : (
        <>
          <section className="card-grid">
            {data.items.map((item) => (
              <ConfessionCard key={item.publicId} confession={item} display={data.display} />
            ))}
          </section>
          <nav className="feed-pagination" aria-label="Confession pages">
            <button
              type="button"
              className="pagination-button"
              disabled={data.page <= 1}
              onClick={() => navigate({ ...query, page: data.page - 1 })}
            >
              Previous
            </button>
            <div className="pagination-pages">
              {pageItems(data.page, totalPages).map((item, index) =>
                item === 'ellipsis' ? (
                  <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`pagination-button pagination-number ${item === data.page ? 'is-current' : ''}`}
                    aria-current={item === data.page ? 'page' : undefined}
                    key={item}
                    onClick={() => navigate({ ...query, page: item })}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              className="pagination-button"
              disabled={!data.hasMore}
              onClick={() => navigate({ ...query, page: data.page + 1 })}
            >
              Next
            </button>
          </nav>
        </>
      )}

      {sheetOpen && (
        <div
          className="filter-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSheetOpen(false);
          }}
        >
          <section
            className="filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <h2 id="filter-title">Filter confessions</h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters">
                ×
              </button>
            </div>
            <label>
              Category
              <select
                value={draft.category ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value || undefined })
                }
              >
                <option value="">All categories</option>
                {allConfessionCategories.map((item) => (
                  <option key={item} value={item}>
                    {label(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Custom topic
              <input
                value={draft.customCategory ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, customCategory: event.target.value || undefined })
                }
                placeholder="Search a custom topic"
              />
            </label>
            <fieldset>
              <legend>Date range</legend>
              {(['all', 'today', '7d', '30d', 'custom'] as DateRange[]).map((range) => (
                <label className="radio-row" key={range}>
                  <input
                    type="radio"
                    name="date-range"
                    checked={(draft.dateRange ?? 'all') === range}
                    onChange={() => setDraft({ ...draft, dateRange: range })}
                  />
                  {range === 'all'
                    ? 'All time'
                    : range === 'today'
                      ? 'Today'
                      : range === '7d'
                        ? 'Last 7 days'
                        : range === '30d'
                          ? 'Last 30 days'
                          : 'Custom date range'}
                </label>
              ))}
              {draft.dateRange === 'custom' && (
                <div className="date-row">
                  <input
                    type="date"
                    value={draft.startDate ?? ''}
                    onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                    aria-label="Start date"
                  />
                  <input
                    type="date"
                    value={draft.endDate ?? ''}
                    onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                    aria-label="End date"
                  />
                </div>
              )}
            </fieldset>
            <label>
              Sort
              <select
                value={draft.sort ?? 'newest'}
                onChange={(event) =>
                  setDraft({ ...draft, sort: event.target.value as ConfessionFeedQuery['sort'] })
                }
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                {draft.search && <option value="relevance">Relevance</option>}
              </select>
            </label>
            <div className="sheet-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setDraft({ ...defaultQuery });
                  setSearchInput('');
                }}
              >
                Clear all
              </button>
              <button
                type="button"
                className="ggv-button"
                onClick={() => {
                  navigate({ ...draft, page: 1, search: searchInput.trim() || undefined });
                  setSheetOpen(false);
                }}
              >
                Apply filters
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
