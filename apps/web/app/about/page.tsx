import type { Metadata } from 'next';
import { AboutPage } from '../legal-pages';
import { AdSenseScript } from '../../components/AdSenseScript';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'About',
  description: 'What College Confession is, how anonymous sharing works, and how to stay safe.',
  path: '/about',
});

export default function AboutRoute() {
  return (
    <>
      <AdSenseScript eligible />
      <AboutPage />
    </>
  );
}
