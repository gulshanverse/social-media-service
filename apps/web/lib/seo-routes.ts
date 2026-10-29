export const SITE_ORIGIN = 'https://www.confessions.live';

/**
 * Static pages deliberately eligible for indexing and sitemap publication.
 * User-generated detail/list pages and transactional/session routes are excluded.
 */
export const INDEXABLE_STATIC_ROUTES = [
  '/',
  '/about',
  '/how-it-works',
  '/faq',
  '/community-guidelines',
  '/safety',
  '/privacy',
  '/terms',
  '/contact',
  '/bawalbox',
  '/vibematch',
] as const;
