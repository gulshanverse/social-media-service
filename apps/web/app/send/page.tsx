import Link from 'next/link';
import { Logo } from '@ggv/ui';
import { SubmissionForm } from '../../components/SubmissionForm';

export default function SendPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/">
          <Logo />
        </Link>
        <Link className="back-link" href="/confessions">
          View community ↗
        </Link>
      </header>
      <div className="form-page">
        <SubmissionForm />
      </div>
    </main>
  );
}
