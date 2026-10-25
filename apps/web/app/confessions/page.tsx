import type { Metadata } from 'next';
import ConfessionsFeed from './ConfessionsFeed';
import { publicPageMetadata } from '../../lib/metadata';
import type { ConfessionFeedQuery } from '../../lib/api';

export const metadata: Metadata = publicPageMetadata({
  title: 'Community Confessions',
  description: 'Read community-submitted campus confessions reviewed by moderators.',
  path: '/confessions',
  indexable: false,
});

type ConfessionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfessionsPage({ searchParams }: ConfessionsPageProps) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  const page = Math.max(1, Number(value('page') ?? 1) || 1);
  const dateRange = value('dateRange');
  const sort = value('sort');
  return (
    <ConfessionsFeed
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
    />
  );
}
