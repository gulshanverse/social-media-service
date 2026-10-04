import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ConfessionDetailClient from './ConfessionDetailClient';
import { ApiRequestError, getConfession } from '../../../lib/api';
import type { PublicConfession } from '@ggv/types';
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
  let initialConfession: PublicConfession | undefined;
  try {
    initialConfession = await getConfession(publicId);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
  }
  return <ConfessionDetailClient publicId={publicId} initialConfession={initialConfession} />;
}
