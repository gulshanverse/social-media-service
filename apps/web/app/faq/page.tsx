import type { Metadata } from 'next';
import { FaqPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';
import { AdSenseScript } from '../../components/AdSenseScript';

export const metadata: Metadata = publicPageMetadata({
  title: 'FAQ',
  description:
    'Answers about anonymous submissions, moderation, reports, privacy, and College Confession.',
  path: '/faq',
});

export default function FaqRoute() {
  return (
    <>
      <AdSenseScript eligible />
      <FaqPage />
    </>
  );
}
