import Link from 'next/link';
import { SubmissionForm } from '../../components/SubmissionForm';

export default function SendPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/">
          <span className="brand-mark">
            ♛ <b>COLLEGE CONFESSION</b>
          </span>
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
