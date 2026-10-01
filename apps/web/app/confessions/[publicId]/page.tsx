import type { Metadata } from 'next';
import ConfessionDetailClient from './ConfessionDetailClient';
import { publicPageMetadata } from '../../../lib/metadata';

type Params = { publicId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { publicId } = await params;
  return publicPageMetadata({
    title: 'Community Confession',
    description: 'A community-submitted post shared on College Confession.',
    path: `/confessions/${encodeURIComponent(publicId)}`,
    indexable: false,
  });
}

export default async function ConfessionDetailPage({ params }: { params: Promise<Params> }) {
  const { publicId } = await params;
  return <ConfessionDetailClient publicId={publicId} />;
}
