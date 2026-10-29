import type { Metadata } from 'next';
import { BawalBoxClient, type BawalBoxPage } from './BawalBoxClient';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'BawalBox',
  description: 'Ask anonymous campus questions, read approved answers, and participate safely.',
  path: '/bawalbox',
});

export const dynamic = 'force-dynamic';

async function loadPage(): Promise<BawalBoxPage | null> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const response = await fetch(`${api}/bawalbox`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as BawalBoxPage;
  } catch {
    return null;
  }
}

export default async function BawalBoxPage() {
  const data = await loadPage();
  return <BawalBoxClient data={data} />;
}
