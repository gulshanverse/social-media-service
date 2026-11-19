import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConfessionsFeed from './ConfessionsFeed';
import type { ConfessionFeedQuery } from '../../lib/api';

const { getConfessions, router } = vi.hoisted(() => ({
  getConfessions: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/confessions',
  useRouter: () => router,
}));
vi.mock('../../lib/api', () => ({ getConfessions }));
vi.mock('../../components/ConfessionCard', () => ({ ConfessionCard: () => null }));
vi.mock('../../components/HomepagePromotionCarousel', () => ({ default: () => null }));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const initialQuery: ConfessionFeedQuery = {
  page: 2,
  search: 'late night',
  category: 'CRUSH',
  customCategory: 'campus thoughts',
  dateRange: 'custom',
  startDate: '2026-11-01',
  endDate: '2026-11-19',
  sort: 'oldest',
};

function makePage(
  page: number,
  {
    itemCount = 1,
    limit = 1,
    total = 3,
  }: { itemCount?: number; limit?: number; total?: number } = {},
) {
  return {
    items: Array.from({ length: itemCount }, (_, index) => ({
      publicId: `confession-${page}-${index}`,
      content: `Confession ${page}-${index}`,
      category: 'CRUSH' as const,
      customCategory: null,
      theme: null,
      publishedAt: '2026-11-19T00:00:00.000Z',
      viewCount: 0,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
    display: { cardTextSize: 16, previewLines: 5 },
  };
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  getConfessions.mockReset();
  router.push.mockReset();
  router.replace.mockReset();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: class TestIntersectionObserver {
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ConfessionsFeed navigation performance', () => {
  it('prefetches only adjacent pages with the complete active query', async () => {
    const requests: ConfessionFeedQuery[] = [];
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const request = typeof input === 'number' ? { page: input } : { ...input };
      requests.push(request);
      return Promise.resolve(makePage(request.page ?? 1));
    });

    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await flushPromises();

    const prefetches = requests.filter((request) => request.page === 1 || request.page === 3);
    expect(new Set(requests.map((request) => request.page))).toEqual(new Set([1, 2, 3]));
    expect(prefetches).toHaveLength(2);
    expect(prefetches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          search: 'late night',
          category: 'CRUSH',
          customCategory: 'campus thoughts',
          dateRange: 'custom',
          startDate: '2026-11-01',
          endDate: '2026-11-19',
          sort: 'oldest',
        }),
      ]),
    );
  });

  it('keeps the visible vertical page while pagination loads and scrolls the toolbar once', async () => {
    const pages = new Map<number, Deferred<ReturnType<typeof makePage>>>();
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      let request = pages.get(page);
      if (!request) {
        request = deferred<ReturnType<typeof makePage>>();
        pages.set(page, request);
      }
      return request.promise;
    });

    render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1 }}
        initialLayout="vertical"
        promotions={[]}
      />,
    );
    pages.get(1)?.resolve(makePage(1));
    await flushPromises();

    expect(document.querySelector('.card-grid')).toBeTruthy();
    expect(document.querySelector('.confession-carousel')).toBeNull();
    const toolbar = document.querySelector('.feed-toolbar');
    if (!(toolbar instanceof HTMLElement)) throw new Error('Feed toolbar was not rendered.');
    const toolbarScroll = vi.spyOn(toolbar, 'scrollIntoView');
    expect(screen.getByText('Showing 1–1 of 3 results')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flushPromises();

    expect(screen.getByText('Showing 1–1 of 3 results')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Loading the next page');

    pages.get(2)?.resolve(makePage(2));
    await flushPromises();
    await act(async () => vi.runOnlyPendingTimers());
    expect(screen.getByText('Showing 2–2 of 3 results')).toBeTruthy();
    expect(toolbarScroll).toHaveBeenCalledTimes(1);
  });

  it('serializes horizontal layout once and preserves it across page navigation', async () => {
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      return Promise.resolve(makePage(page, { itemCount: 1, limit: 1, total: 2 }));
    });

    render(<ConfessionsFeed initialQuery={{ ...initialQuery, page: 1 }} promotions={[]} />);
    await flushPromises();

    fireEvent.change(screen.getByRole('combobox', { name: 'Browsing layout' }), {
      target: { value: 'horizontal' },
    });
    const layoutReplace = router.replace.mock.calls.at(-1)?.[0] as string;
    expect(layoutReplace).toContain('layout=horizontal');
    expect(layoutReplace.match(/layout=horizontal/g)).toHaveLength(1);
    expect(router.replace).toHaveBeenLastCalledWith(layoutReplace, { scroll: false });

    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    await flushPromises();
    const pagePush = router.push.mock.calls.at(-1)?.[0] as string;
    expect(pagePush).toContain('page=2');
    expect(pagePush).toContain('layout=horizontal');
    expect(pagePush.match(/layout=horizontal/g)).toHaveLength(1);
    expect(router.push).toHaveBeenLastCalledWith(pagePush, { scroll: false });
  });

  it('uses an additional outward wheel gesture to cross the page boundary once', async () => {
    const pages = new Map<number, Deferred<ReturnType<typeof makePage>>>();
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      let request = pages.get(page);
      if (!request) {
        request = deferred<ReturnType<typeof makePage>>();
        pages.set(page, request);
      }
      return request.promise;
    });

    render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1, limit: 2 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    pages.get(1)?.resolve(makePage(1, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();

    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    const track = document.querySelector('.confession-carousel__track');
    if (!(track instanceof HTMLDivElement)) throw new Error('Carousel track was not rendered.');
    Object.defineProperties(track, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 200 },
      scrollLeft: { configurable: true, writable: true, value: 100 },
    });

    fireEvent.wheel(track, { deltaX: 120, deltaY: 0 });
    fireEvent.wheel(track, { deltaX: 120, deltaY: 0 });
    expect(
      getConfessions.mock.calls.filter(
        ([input]) => (typeof input === 'number' ? input : (input.page ?? 1)) === 2,
      ),
    ).toHaveLength(2);

    pages.get(2)?.resolve(makePage(2, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();
    expect(screen.getByText('3 / 4')).toBeTruthy();
  });

  it('crosses the horizontal next boundary without scrolling back to the toolbar', async () => {
    const pages = new Map<number, Deferred<ReturnType<typeof makePage>>>();
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      let request = pages.get(page);
      if (!request) {
        request = deferred<ReturnType<typeof makePage>>();
        pages.set(page, request);
      }
      return request.promise;
    });

    render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    pages.get(1)?.resolve(makePage(1));
    await flushPromises();

    const toolbar = document.querySelector('.feed-toolbar');
    if (!(toolbar instanceof HTMLElement)) throw new Error('Feed toolbar was not rendered.');
    const toolbarScroll = vi.spyOn(toolbar, 'scrollIntoView');
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    pages.get(2)?.resolve(makePage(2));
    await flushPromises();
    await act(async () => vi.runOnlyPendingTimers());

    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(toolbarScroll).not.toHaveBeenCalled();
  });

  it('opens the previous page at its last confession', async () => {
    const pages = new Map<number, Deferred<ReturnType<typeof makePage>>>();
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      let request = pages.get(page);
      if (!request) {
        request = deferred<ReturnType<typeof makePage>>();
        pages.set(page, request);
      }
      return request.promise;
    });

    render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 2, limit: 2 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    pages.get(2)?.resolve(makePage(2, { itemCount: 1, limit: 2 }));
    await flushPromises();

    fireEvent.click(screen.getByRole('button', { name: 'Previous confession' }));
    pages.get(1)?.resolve(makePage(1, { itemCount: 2, limit: 2 }));
    await flushPromises();

    expect(screen.getByText('2 / 3')).toBeTruthy();
  });

  it('ignores an older page response after a newer query is selected', async () => {
    const pages = new Map<number, Deferred<ReturnType<typeof makePage>>>();
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      let request = pages.get(page);
      if (!request) {
        request = deferred<ReturnType<typeof makePage>>();
        pages.set(page, request);
      }
      return request.promise;
    });

    const { rerender } = render(
      <ConfessionsFeed initialQuery={{ ...initialQuery, page: 1 }} promotions={[]} />,
    );
    pages.get(1)?.resolve(makePage(1));
    await flushPromises();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    rerender(<ConfessionsFeed initialQuery={{ ...initialQuery, page: 3 }} promotions={[]} />);
    await flushPromises();

    pages.get(2)?.resolve(makePage(2));
    await flushPromises();
    expect(screen.getByText('Showing 1–1 of 3 results')).toBeTruthy();

    pages.get(3)?.resolve(makePage(3));
    await flushPromises();
    expect(screen.getByText('Showing 3–3 of 3 results')).toBeTruthy();
  });
});
