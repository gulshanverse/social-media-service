import type { Metadata } from 'next';
import { ResultsClient } from '../../../components/vibematch/ResultsClient';

export const metadata: Metadata = { title: 'Your Vibe DNA' };
export default function VibeMatchResultsPage() {
  return <ResultsClient />;
}
