import type { Metadata } from 'next';
import { GameplayClient } from '../../../components/vibematch/GameplayClient';

export const metadata: Metadata = { title: 'Play VibeMatch' };
export default function VibeMatchPlayPage() {
  return <GameplayClient />;
}
