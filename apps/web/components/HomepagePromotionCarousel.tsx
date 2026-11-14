'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicHomepagePromotion, PublicPromotionTheme, PromotionLayoutSettings } from '@ggv/types';
import { HomepagePromotionBanner } from '@ggv/ui';
import type { PublicHomepagePromotion as ApiPromotion } from '../lib/api';

type Props = { promotions: PublicHomepagePromotion[] };
const FALLBACK_THEME: PublicPromotionTheme = {
  id: 'midnight', name: 'Midnight', background: '#090c21', gradient: 'linear-gradient(125deg,#090c21,#211447 52%,#5d275c)', textColor: '#fff', accentColor: '#c36cff', fontFamily: 'Inter', radius: '24px',
};
const FALLBACK_LAYOUT: PromotionLayoutSettings = {
  version: 1, mode: 'auto', headingFont: 'inherit', bodyFont: 'inherit', headingSize: 3.2, descriptionSize: 1, headingWeight: 800, descriptionWeight: 500, headingLineHeight: 1.02, descriptionLineHeight: 1.45, letterSpacing: 'tight', headingTransform: 'none', alignment: 'left', horizontalPosition: 'left', verticalPosition: 'bottom', contentWidth: 'standard', padding: 'comfortable', spacing: 'comfortable',
};

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
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2), { threshold: [0, 0.2, 0.5] });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (promotions.length < 2 || paused || !visible || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setActiveIndex((index) => (index + 1) % promotions.length);
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
    if (typeof distance === 'number' && Math.abs(distance) > 45 && showControls) move(distance < 0 ? 1 : -1);
  }
  const controls = showControls ? (
    <div className="homepage-promotion-controls" aria-label="Promotion carousel controls">
      <button type="button" onClick={() => move(-1)} aria-label="Previous promotion"><span aria-hidden="true">‹</span></button>
      <span className="homepage-promotion-count" aria-live="off">{activeIndex + 1} / {promotions.length}</span>
      <button type="button" onClick={() => move(1)} aria-label="Next promotion"><span aria-hidden="true">›</span></button>
    </div>
  ) : undefined;
  return (
    <section className="homepage-promotions" aria-label="Campus announcements and promotions" aria-roledescription="carousel" ref={carouselRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; setPaused(true); }} onTouchEnd={onTouchEnd}>
      <HomepagePromotionBanner promotion={active as ApiPromotion} theme={active.theme ?? FALLBACK_THEME} layoutSettings={active.layoutSettings ?? FALLBACK_LAYOUT} className={`promotion-background--${['aurora', 'sunset', 'ocean', 'midnight'].includes(active.backgroundPreset) ? active.backgroundPreset : 'aurora'}`} controls={controls} />
      {showControls && <div className="homepage-promotion-dots" role="group" aria-label="Choose a promotion">{promotions.map((promotion, index) => <button key={promotion.id} type="button" className={index === activeIndex ? 'is-active' : ''} aria-label={`Show promotion ${index + 1}: ${promotion.title}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => { setActiveIndex(index); setPaused(true); }} />)}</div>}
      <span className="sr-only" aria-live="polite">Showing promotion {activeIndex + 1} of {promotions.length}: {active.title}</span>
    </section>
  );
}
