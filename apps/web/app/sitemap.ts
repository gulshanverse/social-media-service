import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.confessions.live';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/confessions',
    '/send',
    '/about',
    '/community-guidelines',
    '/privacy',
    '/terms',
    '/contact',
    '/report',
  ];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/confessions' ? 'daily' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
