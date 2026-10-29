import type { Metadata } from 'next';
import { SITE_ORIGIN } from './seo-routes';

type PublicPageMetadata = {
  title: string;
  description: string;
  path: string;
  indexable?: boolean;
};

export function publicPageMetadata({
  title,
  description,
  path,
  indexable = true,
}: PublicPageMetadata): Metadata {
  const canonical = path === '/' ? SITE_ORIGIN : new URL(path, SITE_ORIGIN).toString();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: 'College Confession',
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export function privatePageMetadata({
  title,
  description,
  path,
}: Omit<PublicPageMetadata, 'indexable'>): Metadata {
  return publicPageMetadata({ title, description, path, indexable: false });
}

export function unavailablePageMetadata({
  title,
  description,
}: Pick<PublicPageMetadata, 'title' | 'description'>): Metadata {
  return {
    title,
    description,
    alternates: { canonical: null },
    robots: { index: false, follow: true },
  };
}
