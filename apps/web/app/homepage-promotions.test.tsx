import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomepagePromotionCarousel from '../components/HomepagePromotionCarousel';
import type { PublicHomepagePromotion } from '../lib/api';

const promotions: PublicHomepagePromotion[] = [
  {
    id: 'campus-night',
    title: 'Campus night',
    description: 'Meet your community this Friday.',
    badgeText: 'This Friday',
    desktopImageUrl: 'https://assets.example/desktop.webp',
    backgroundPreset: 'aurora',
    mobileImageUrl: 'https://assets.example/mobile.webp',
    imageAlt: 'Campus lights and people',
    ctaLabel: 'Get details',
    destinationUrl: '/events/campus-night',
  },
  {
    id: 'club-fair',
    title: 'Club fair',
    description: null,
    badgeText: null,
    desktopImageUrl: 'https://assets.example/club-fair.webp',
    backgroundPreset: 'midnight',
    mobileImageUrl: null,
    imageAlt: null,
    ctaLabel: 'Explore clubs',
    destinationUrl: 'https://events.example/clubs',
  },
];

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

beforeEach(() => {
  setMotionPreference(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HomepagePromotionCarousel', () => {
  it('renders nothing when the API has no active campaigns, leaving the existing homepage intact', () => {
    const { container } = render(<HomepagePromotionCarousel promotions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('uses the mobile poster, exposes labelled controls, and renders an internal CTA', () => {
    const { container } = render(<HomepagePromotionCarousel promotions={promotions} />);
    expect(
      screen.getByRole('region', { name: 'Campus announcements and promotions' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Campus night' })).toBeTruthy();
    expect(container.querySelector('source')?.getAttribute('srcset')).toBe(
      'https://assets.example/mobile.webp',
    );
    expect(
      screen.getByRole('link', { name: 'Get details: Campus night' }).getAttribute('href'),
    ).toBe('/events/campus-night');
    fireEvent.click(screen.getByRole('button', { name: 'Next promotion' }));
    expect(screen.getByRole('heading', { name: 'Club fair' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Explore clubs: Club fair' }).getAttribute('href'),
    ).toBe('https://events.example/clubs');
  });

  it('renders a CSS background when a campaign has no uploaded artwork', () => {
    const { container } = render(
      <HomepagePromotionCarousel
        promotions={[
          {
            ...promotions[0],
            desktopImageUrl: null,
            mobileImageUrl: null,
            backgroundPreset: 'ocean',
          },
        ]}
      />,
    );
    expect(container.querySelector('.promotion-background--ocean')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps a single campaign free of redundant carousel controls', () => {
    render(<HomepagePromotionCarousel promotions={[promotions[0]]} />);
    expect(screen.queryByRole('button', { name: 'Next promotion' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Choose a promotion' })).toBeNull();
  });

  it('autoplays after seven seconds only when reduced motion is not requested', async () => {
    vi.useFakeTimers();
    setMotionPreference(false);
    render(<HomepagePromotionCarousel promotions={promotions} />);
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByRole('heading', { name: 'Club fair' })).toBeTruthy();

    cleanup();
    setMotionPreference(true);
    render(<HomepagePromotionCarousel promotions={promotions} />);
    await act(async () => {
      vi.advanceTimersByTime(14_000);
    });
    expect(screen.getByRole('heading', { name: 'Campus night' })).toBeTruthy();
  });
});
