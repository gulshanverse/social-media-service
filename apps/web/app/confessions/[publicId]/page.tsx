import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ConfessionDetailClient from './ConfessionDetailClient';
import { ApiRequestError, getConfession } from '../../../lib/api';
import type { PublicConfession } from '@ggv/types';
import { publicPageMetadata } from '../../../lib/metadata';
import { SITE_ORIGIN } from '../../../lib/seo-routes';
import {
  getPublicConfessionForPreview,
  previewDescription,
  previewTitle,
} from '../../../lib/social-preview';

type Params = { publicId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { publicId } = await params;
  const encodedId = encodeURIComponent(publicId);
  const confession = await getPublicConfessionForPreview(publicId);
  if (!confession)
    return { title: 'Confession unavailable', robots: { index: false, follow: true } };
  const metadata = publicPageMetadata({
    title: previewTitle(confession),
    description: previewDescription(confession),
    path: `/confessions/${encodedId}`,
    indexable: false,
  });
  const image = `${SITE_ORIGIN}/confessions/${encodedId}/opengraph-image`;
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: 'College Confession preview' }],
    },
    twitter: { ...metadata.twitter, card: 'summary_large_image', images: [image] },
  };
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
