import type { Metadata } from 'next';
import { ReportPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Report Content',
  description: 'Report a published confession for moderator review.',
  path: '/report',
  indexable: false,
});

export default ReportPage;
