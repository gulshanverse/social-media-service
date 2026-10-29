import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publicPageMetadata } from '../../../lib/metadata';
import GarbaDetailClient from './GarbaDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return publicPageMetadata({
    title: 'Garba Post',
    description: 'A community Garba post on College Confession.',
    path: `/garba/${encodeURIComponent(publicId)}`,
    indexable: false,
  });
}

async function getPost(id: string) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  let response: Response;
  try {
    response = await fetch(`${api}/garba/${encodeURIComponent(id)}`, { cache: 'no-store' });
  } catch {
    return null;
  }
  if (response.status === 404) notFound();
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
export default async function GarbaDetail({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const post = await getPost(publicId);
  return post ? (
    <GarbaDetailClient post={post} />
  ) : (
    <main className="detail-page garba-page">
      <section className="state-panel">
        <h1>We couldn&apos;t load this Garba post.</h1>
        <p>Try again later, or return to the community board.</p>
        <Link className="ggv-button" href="/garba">
          Back to Garba
        </Link>
      </section>
    </main>
  );
}
