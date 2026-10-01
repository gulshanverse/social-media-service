import type { Metadata } from 'next';
import { GuidelinesPage } from '../legal-pages';
import { AdSenseScript } from '../../components/AdSenseScript';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Community Guidelines',
  description: 'Clear rules for safe, respectful campus stories and anonymous posts.',
  path: '/community-guidelines',
});

export default function GuidelinesRoute() {
  return (
    <>
      <AdSenseScript eligible />
      <GuidelinesPage />
    </>
  );
}
