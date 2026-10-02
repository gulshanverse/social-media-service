import type { Metadata } from 'next';
import GarbaClient from './GarbaClient';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Garba Community',
  description: 'Find your Garba circle, connect with your community, and discover Garba plans this Navratri.',
  path: '/garba',
  indexable: false,
});

export default function GarbaPage() { return <GarbaClient />; }
