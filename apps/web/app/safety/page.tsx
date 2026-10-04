import type { Metadata } from 'next';
import { SafetyPage } from '../legal-pages';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Safety & Moderation',
  description:
    'How College Confession protects personal information, moderates community posts, and handles reports.',
  path: '/safety',
});

export default SafetyPage;
