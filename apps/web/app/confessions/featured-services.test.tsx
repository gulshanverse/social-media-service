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
let observerCallback: IntersectionObserverCallback | undefined;
let observerDisconnect: ReturnType<typeof vi.fn>;
let mediaRemoveListener: ReturnType<typeof vi.fn>;

function setMediaPreferences({ reducedMotion = false, hover = true } = {}) {
  mediaRemoveListener = vi.fn();
  const addEventListener = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : hover,
      addEventListener,
      removeEventListener: mediaRemoveListener,
    })),
  });
}

function activeDot() {
  return document.querySelector('.featured-services__dots [aria-current="true"]');
}

function makeScrollable(track: HTMLElement) {
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: 100 });
  return vi.spyOn(track, 'scrollTo').mockImplementation((options) => {
    track.scrollLeft = (options as unknown as ScrollToOptions).left ?? 0;
  });
}

function emitIntersection(isIntersecting: boolean, intersectionRatio: number) {
  if (!observerCallback) throw new Error('IntersectionObserver callback was not registered.');
  act(() => {
    observerCallback?.(
      [{ isIntersecting, intersectionRatio } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setMediaPreferences();
  observerCallback = undefined;
  observerDisconnect = vi.fn();
  const OriginalObserver = window.IntersectionObserver;
  class TestIntersectionObserver {
    observe = vi.fn();
    disconnect = observerDisconnect;
    unobserve = vi.fn();
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds = [];
    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback;
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: TestIntersectionObserver,
  });
  Object.defineProperty(window, '__originalIntersectionObserver', {
    configurable: true,
    value: OriginalObserver,
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
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
  const originalObserver = (
    window as Window & { __originalIntersectionObserver?: typeof IntersectionObserver }
  ).__originalIntersectionObserver;
  if (originalObserver) {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: originalObserver,
    });
  } else {
    delete (window as Window & { IntersectionObserver?: typeof IntersectionObserver })
      .IntersectionObserver;
  }
});

describe('Featured Services carousel', () => {
  it('automatically rotates after five seconds and wraps to the first service', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    await act(async () => vi.advanceTimersByTime(4999));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    await act(async () => vi.advanceTimersByTime(1));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    for (let step = 0; step < 3; step += 1) {
      await act(async () => vi.advanceTimersByTime(5000));
    }
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('moves forward through real slides, then smoothly reaches the hidden clone before an instant reset', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    expect(track.querySelectorAll('.featured-service')).toHaveLength(5);
    expect(
      screen.getByRole('group', { name: 'Choose a featured service' }).querySelectorAll('button'),
    ).toHaveLength(4);
    expect(
      track.querySelector('.featured-service[aria-hidden="true"]')?.getAttribute('tabindex'),
    ).toBe('-1');
    expect(track.querySelectorAll('a')).toHaveLength(3);

    for (const [index, label] of [
      'Show BawalBox',
      'Show Campus Garba',
      'Show Rentals & Finds',
    ].entries()) {
      await act(async () => vi.advanceTimersByTime(5000));
      expect(activeDot()?.getAttribute('aria-label')).toBe(label);
      expect(scrollTo).toHaveBeenLastCalledWith({ left: (index + 1) * 100, behavior: 'smooth' });
    }
    await act(async () => vi.advanceTimersByTime(5000));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');

    act(() => track.dispatchEvent(new Event('scrollend')));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'smooth' });
  });

  it('never animates backward when autoplay wraps forward through the clone', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    for (let step = 0; step < 4; step += 1) {
      await act(async () => vi.advanceTimersByTime(5000));
    }
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
    const cloneTransitionIndex = scrollTo.mock.calls.length - 1;
    act(() => track.dispatchEvent(new Event('scrollend')));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(
      scrollTo.mock.calls
        .slice(cloneTransitionIndex + 1)
        .some(
          ([options]) => (options as unknown as ScrollToOptions | undefined)?.behavior === 'smooth',
        ),
    ).toBe(false);
  });

  it('repeats the forward clone loop without adding a fifth logical dot', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    for (let loop = 0; loop < 2; loop += 1) {
      for (let step = 0; step < 4; step += 1) {
        await act(async () => vi.advanceTimersByTime(5000));
      }
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
      expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
      act(() => track.dispatchEvent(new Event('scrollend')));
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
      expect(
        screen.getByRole('group', { name: 'Choose a featured service' }).querySelectorAll('button'),
      ).toHaveLength(4);
      await act(async () => vi.advanceTimersByTime(5000));
    }
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('resets a manual swipe across the last-to-first boundary without a reverse animation', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    track.scrollLeft = 400;
    fireEvent.scroll(track);
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 10 });
    await act(async () => vi.advanceTimersByTime(160));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
  });

  it('wraps keyboard navigation at both boundaries and preserves Home and End', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await act(async () => Promise.resolve());
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    act(() => fireEvent.keyDown(track, { key: 'ArrowLeft' }));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Rentals & Finds');
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
    act(() => fireEvent.keyDown(track, { key: 'ArrowRight' }));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
    act(() => fireEvent.keyDown(track, { key: 'End' }));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Rentals & Finds');
    act(() => fireEvent.keyDown(track, { key: 'Home' }));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('resets a reduced-motion swipe across the clone immediately without smooth scrolling', async () => {
    setMediaPreferences({ reducedMotion: true });
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await act(async () => Promise.resolve());
    const track = screen.getByRole('group', { name: 'Featured services' });
    const scrollTo = makeScrollable(track);
    scrollTo.mockClear();
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    track.scrollLeft = 400;
    fireEvent.scroll(track);
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 10 });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(
      scrollTo.mock.calls.some(
        ([options]) => (options as unknown as ScrollToOptions | undefined)?.behavior === 'smooth',
      ),
    ).toBe(false);
  });

  it('resets autoplay after dot navigation and supports keyboard slide navigation', async () => {
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

  it('resets autoplay and updates the active dot after a manual swipe', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 100 });
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    track.scrollLeft = 100;
    fireEvent.scroll(track);
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 20 });
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    await act(async () => vi.advanceTimersByTime(4999));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    await act(async () => vi.advanceTimersByTime(1));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Campus Garba');
  });

  it('resumes five-second rotation after a completed touch swipe', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 100 });
    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 120 });
    fireEvent.pointerMove(track, { pointerType: 'touch', clientX: 20 });
    track.scrollLeft = 100;
    fireEvent.scroll(track);
    fireEvent.pointerUp(track, { pointerType: 'touch' });
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show Campus Garba');
  });

  it('resumes rotation after a completed touch tap', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    fireEvent.pointerDown(track, { pointerType: 'touch' });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.pointerUp(track, { pointerType: 'touch' });
    const serviceLink = document.querySelector('.featured-services__track a');
    if (!serviceLink) throw new Error('The first service link was not rendered.');
    fireEvent.focus(serviceLink);
    expect(document.activeElement).not.toBe(serviceLink);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('pauses only during an active touch interaction, then restarts a full timer', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    fireEvent.pointerDown(track, { pointerType: 'touch' });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.pointerUp(track, { pointerType: 'touch' });
    await act(async () => vi.advanceTimersByTime(4999));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    await act(async () => vi.advanceTimersByTime(1));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('resumes autoplay after a canceled touch pointer', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    fireEvent.pointerDown(track, { pointerType: 'touch' });
    await act(async () => vi.advanceTimersByTime(10_000));
    fireEvent.pointerCancel(track, { pointerType: 'touch' });
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('ignores touch-generated mouse-enter without requiring a matching mouse-leave', async () => {
    setMediaPreferences({ hover: false });
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const carousel = screen.getByRole('region', { name: 'Featured campus services' });
    const track = screen.getByRole('group', { name: 'Featured services' });
    fireEvent.pointerDown(track, { pointerType: 'touch' });
    fireEvent.pointerUp(track, { pointerType: 'touch' });
    // Compatibility mouse events can be emitted after touch; no genuine hover/leave pair exists.
    fireEvent.mouseEnter(carousel);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('pauses for a genuine fine-pointer mouse hover and resumes on pointer leave', async () => {
    setMediaPreferences({ hover: true });
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const carousel = screen.getByRole('region', { name: 'Featured campus services' });
    const track = screen.getByRole('group', { name: 'Featured services' });
    fireEvent.pointerEnter(carousel, { pointerType: 'mouse' });
    fireEvent.pointerDown(track, { pointerType: 'mouse' });
    fireEvent.pointerUp(track, { pointerType: 'mouse' });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.pointerLeave(carousel, { pointerType: 'mouse' });
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('pauses while keyboard-focused and resumes after focus leaves', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const track = screen.getByRole('group', { name: 'Featured services' });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    fireEvent.focus(track);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    fireEvent.blur(track, { relatedTarget: null });
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

  it('pauses while offscreen and resumes when the carousel becomes visible', async () => {
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    emitIntersection(false, 0);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
    emitIntersection(true, 0.5);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show BawalBox');
  });

  it('does not auto-rotate when reduced motion is preferred', async () => {
    setMediaPreferences({ reducedMotion: true });
    render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(activeDot()?.getAttribute('aria-label')).toBe('Show VibeMatch');
  });

  it('cleans up timers, visibility listeners, media listeners and observers on unmount', () => {
    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<ConfessionsFeed initialQuery={initialQuery} promotions={[]} />);
    const visibilityListener = addDocumentListener.mock.calls.find(
      ([type]) => type === 'visibilitychange',
    )?.[1];
    const keyboardListener = addDocumentListener.mock.calls.find(
      ([type]) => type === 'keydown',
    )?.[1];
    const pointerListener = addDocumentListener.mock.calls.find(
      ([type]) => type === 'pointerdown',
    )?.[1];
    expect(visibilityListener).toBeDefined();
    expect(keyboardListener).toBeDefined();
    expect(pointerListener).toBeDefined();
    unmount();
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', visibilityListener);
    expect(removeDocumentListener).toHaveBeenCalledWith('keydown', keyboardListener);
    expect(removeDocumentListener).toHaveBeenCalledWith('pointerdown', pointerListener);
    expect(mediaRemoveListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(observerDisconnect).toHaveBeenCalled();
    expect(clearTimeout).toHaveBeenCalled();
  });
});
