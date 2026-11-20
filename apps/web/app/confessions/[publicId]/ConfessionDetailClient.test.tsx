import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicConfession } from '@ggv/types';
import ConfessionDetailClient from './ConfessionDetailClient';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const { getConfessions, router } = vi.hoisted(() => ({
  getConfessions: vi.fn(),
  router: { push: vi.fn(), prefetch: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('../../../lib/api', () => ({
  getConfessions,
  getConfession: vi.fn(),
}));

vi.mock('../../../components/ConfessionCard', () => ({
  ConfessionCard: ({ confession }: { confession: PublicConfession }) => (
    <article data-testid="confession-card">{confession.content}</article>
  ),
}));

vi.mock('./DiscussionSection', () => ({
  default: () => <section data-testid="discussion-section" />,
}));

const confession: PublicConfession = {
  publicId: 'conf-1',
  content: 'The card content stays on the detail page.',
  category: 'CRUSH',
  customCategory: null,
  theme: null,
  publishedAt: '2026-11-15T12:00:00.000Z',
  viewCount: 1,
};

const browseResult = {
  items: [
    { ...confession, publicId: 'conf-0', content: 'Page one first' },
    { ...confession, content: 'Page one last' },
    { ...confession, publicId: 'conf-2', content: 'Next confession' },
  ],
  page: 1,
  limit: 12,
  total: 3,
  hasMore: false,
};
const boundaryPageOne = {
  items: [{ ...confession, publicId: 'conf-0', content: 'Page one first' }, confession],
  page: 1,
  limit: 2,
  total: 4,
  hasMore: true,
};
const boundaryPageTwo = {
  items: [
    { ...confession, publicId: 'conf-2', content: 'Page two first' },
    { ...confession, publicId: 'conf-3', content: 'Page two last' },
  ],
  page: 2,
  limit: 2,
  total: 4,
  hasMore: false,
};

describe('ConfessionDetailClient', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    getConfessions.mockResolvedValue(browseResult);
    router.push.mockReset();
    router.prefetch.mockReset();
    router.prefetch.mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/confessions/conf-1?sort=newest');
  });

  it('keeps the confession card and discussion while omitting the promotional CTA', () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);

    expect(screen.getByTestId('confession-card')).toHaveTextContent(confession.content);
    expect(screen.getByTestId('discussion-section')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Confession navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Related confessions' })).toBeInTheDocument();
    expect(screen.queryByText('Have something to say?')).not.toBeInTheDocument();
    expect(screen.queryByText('Share your own anonymous confession')).not.toBeInTheDocument();
  });

  it('keeps neighboring slides isolated from the active card layout', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);

    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    const currentSlide = screen.getByTestId('current-confession-slide');
    expect(screen.getByTestId('previous-confession-slide')).toBeInTheDocument();
    expect(screen.getByTestId('next-confession-slide')).toBeInTheDocument();
    const slides = Array.from(currentSlide.parentElement?.children ?? []);
    expect(slides).toHaveLength(3);
    expect(currentSlide).not.toHaveAttribute('aria-hidden', 'true');
    expect(slides.filter((slide) => slide !== currentSlide)).toHaveLength(2);
    expect(slides.map((slide) => slide.getAttribute('data-testid'))).toEqual([
      'previous-confession-slide',
      'current-confession-slide',
      'next-confession-slide',
    ]);
  });

  it('prefetches the nearest previous and next routes with the active query context', async () => {
    getConfessions.mockResolvedValue({ ...browseResult, page: 3 });
    window.history.replaceState(
      {},
      '',
      '/confessions/conf-1?page=3&search=campus&category=CRUSH&dateRange=7d&sort=oldest',
    );
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);

    await waitFor(() => {
      expect(router.prefetch).toHaveBeenCalledWith(
        '/confessions/conf-0?page=3&search=campus&category=CRUSH&dateRange=7d&sort=oldest',
      );
      expect(router.prefetch).toHaveBeenCalledWith(
        '/confessions/conf-2?page=3&search=campus&category=CRUSH&dateRange=7d&sort=oldest',
      );
    });
  });

  it('warms an adjacent page before the current page boundary is reached', async () => {
    getConfessions.mockImplementation((query: { page?: number; limit?: number }) => {
      if (query.page === 2 && !query.limit) return Promise.resolve(boundaryPageTwo);
      if (query.page === 1 && !query.limit) return Promise.resolve(boundaryPageOne);
      return Promise.resolve(browseResult);
    });
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);

    await waitFor(() => {
      expect(getConfessions).toHaveBeenCalledWith({
        page: 2,
        search: undefined,
        category: undefined,
        customCategory: undefined,
        dateRange: 'all',
        startDate: undefined,
        endDate: undefined,
        sort: 'newest',
      });
    });
  });

  it('shows the swipe hint for 2 seconds, hides it for 60 seconds, and repeats', () => {
    vi.useFakeTimers();
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const hint = document.querySelector('.detail-carousel__hint');
    if (!(hint instanceof HTMLElement)) throw new Error('Swipe hint was not rendered.');

    expect(hint).toHaveAttribute('data-visible', 'true');
    act(() => vi.advanceTimersByTime(2000));
    expect(hint).toHaveAttribute('data-visible', 'false');
    act(() => vi.advanceTimersByTime(60000));
    expect(hint).toHaveAttribute('data-visible', 'true');
    act(() => vi.advanceTimersByTime(2000));
    expect(hint).toHaveAttribute('data-visible', 'false');
  });

  it('navigates left to the next confession and right to the previous confession', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.touchStart(page, { touches: [{ clientX: 220, clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 304 }] });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest'),
    );

    router.push.mockReset();
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const secondPage = document.querySelectorAll('.site-shell')[1];
    if (!(secondPage instanceof HTMLElement))
      throw new Error('Second detail page was not rendered.');
    await waitFor(() => expect(screen.getAllByText('2 / 3')).toHaveLength(2));
    fireEvent.touchStart(secondPage, { touches: [{ clientX: 120, clientY: 300 }] });
    fireEvent.touchEnd(secondPage, { changedTouches: [{ clientX: 220, clientY: 304 }] });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-0?sort=newest'),
    );
  });

  it('keeps vertical scrolling and interactive controls out of swipe navigation', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.detail-page');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.pointerDown(page, { pointerId: 1, pointerType: 'touch', clientX: 220, clientY: 100 });
    fireEvent.pointerUp(page, { pointerId: 1, pointerType: 'touch', clientX: 120, clientY: 220 });
    fireEvent.pointerDown(screen.getByRole('button', { name: /Previous/ }), {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 220,
      clientY: 100,
    });
    fireEvent.pointerUp(screen.getByRole('button', { name: /Previous/ }), {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 120,
      clientY: 100,
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('recovers when a touch pointer is cancelled before touchend', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.pointerDown(page, {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 220,
      clientY: 300,
    });
    fireEvent.touchStart(page, { touches: [{ clientX: 220, clientY: 300 }] });
    fireEvent.pointerCancel(page, { pointerId: 7, pointerType: 'touch' });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 304 }] });

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest'),
    );
  });

  it('does not navigate twice when pointerup and touchend represent one gesture', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.pointerDown(page, {
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 220,
      clientY: 300,
    });
    fireEvent.touchStart(page, { touches: [{ clientX: 220, clientY: 300 }] });
    fireEvent.pointerUp(page, { pointerId: 8, pointerType: 'touch', clientX: 120, clientY: 304 });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 304 }] });

    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest');
  });

  it('renders the next confession and tracks a slow left drag in real time', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    const track = document.querySelector('.detail-carousel__track');
    if (!(page instanceof HTMLElement) || !(track instanceof HTMLElement))
      throw new Error('Detail carousel was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    expect(screen.getAllByText('Next confession').length).toBeGreaterThanOrEqual(1);
    fireEvent.pointerDown(page, {
      pointerId: 10,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 260,
      clientY: 320,
    });
    fireEvent.pointerMove(page, {
      pointerId: 10,
      pointerType: 'touch',
      clientX: 180,
      clientY: 322,
    });

    expect(track.style.transform).toContain('-80px');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('springs back after an incomplete horizontal drag', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    const track = document.querySelector('.detail-carousel__track');
    if (!(page instanceof HTMLElement) || !(track instanceof HTMLElement))
      throw new Error('Detail carousel was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.pointerDown(page, {
      pointerId: 11,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 220,
      clientY: 320,
    });
    fireEvent.pointerMove(page, {
      pointerId: 11,
      pointerType: 'touch',
      clientX: 190,
      clientY: 322,
    });
    fireEvent.pointerUp(page, {
      pointerId: 11,
      pointerType: 'touch',
      clientX: 190,
      clientY: 322,
    });

    expect(track.style.transform).toContain('0px');
    expect(track.style.transition).toContain('360ms');
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([320, 760])(
    'settles exactly across the carousel viewport at %ipx',
    async (viewportWidth) => {
      render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
      const page = document.querySelector('.site-shell');
      const viewport = document.querySelector('.detail-carousel');
      const track = document.querySelector('.detail-carousel__track');
      if (
        !(page instanceof HTMLElement) ||
        !(viewport instanceof HTMLElement) ||
        !(track instanceof HTMLElement)
      )
        throw new Error('Detail carousel was not rendered.');
      await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());
      Object.defineProperty(viewport, 'clientWidth', {
        configurable: true,
        value: viewportWidth,
      });

      fireEvent.pointerDown(page, {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 300,
        clientY: 300,
      });
      fireEvent.pointerUp(page, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 100,
        clientY: 304,
      });

      expect(track.style.transform).toContain(`-${viewportWidth}px`);
      expect(router.push).not.toHaveBeenCalled();
    },
  );

  it('locks rapid repeated swipes to one navigation', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.pointerDown(page, {
      pointerId: 12,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 220,
      clientY: 320,
    });
    fireEvent.pointerUp(page, {
      pointerId: 12,
      pointerType: 'touch',
      clientX: 100,
      clientY: 322,
    });
    fireEvent.pointerDown(page, {
      pointerId: 13,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 220,
      clientY: 320,
    });
    fireEvent.pointerUp(page, {
      pointerId: 13,
      pointerType: 'touch',
      clientX: 100,
      clientY: 322,
    });

    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
  });

  it('loads page two before revealing the next slot at the end of page one', async () => {
    getConfessions.mockImplementation((query: { page?: number; limit?: number }) => {
      if (query.page === 2 && !query.limit) return Promise.resolve(boundaryPageTwo);
      if (query.page === 1 && !query.limit) return Promise.resolve(boundaryPageOne);
      return Promise.resolve(browseResult);
    });
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() =>
      expect(screen.getByTestId('next-confession-slide')).toHaveTextContent('Page two first'),
    );

    fireEvent.touchStart(page, { touches: [{ clientX: 240, clientY: 300 }] });
    fireEvent.touchMove(page, { touches: [{ clientX: 140, clientY: 304 }] });
    expect(screen.getByTestId('next-confession-slide')).toHaveTextContent('Page two first');
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 140, clientY: 304 }] });

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?page=2&sort=newest'),
    );
  });

  it('loads page one before revealing the previous slot at the start of page two', async () => {
    window.history.replaceState({}, '', '/confessions/conf-2?page=2&sort=newest');
    getConfessions.mockImplementation((query: { page?: number; limit?: number }) => {
      if (query.page === 2 && !query.limit) return Promise.resolve(boundaryPageTwo);
      if (query.page === 1 && !query.limit) return Promise.resolve(boundaryPageOne);
      return Promise.resolve(browseResult);
    });
    const pageTwoConfession = { ...confession, publicId: 'conf-2', content: 'Page two first' };
    render(<ConfessionDetailClient publicId="conf-2" initialConfession={pageTwoConfession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() =>
      expect(screen.getByTestId('previous-confession-slide')).toHaveTextContent(confession.content),
    );

    fireEvent.touchStart(page, { touches: [{ clientX: 140, clientY: 300 }] });
    fireEvent.touchMove(page, { touches: [{ clientX: 240, clientY: 304 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 240, clientY: 304 }] });

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-1?sort=newest'),
    );
  });

  it('keeps the current slide in place while a boundary page is loading', async () => {
    let resolvePageTwo: (value: typeof boundaryPageTwo) => void = () => undefined;
    const pendingPageTwo = new Promise<typeof boundaryPageTwo>((resolve) => {
      resolvePageTwo = resolve;
    });
    getConfessions.mockImplementation((query: { page?: number; limit?: number }) => {
      if (query.page === 2 && !query.limit) return pendingPageTwo;
      if (query.page === 1 && !query.limit) return Promise.resolve(boundaryPageOne);
      return Promise.resolve(browseResult);
    });
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    const track = document.querySelector('.detail-carousel__track');
    if (!(page instanceof HTMLElement) || !(track instanceof HTMLElement))
      throw new Error('Detail carousel was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 4')).toBeInTheDocument());

    fireEvent.touchStart(page, { touches: [{ clientX: 240, clientY: 300 }] });
    fireEvent.touchMove(page, { touches: [{ clientX: 140, clientY: 304 }] });
    expect(track.style.transform).toContain('-18px');
    expect(router.push).not.toHaveBeenCalled();

    resolvePageTwo(boundaryPageTwo);
    await waitFor(() => expect(screen.getByText('Page two first')).toBeInTheDocument());
    fireEvent.touchMove(page, { touches: [{ clientX: 140, clientY: 304 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 140, clientY: 304 }] });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?page=2&sort=newest'),
    );
  });

  it('does not navigate into an empty slide when an adjacent page fails to load', async () => {
    getConfessions.mockImplementation((query: { page?: number; limit?: number }) => {
      if (query.page === 2 && !query.limit) return Promise.reject(new Error('page unavailable'));
      if (query.page === 1 && !query.limit) return Promise.resolve(boundaryPageOne);
      return Promise.resolve(browseResult);
    });
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('Browsing is unavailable.')).toBeInTheDocument());

    fireEvent.touchStart(page, { touches: [{ clientX: 240, clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 304 }] });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('supports horizontal trackpad gestures and ignores vertical wheel scrolling', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.detail-page');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.wheel(page, { deltaX: 15, deltaY: 40 });
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.wheel(page, { deltaX: -80, deltaY: 0 });
    fireEvent.wheel(page, { deltaX: -80, deltaY: 0 });
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest');
  });
});
