import type { Metadata } from 'next';
import { PrivacyPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Privacy Policy',
  description:
    'What College Confession receives, how moderation data is handled, and your privacy choices.',
  path: '/privacy',
});

export default PrivacyPage;
