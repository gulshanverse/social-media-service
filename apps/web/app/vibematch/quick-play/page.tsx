import { GuestQuickPlayClient } from '../../../components/vibematch/GuestQuickPlayClient';
import { privatePageMetadata } from '../../../lib/metadata';

export const metadata = privatePageMetadata({
  title: 'Quick Play VibeMatch',
  description: 'Play VibeMatch without creating an email profile.',
  path: '/vibematch/quick-play',
});

export default function VibeMatchQuickPlayPage() {
  return <GuestQuickPlayClient />;
}
