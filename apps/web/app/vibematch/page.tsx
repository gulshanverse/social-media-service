import type { Metadata } from 'next';
import { LandingClient } from '../../components/vibematch/LandingClient';

export const metadata: Metadata = {
  title: 'VibeMatch',
  description: 'A private social game built from your choices.',
};
export default function VibeMatchPage() {
  return <LandingClient />;
}
