import type { Metadata } from 'next';
import { ContactPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Contact',
  description:
    'Contact the College Confession community team about moderation, privacy, or accessibility.',
  path: '/contact',
});

export default ContactPage;
