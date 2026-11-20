import type { Metadata } from 'next';
import ConfessionsFeed from './ConfessionsFeed';
import { publicPageMetadata } from '../../lib/metadata';
import { getHomepagePromotions, type ConfessionFeedQuery } from '../../lib/api';
import { SITE_ORIGIN } from '../../lib/seo-routes';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from '../../lib/social-preview';

const feedMetadata = publicPageMetadata({
  title: 'Community Confessions',
  description: 'Read community-submitted campus confessions reviewed by moderators.',
  path: '/confessions',
  indexable: false,
});

export const metadata: Metadata = {
  ...feedMetadata,
  openGraph: {
    ...feedMetadata.openGraph,
    images: [
      {
        url: `${SITE_ORIGIN}/confessions/opengraph-image`,
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        alt: 'College Confession anonymous community preview',
      },
    ],
  },
  twitter: {
    ...feedMetadata.twitter,
    card: 'summary_large_image',
    images: [`${SITE_ORIGIN}/confessions/opengraph-image`],
  },
};

type ConfessionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfessionsPage({ searchParams }: ConfessionsPageProps) {
  const params = await searchParams;
  const promotions = await getHomepagePromotions().catch(() => []);
  const value = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  const page = Math.max(1, Number(value('page') ?? 1) || 1);
  const dateRange = value('dateRange');
  const sort = value('sort');
  return (
    <ConfessionsFeed
      promotions={promotions}
      initialQuery={{
        page,
        search: value('search'),
        category: value('category'),
        customCategory: value('customCategory'),
        dateRange: ['all', 'today', '7d', '30d', 'custom'].includes(dateRange ?? '')
          ? (dateRange as ConfessionFeedQuery['dateRange'])
          : 'all',
        startDate: value('startDate'),
        endDate: value('endDate'),
        sort: ['newest', 'oldest', 'relevance'].includes(sort ?? '')
          ? (sort as ConfessionFeedQuery['sort'])
          : 'newest',
      }}
      initialLayout={value('layout') === 'horizontal' ? 'horizontal' : 'vertical'}
    />
  );
}
