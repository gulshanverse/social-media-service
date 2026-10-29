import { describe, expect, it } from 'vitest';
import sitemap from './sitemap';
import robots from './robots';
import { privatePageMetadata, publicPageMetadata, unavailablePageMetadata } from '../lib/metadata';
import { INDEXABLE_STATIC_ROUTES, SITE_ORIGIN } from '../lib/seo-routes';

describe('public SEO route policy', () => {
  it('publishes only the canonical static informational and feature landing routes', () => {
    const entries = sitemap();
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual(INDEXABLE_STATIC_ROUTES);
    expect(entries.every((entry) => new URL(entry.url).origin === SITE_ORIGIN)).toBe(true);
    expect(entries[0].url).toBe(SITE_ORIGIN);
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
    expect(entries.some((entry) => entry.url.includes('?'))).toBe(false);
    for (const excluded of [
      '/confessions',
      '/confessions/sample',
      '/send',
      '/report',
      '/garba',
      '/garba/sample',
      '/vibematch/create',
      '/vibematch/play',
      '/vibematch/quick-play',
      '/vibematch/results',
      '/vibematch/verify',
      '/admin',
      '/api',
    ]) {
      expect(entries.some((entry) => new URL(entry.url).pathname === excluded)).toBe(false);
    }
  });

  it('references the canonical sitemap and does not treat robots rules as authorization', () => {
    const result = robots();
    expect(result.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules.some((rule) => rule.disallow?.includes('/admin'))).toBe(true);
    expect(rules.some((rule) => rule.disallow?.includes('/api'))).toBe(true);
  });

  it('uses a canonical production URL for public pages and noindex for private pages', () => {
    const publicMetadata = publicPageMetadata({
      title: 'Example public landing',
      description: 'Useful public information.',
      path: '/bawalbox',
    });
    expect(publicMetadata.alternates?.canonical).toBe(`${SITE_ORIGIN}/bawalbox`);
    expect(publicMetadata.robots).toBeUndefined();

    expect(
      publicPageMetadata({ title: 'Home', description: 'Public homepage.', path: '/' }).alternates
        ?.canonical,
    ).toBe(SITE_ORIGIN);

    const privateMetadata = privatePageMetadata({
      title: 'Private session',
      description: 'A session-dependent page.',
      path: '/vibematch/results',
    });
    expect(privateMetadata.alternates?.canonical).toBe(`${SITE_ORIGIN}/vibematch/results`);
    expect(privateMetadata.robots).toEqual({ index: false, follow: true });

    const unavailableMetadata = unavailablePageMetadata({
      title: 'Page Not Found',
      description: 'This page could not be found.',
    });
    expect(unavailableMetadata.alternates?.canonical).toBeNull();
    expect(unavailableMetadata.robots).toEqual({ index: false, follow: true });
  });
});
