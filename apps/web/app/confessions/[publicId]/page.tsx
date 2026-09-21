import type { Metadata } from 'next';
import ConfessionDetailClient from './ConfessionDetailClient';

type Params = { publicId: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const publicUrl = 'https://www.confessions.live';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { publicId } = await params;
  try {
    const response = await fetch(`${apiUrl}/confessions/${encodeURIComponent(publicId)}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok)
      return {
        title: 'Confession unavailable | College Confession',
        robots: { index: false, follow: false },
      };
    const confession = (await response.json()) as { content: string; publishedAt: string };
    const preview =
      confession.content.length > 150 ? `${confession.content.slice(0, 147)}…` : confession.content;
    const url = `${publicUrl}/confessions/${encodeURIComponent(publicId)}`;
    return {
      title: 'College Confession',
      description: preview,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
        url,
        title: 'COLLEGE CONFESSION',
        description: `“${preview}”`,
        siteName: 'College Confession',
        images: [`${url}/opengraph-image`],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'COLLEGE CONFESSION',
        description: `“${preview}”`,
        images: [`${url}/opengraph-image`],
      },
    };
  } catch {
    return { title: 'College Confession', robots: { index: false, follow: false } };
  }
}

export default async function ConfessionDetailPage({ params }: { params: Promise<Params> }) {
  const { publicId } = await params;
  return <ConfessionDetailClient publicId={publicId} />;
}
