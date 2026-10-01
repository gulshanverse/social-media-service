import type { Metadata } from 'next';
import { SubmissionForm } from '../../components/SubmissionForm';
import { publicPageMetadata } from '../../lib/metadata';

export const metadata: Metadata = publicPageMetadata({
  title: 'Send a Confession',
  description: 'Submit a campus confession for human moderator review.',
  path: '/send',
  indexable: false,
});

export default function SendPage() {
  return (
    <main className="site-shell">
      <div className="form-page">
        <SubmissionForm />
      </div>
    </main>
  );
}
