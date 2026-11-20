import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  router: { push: vi.fn() },
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
    { ...confession, publicId: 'conf-0', content: 'Previous confession' },
    confession,
    { ...confession, publicId: 'conf-2', content: 'Next confession' },
  ],
  page: 1,
  limit: 12,
  total: 3,
  hasMore: false,
};

describe('ConfessionDetailClient', () => {
  beforeEach(() => {
    getConfessions.mockResolvedValue(browseResult);
    router.push.mockReset();
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

  it('navigates left to the next confession and right to the previous confession', async () => {
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const page = document.querySelector('.site-shell');
    if (!(page instanceof HTMLElement)) throw new Error('Detail page was not rendered.');
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());

    fireEvent.touchStart(page, { touches: [{ clientX: 220, clientY: 300 }] });
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 120, clientY: 304 }] });
    expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest');

    router.push.mockReset();
    render(<ConfessionDetailClient publicId="conf-1" initialConfession={confession} />);
    const secondPage = document.querySelectorAll('.site-shell')[1];
    if (!(secondPage instanceof HTMLElement))
      throw new Error('Second detail page was not rendered.');
    await waitFor(() => expect(screen.getAllByText('2 / 3')).toHaveLength(2));
    fireEvent.touchStart(secondPage, { touches: [{ clientX: 120, clientY: 300 }] });
    fireEvent.touchEnd(secondPage, { changedTouches: [{ clientX: 220, clientY: 304 }] });
    expect(router.push).toHaveBeenCalledWith('/confessions/conf-0?sort=newest');
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

    expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest');
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

    expect(router.push).toHaveBeenCalledTimes(1);
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

    expect(router.push).toHaveBeenCalledTimes(1);
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
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/confessions/conf-2?sort=newest');
  });
});
