import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '../lib/seo-routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/confessions',
          '/about',
          '/how-it-works',
          '/faq',
          '/community-guidelines',
          '/safety',
          '/privacy',
          '/terms',
          '/contact',
          '/report',
        ],
        disallow: ['/admin', '/private', '/pending', '/api'],
      },
    ],
    sitemap: new URL('/sitemap.xml', SITE_ORIGIN).toString(),
  };
}
