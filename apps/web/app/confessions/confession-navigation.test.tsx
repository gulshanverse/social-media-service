import { StrictMode } from 'react';
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
  reject: (reason?: unknown) => void;
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
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function mockCarouselGeometry(limit: number) {
  const rect = (left: number) =>
    ({
      x: left,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: left + 100,
      bottom: 100,
      left,
      toJSON: () => ({}),
    }) as DOMRect;

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('confession-carousel__slide')) {
      const confessionNumber = Number(this.getAttribute('aria-label')?.split(' ')[0]);
      const index = (confessionNumber - 1) % limit;
      return rect(index * 100 - (this.parentElement?.scrollLeft ?? 0));
    }
    return rect(0);
  });
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
  it('does not refetch the same initial page when route props are synchronized', async () => {
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      return Promise.resolve(makePage(page));
    });

    render(<ConfessionsFeed initialQuery={{ ...initialQuery, page: 1 }} promotions={[]} />);
    await flushPromises();

    expect(
      getConfessions.mock.calls.filter(
        ([input]) => (typeof input === 'number' ? input : (input.page ?? 1)) === 1,
      ),
    ).toHaveLength(1);
  });

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

    const { rerender } = render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1 }}
        initialLayout="vertical"
        promotions={[]}
      />,
    );
    await flushPromises();

    fireEvent.change(screen.getByRole('combobox', { name: 'Browsing layout' }), {
      target: { value: 'horizontal' },
    });
    const layoutReplace = router.replace.mock.calls.at(-1)?.[0] as string;
    expect(layoutReplace).toContain('layout=horizontal');
    expect(layoutReplace.match(/layout=horizontal/g)).toHaveLength(1);
    expect(router.replace).toHaveBeenLastCalledWith(layoutReplace, { scroll: false });

    fireEvent.click(screen.getByRole('button', { name: /Funny/ }));
    await flushPromises();
    const filterPush = router.push.mock.calls.at(-1)?.[0] as string;
    expect(filterPush).toContain('category=FUNNY');
    expect(filterPush).toContain('layout=horizontal');

    fireEvent.click(screen.getByRole('button', { name: /Sort confessions/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Newest first' }));
    await flushPromises();
    const sortPush = router.push.mock.calls.at(-1)?.[0] as string;
    expect(sortPush).toContain('sort=newest');
    expect(sortPush).toContain('layout=horizontal');

    rerender(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    await flushPromises();
    expect(
      (screen.getByRole('combobox', { name: 'Browsing layout' }) as HTMLSelectElement).value,
    ).toBe('horizontal');

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
    expect(router.push).toHaveBeenCalledTimes(1);

    pages.get(2)?.resolve(makePage(2, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();
    expect(screen.getByText('3 / 4')).toBeTruthy();
  });

  it('crosses forward and backward page boundaries with touch swipes', async () => {
    mockCarouselGeometry(2);
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
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 60 });
    expect(router.push).toHaveBeenCalledTimes(1);

    pages.get(2)?.resolve(makePage(2, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();
    expect(screen.getByText('3 / 4')).toBeTruthy();
    expect(track.scrollLeft).toBe(0);

    Array.from(track.children).forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: index * 100 });
    });
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    track.scrollLeft = 100;
    fireEvent.scroll(track);
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 60 });
    expect(screen.getByText('4 / 4')).toBeTruthy();

    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 20 });
    track.scrollLeft = 0;
    fireEvent.scroll(track);
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 100 });
    await flushPromises();
    expect(screen.getByText('3 / 4')).toBeTruthy();
    expect(router.push).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 20 });
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 100 });
    await flushPromises();
    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(track.scrollLeft).toBe(100);
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('uses a backward wheel gesture to land on the previous page last item', async () => {
    mockCarouselGeometry(2);
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
    pages.get(2)?.resolve(makePage(2, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();

    const track = document.querySelector('.confession-carousel__track');
    if (!(track instanceof HTMLDivElement)) throw new Error('Carousel track was not rendered.');
    Object.defineProperties(track, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 200 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.wheel(track, { deltaX: -120, deltaY: 0 });
    pages.get(1)?.resolve(makePage(1, { itemCount: 2, limit: 2, total: 4 }));
    await flushPromises();

    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(track.scrollLeft).toBe(100);
    expect(router.push).toHaveBeenCalledTimes(1);
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
    mockCarouselGeometry(2);
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
      <StrictMode>
        <ConfessionsFeed
          initialQuery={{ ...initialQuery, page: 2, limit: 2 }}
          initialLayout="horizontal"
          promotions={[]}
        />
      </StrictMode>,
    );
    pages.get(2)?.resolve(makePage(2, { itemCount: 1, limit: 2 }));
    await flushPromises();

    fireEvent.click(screen.getByRole('button', { name: 'Previous confession' }));
    pages.get(1)?.resolve(makePage(1, { itemCount: 2, limit: 2 }));
    await flushPromises();

    expect(screen.getByText('2 / 3')).toBeTruthy();
    const track = document.querySelector('.confession-carousel__track');
    if (!(track instanceof HTMLDivElement)) throw new Error('Carousel track was not rendered.');
    expect(track.scrollLeft).toBe(100);
  });

  it('navigates from confession 12 to 13 to 14 across the page boundary', async () => {
    mockCarouselGeometry(12);
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
        initialQuery={{ ...initialQuery, page: 1, limit: 12 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    pages.get(1)?.resolve(makePage(1, { itemCount: 12, limit: 12, total: 36 }));
    await flushPromises();

    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    }
    expect(screen.getByText('12 / 36')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    expect(router.push).toHaveBeenCalledTimes(1);

    pages.get(2)?.resolve(makePage(2, { itemCount: 12, limit: 12, total: 36 }));
    await flushPromises();
    expect(screen.getByText('13 / 36')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    expect(screen.getByText('14 / 36')).toBeTruthy();
  });

  it('navigates from confession 24 to 25 and back to 24', async () => {
    mockCarouselGeometry(12);
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
        initialQuery={{ ...initialQuery, page: 2, limit: 12 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    pages.get(2)?.resolve(makePage(2, { itemCount: 12, limit: 12, total: 36 }));
    await flushPromises();

    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    }
    expect(screen.getByText('24 / 36')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    pages.get(3)?.resolve(makePage(3, { itemCount: 12, limit: 12, total: 36 }));
    await flushPromises();
    expect(screen.getByText('25 / 36')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous confession' }));
    await flushPromises();
    expect(screen.getByText('24 / 36')).toBeTruthy();
    const track = document.querySelector('.confession-carousel__track');
    if (!(track instanceof HTMLDivElement)) throw new Error('Carousel track was not rendered.');
    expect(track.scrollLeft).toBe(1100);
  });

  it('clears the boundary lock after failure and retry, then allows backward and forward navigation', async () => {
    const failedPageRequest = deferred<ReturnType<typeof makePage>>();
    let failPageTwo = true;
    getConfessions.mockImplementation((input: ConfessionFeedQuery | number) => {
      const page = typeof input === 'number' ? input : (input.page ?? 1);
      if (page === 2 && failPageTwo) return failedPageRequest.promise;
      return Promise.resolve(makePage(page, { itemCount: 1, limit: 1, total: 3 }));
    });

    render(
      <ConfessionsFeed
        initialQuery={{ ...initialQuery, page: 1, limit: 1 }}
        initialLayout="horizontal"
        promotions={[]}
      />,
    );
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    failedPageRequest.reject(new Error('offline'));
    await flushPromises();
    expect(screen.getByRole('alert').textContent).toContain('offline');

    failPageTwo = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await flushPromises();
    expect(screen.getByText('2 / 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous confession' }));
    await flushPromises();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next confession' }));
    await flushPromises();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(router.push).toHaveBeenCalledTimes(3);
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
