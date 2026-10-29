import { Suspense } from 'react';
import { ResultsClient } from '../../../components/vibematch/ResultsClient';
import { privatePageMetadata } from '../../../lib/metadata';

export const metadata = privatePageMetadata({
  title: 'Your Vibe DNA',
  description: 'A personalized VibeMatch result for your current session.',
  path: '/vibematch/results',
});
export default function VibeMatchResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsClient />
    </Suspense>
  );
}
