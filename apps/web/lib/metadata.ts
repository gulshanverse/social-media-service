import type { Metadata } from 'next';

const SITE_URL = 'https://www.confessions.live';

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
  const canonical = new URL(path, SITE_URL).toString();

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
