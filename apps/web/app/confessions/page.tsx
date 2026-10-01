import type { Metadata } from 'next';
import ConfessionsFeed from './ConfessionsFeed';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Community Confessions',
  description: 'Read community-submitted campus confessions reviewed by moderators.',
  path: '/confessions',
  indexable: false,
});

type ConfessionsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ConfessionsPage({ searchParams }: ConfessionsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  return <ConfessionsFeed page={page} />;
}
