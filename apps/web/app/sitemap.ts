import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.confessions.live';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/about',
    '/how-it-works',
    '/faq',
    '/community-guidelines',
    '/safety',
    '/privacy',
    '/terms',
    '/contact',
  ];
  return routes.map((route) => ({
    url: route ? `${baseUrl}${route}` : `${baseUrl}/`,
    lastModified: new Date('2026-10-01T00:00:00.000Z'),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
