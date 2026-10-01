import type { Metadata } from 'next';
import { TermsPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Terms of Service',
  description: 'Rules for submitting, reading, reporting, and moderating College Confession posts.',
  path: '/terms',
});

export default TermsPage;
