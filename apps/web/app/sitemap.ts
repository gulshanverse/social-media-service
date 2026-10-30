import type { MetadataRoute } from 'next';
import { INDEXABLE_STATIC_ROUTES, SITE_ORIGIN } from '../lib/seo-routes';

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_STATIC_ROUTES.map((route) => ({
    url: route === '/' ? SITE_ORIGIN : new URL(route, SITE_ORIGIN).toString(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
