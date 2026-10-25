import type { Metadata } from 'next';
import { GuestQuickPlayClient } from '../../../components/vibematch/GuestQuickPlayClient';

export const metadata: Metadata = {
  title: 'Quick Play VibeMatch',
  description: 'Play VibeMatch without creating an email profile.',
};

export default function VibeMatchQuickPlayPage() {
  return <GuestQuickPlayClient />;
}
