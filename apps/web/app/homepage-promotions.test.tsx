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

  it('renders desktop-only artwork', () => {
    const { container } = render(
      <HomepagePromotionCarousel promotions={[{ ...promotions[0], mobileImageUrl: null }]} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://assets.example/desktop.webp',
    );
  });

  it('renders mobile-only artwork with the mobile image as the fallback source', () => {
    const { container } = render(
      <HomepagePromotionCarousel promotions={[{ ...promotions[0], desktopImageUrl: null }]} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://assets.example/mobile.webp',
    );
    expect(container.querySelector('source')?.getAttribute('srcset')).toBe(
      'https://assets.example/mobile.webp',
    );
  });

  it('keeps long promotion content in the banner flow and preserves the CTA', () => {
    const longPromotion = {
      ...promotions[0],
      title: 'A much longer announcement heading that needs room to wrap gracefully',
      description:
        'This description intentionally spans multiple lines so the banner can grow with its content instead of clipping the message or introducing an internal scrollbar on smaller screens.',
    };
    const { container } = render(<HomepagePromotionCarousel promotions={[longPromotion]} />);
    const copy = container.querySelector('.homepage-promotion-copy');
    expect(copy).toBeTruthy();
    expect(copy?.textContent).toContain(longPromotion.title);
    expect(copy?.textContent).toContain(longPromotion.description);
    expect(
      screen.getByRole('link', {
        name: `Get details: ${longPromotion.title}`,
      }),
    ).toBeTruthy();
  });

  it('maps manual center positioning to flow alignment without transform offsets', () => {
    const manualPromotion = {
      ...promotions[0],
      layoutSettings: {
        version: 1 as const,
        mode: 'manual' as const,
        headingFont: 'inherit' as const,
        bodyFont: 'inherit' as const,
        headingSize: 3.2,
        descriptionSize: 1,
        headingWeight: 800 as const,
        descriptionWeight: 500 as const,
        headingLineHeight: 1.02,
        descriptionLineHeight: 1.45,
        letterSpacing: 'tight' as const,
        headingTransform: 'none' as const,
        alignment: 'center' as const,
        horizontalPosition: 'center' as const,
        verticalPosition: 'center' as const,
        contentWidth: 'wide' as const,
        padding: 'comfortable' as const,
        spacing: 'comfortable' as const,
      },
    };
    const { container } = render(<HomepagePromotionCarousel promotions={[manualPromotion]} />);
    const card = container.querySelector('.homepage-promotion-card');
    expect(card?.getAttribute('style')).toContain('--promotion-copy-justify: center');
    expect(card?.getAttribute('style')).toContain('--promotion-copy-margin-start: auto');
  });

  it('falls back to Aurora for an invalid background preset', () => {
    const { container } = render(
      <HomepagePromotionCarousel
        promotions={[{ ...promotions[0], backgroundPreset: 'invalid' }]}
      />,
    );
    expect(container.querySelector('.promotion-background--aurora')).toBeTruthy();
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
