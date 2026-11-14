import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConfessionsFeed from './ConfessionsFeed';

const { getConfessions } = vi.hoisted(() => ({ getConfessions: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/confessions',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('../../lib/api', () => ({ getConfessions }));
vi.mock('../../components/ConfessionCard', () => ({ ConfessionCard: () => null }));
vi.mock('../../components/HomepagePromotionCarousel', () => ({ default: () => null }));

const initialQuery = { page: 1, dateRange: 'all', sort: 'newest' } as const;
function setMotionPreference(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}
function activeDot() {
  return document.querySelector('.featured-services__dots [aria-current="true"]');
}

beforeEach(() => {
  vi.useFakeTimers();
  setMotionPreference(false);
  getConfessions.mockResolvedValue({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
    display: 'anonymous',
  });
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Featured Services carousel', () => {
  it('advances every five seconds and wraps to the first service', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    for (let step = 0; step < 3; step += 1) {
      await act(async () => vi.advanceTimersByTime(5000));
    }
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('resets the timer after dot navigation and supports keyboard navigation', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await act(async () => vi.advanceTimersByTime(4000));
    fireEvent.click(screen.getByRole('button', { name: 'Show Campus Garba' }));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Campus Garba');
    await act(async () => vi.advanceTimersByTime(4999));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Campus Garba');
    await act(async () => vi.advanceTimersByTime(1));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Rentals & Finds');
    fireEvent.keyDown(screen.getByRole('group', { name: 'Featured services' }), {
      key: 'ArrowRight',
    });
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('updates the active dot after a manual horizontal swipe', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 100 });
    track.scrollLeft = 100;
    fireEvent.scroll(track);
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    await act(async () => vi.advanceTimersByTime(4999));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    await act(async () => vi.advanceTimersByTime(1));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Campus Garba');
  });

  it('pauses while hovered and resumes after pointer leaves', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const carousel = screen.getByRole('region', { name: 'Featured campus services' });
    fireEvent.mouseEnter(carousel);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.mouseLeave(carousel);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('pauses when the document is hidden and resumes when visible', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('does not auto-rotate when reduced motion is preferred', async () => {
    setMotionPreference(true);
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('cleans up its timer and intersection observer on unmount', async () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    const OriginalObserver = window.IntersectionObserver;
    class TestIntersectionObserver {
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      root = null;
      rootMargin = '';
      thresholds = [];
      constructor(public callback: IntersectionObserverCallback) {}
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    });
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    expect(observe).toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(clearTimeout).toHaveBeenCalled();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: OriginalObserver,
    });
  });
});
