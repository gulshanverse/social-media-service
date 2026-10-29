import type { Metadata } from 'next';
import { LandingClient } from '../../components/vibematch/LandingClient';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'VibeMatch',
  description:
    'Explore VibeMatch, a private choice-based social game, and learn how its sessions work.',
  path: '/vibematch',
});
export default function VibeMatchPage() {
  return <LandingClient />;
}
