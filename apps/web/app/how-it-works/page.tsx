import type { Metadata } from 'next';
import { HowItWorksPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';
import { AdSenseScript } from '../../components/AdSenseScript';

export const metadata: Metadata = publicPageMetadata({
  title: 'How It Works',
  description:
    'Learn how College Confession handles submissions, human review, publication, and reporting.',
  path: '/how-it-works',
});

export default function HowItWorksRoute() {
  return (
    <>
      <AdSenseScript eligible />
      <HowItWorksPage />
    </>
  );
}
