'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicConfessionPage } from '@ggv/types';
import { allConfessionCategories } from '@ggv/types';
import { ConfessionCard } from '../../components/ConfessionCard';
import { type ConfessionFeedQuery, getConfessions } from '../../lib/api';

type Props = { initialQuery: ConfessionFeedQuery };
type DateRange = NonNullable<ConfessionFeedQuery['dateRange']>;
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
const icons: Record<string, string> = {
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
const defaultQuery: ConfessionFeedQuery = { page: 1, dateRange: 'all', sort: 'newest' };
function label(value?: string) {
  return value ? (categoryLabels[value] ?? value) : '';
}
function queryString(query: ConfessionFeedQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value && value !== 'all' && value !== 1) params.set(key, String(value));
  return params.toString();
}

export default function ConfessionsFeed({ initialQuery }: Props) {
  const [query, setQuery] = useState<ConfessionFeedQuery>({ ...defaultQuery, ...initialQuery });
  const [searchInput, setSearchInput] = useState(initialQuery.search ?? '');
  const [data, setData] = useState<PublicConfessionPage | null>(null);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setQuery((current) => ({
          ...current,
          search: searchInput.trim() || undefined,
          page: 1,
          sort: searchInput.trim()
            ? current.sort
            : current.sort === 'relevance'
              ? 'newest'
              : current.sort,
        })),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);
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
    setQuery({ ...defaultQuery });
    setSortOpen(false);
  };
  const removeFilter = (key: keyof ConfessionFeedQuery) =>
    setQuery((current) => ({
      ...current,
      [key]: undefined,
      ...(key === 'dateRange'
        ? { dateRange: 'all', startDate: undefined, endDate: undefined }
        : {}),
      page: 1,
    }));
  const retry = () => setQuery((current) => ({ ...current }));

  return (
    <main className="site-shell">
      <section className="feed-heading">
        <div>
          <p className="eyebrow">THE CAMPUS WALL</p>
          <h1 aria-label="Confessions from your people.">
            Confessions from
            <br />
            <span>your people.</span>
          </h1>
        </div>
        <p>Anonymous thoughts, reviewed and shared with the community.</p>
      </section>
      <section className="discovery-controls" aria-label="Find confessions">
        <div className="search-row">
          <div className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search confessions, topics, or keywords..."
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
            ☷<span>Filters</span>
          </button>
        </div>
        <div className="category-scroller" aria-label="Categories">
          {['ALL', ...allConfessionCategories].map((category) => (
            <button
              type="button"
              key={category}
              className={`category-tile ${(category === 'ALL' ? !query.category : query.category === category) ? 'category-tile--active' : ''}`}
              onClick={() =>
                setQuery((current) => ({
                  ...current,
                  category: category === 'ALL' ? undefined : category,
                  page: 1,
                }))
              }
            >
              <span aria-hidden="true">{icons[category]}</span>
              <small>{category === 'ALL' ? 'All' : label(category)}</small>
            </button>
          ))}
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
        <h2>Recent confessions</h2>
        <div className="sort-wrap">
          <button
            type="button"
            className="sort-button"
            onClick={() => setSortOpen((open) => !open)}
            aria-expanded={sortOpen}
          >
            Sort:{' '}
            {query.sort === 'oldest'
              ? 'Oldest first'
              : query.sort === 'relevance'
                ? 'Relevance'
                : 'Newest first'}
            ⌄
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
                    setQuery((current) => ({ ...current, sort, page: 1 }));
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
        <section className="state-panel">
          <h2>Couldn’t load the wall.</h2>
          <p>{error}</p>
          <button className="ggv-button" onClick={retry}>
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
          <div className="feed-pagination">
            {data.page > 1 && (
              <Link
                className="ghost-button"
                href={`/confessions?${queryString({ ...query, page: data.page - 1 })}`}
              >
                Previous
              </Link>
            )}
            {data.hasMore && (
              <Link
                className="ghost-button"
                href={`/confessions?${queryString({ ...query, page: data.page + 1 })}`}
              >
                Load more confessions
              </Link>
            )}
          </div>
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
                }}
              >
                Clear all
              </button>
              <button
                type="button"
                className="ggv-button"
                onClick={() => {
                  setQuery({ ...draft, page: 1, search: searchInput.trim() || undefined });
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
