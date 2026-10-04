import type { MetadataRoute } from 'next';

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
    sitemap: 'https://www.confessions.live/sitemap.xml',
  };
}
