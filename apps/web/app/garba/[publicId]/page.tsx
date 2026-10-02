import type { Metadata } from 'next';
import Link from 'next/link';
import { publicPageMetadata } from '../../../lib/metadata';
import GarbaDetailClient from './GarbaDetailClient';

export const metadata: Metadata = publicPageMetadata({ title: 'Garba Post', description: 'A community Garba post on CollegeConfession.', path: '/garba', indexable: false });

async function getPost(id: string) { const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'; const response = await fetch(`${api}/garba/${encodeURIComponent(id)}`, { cache: 'no-store' }); return response.ok ? response.json() : null; }
export default async function GarbaDetail({ params }: { params: Promise<{ publicId: string }> }) { const { publicId } = await params; const post = await getPost(publicId); return post ? <GarbaDetailClient post={post} /> : <main className="detail-page garba-page"><section className="state-panel"><h1>This Garba post is unavailable.</h1><p>It may have been removed or is still being reviewed.</p><Link className="ggv-button" href="/garba">Back to Garba</Link></section></main>; }
