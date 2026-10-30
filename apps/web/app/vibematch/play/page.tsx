import { GameplayClient } from '../../../components/vibematch/GameplayClient';
import { privatePageMetadata } from '../../../lib/metadata';

export const metadata = privatePageMetadata({
  title: 'Play VibeMatch',
  description: 'Play through your private VibeMatch session.',
  path: '/vibematch/play',
});
export default function VibeMatchPlayPage() {
  return <GameplayClient />;
}
