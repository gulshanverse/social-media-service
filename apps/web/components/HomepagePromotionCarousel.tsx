'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicHomepagePromotion } from '../lib/api';

const BACKGROUND_PRESETS = ['aurora', 'sunset', 'ocean', 'midnight'] as const;

function backgroundClass(preset: string | null | undefined) {
  return `promotion-background--${BACKGROUND_PRESETS.includes(preset as (typeof BACKGROUND_PRESETS)[number]) ? preset : 'aurora'}`;
}

type Props = { promotions: PublicHomepagePromotion[] };

export default function HomepagePromotionCarousel({ promotions }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const carouselRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener?.('change', updatePreference);
    return () => query.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2),
      { threshold: [0, 0.2, 0.5] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (promotions.length < 2 || paused || !visible || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveIndex((index) => (index + 1) % promotions.length);
      }
    }, 7000);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused, promotions.length, reducedMotion, visible]);

  if (!promotions.length) return null;
  const active = promotions[Math.min(activeIndex, promotions.length - 1)];
  const showControls = promotions.length > 1;

  function move(offset: number) {
    setActiveIndex((index) => (index + offset + promotions.length) % promotions.length);
    setPaused(true);
  }

  function onTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0]?.clientX - touchStartX.current;
    touchStartX.current = null;
    if (typeof distance === 'number' && Math.abs(distance) > 45 && showControls) {
      move(distance < 0 ? 1 : -1);
    }
  }

  const externalDestination = Boolean(active.destinationUrl?.startsWith('https://'));

  return (
    <section
      className="homepage-promotions"
      aria-label="Campus announcements and promotions"
      aria-roledescription="carousel"
      ref={carouselRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={onTouchEnd}
    >
      <div className="homepage-promotion-card" key={active.id}>
        <div className={`homepage-promotion-media ${backgroundClass(active.backgroundPreset)}`}>
          {(active.desktopImageUrl || active.mobileImageUrl) && (
            <picture>
              {active.mobileImageUrl && (
                <source media="(max-width: 600px)" srcSet={active.mobileImageUrl} />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.desktopImageUrl || active.mobileImageUrl || ''}
                alt={active.imageAlt || active.title}
                width={1200}
                height={450}
                loading={activeIndex === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
              />
            </picture>
          )}
        </div>
        <div className="homepage-promotion-shade" />
        <div className="homepage-promotion-copy" key={`${active.id}-copy`}>
          {active.badgeText && <p className="homepage-promotion-badge">{active.badgeText}</p>}
          <h2>{active.title}</h2>
          {active.description && (
            <p className="homepage-promotion-description">{active.description}</p>
          )}
          {active.ctaLabel && active.destinationUrl && (
            <a
              className="homepage-promotion-cta"
              href={active.destinationUrl}
              rel={externalDestination ? 'noopener noreferrer' : undefined}
              aria-label={`${active.ctaLabel}: ${active.title}`}
            >
              {active.ctaLabel} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        {showControls && (
          <div className="homepage-promotion-controls" aria-label="Promotion carousel controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous promotion">
              <span aria-hidden="true">‹</span>
            </button>
            <span className="homepage-promotion-count" aria-live="off">
              {activeIndex + 1} / {promotions.length}
            </span>
            <button type="button" onClick={() => move(1)} aria-label="Next promotion">
              <span aria-hidden="true">›</span>
            </button>
          </div>
        )}
      </div>
      {showControls && (
        <div className="homepage-promotion-dots" role="group" aria-label="Choose a promotion">
          {promotions.map((promotion, index) => (
            <button
              key={promotion.id}
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              aria-label={`Show promotion ${index + 1}: ${promotion.title}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => {
                setActiveIndex(index);
                setPaused(true);
              }}
            />
          ))}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        Showing promotion {activeIndex + 1} of {promotions.length}: {active.title}
      </span>
    </section>
  );
}
