import type { Metadata } from 'next';
import { BawalBoxClient, type BawalBoxPage } from './BawalBoxClient';

export const metadata: Metadata = {
  title: 'BawalBox — Anonymous campus questions',
  description: 'Ask, answer, and discover the questions shaping campus life.',
  alternates: { canonical: 'https://www.confessions.live/bawalbox' },
  openGraph: {
    title: 'BawalBox — Sawaal ek, bawal anek!',
    description: 'Anonymous campus questions and community answers.',
    url: 'https://www.confessions.live/bawalbox',
  },
};

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
