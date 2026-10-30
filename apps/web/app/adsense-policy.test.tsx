import { describe, expect, it } from 'vitest';
import { ADSENSE_ELIGIBLE_ROUTES, isAdSenseEligible } from '../components/AdSenseScript';

describe('AdSense route policy', () => {
  it('allows only exact informational routes when explicitly enabled', () => {
    expect(ADSENSE_ELIGIBLE_ROUTES).toEqual([
      '/about',
      '/how-it-works',
      '/faq',
      '/community-guidelines',
    ]);
    for (const route of ADSENSE_ELIGIBLE_ROUTES) expect(isAdSenseEligible(route, true)).toBe(true);
    for (const route of [
      '/',
      '/bawalbox',
      '/confessions',
      '/confessions/example',
      '/garba',
      '/send',
      '/report',
      '/vibematch/results',
      '/admin',
      '/about?campaign=test',
      '/about/extra',
    ]) {
      expect(isAdSenseEligible(route, true)).toBe(false);
    }
  });

  it('keeps ads disabled when the opt-in flag is absent or false', () => {
    expect(isAdSenseEligible('/about')).toBe(false);
    expect(isAdSenseEligible('/about', false)).toBe(false);
  });
});
