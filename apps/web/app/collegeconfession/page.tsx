import type { Metadata } from 'next';
import Link from 'next/link';
import CollegeConfessionComposer from './CollegeConfessionComposer';

export const metadata: Metadata = {
  title: 'College Confession',
  description: 'Send an anonymous confession to the College Confession community.',
  alternates: { canonical: 'https://www.confessions.live/collegeconfession' },
  openGraph: {
    title: 'College Confession',
    description: 'Send an anonymous confession to the College Confession community.',
    url: 'https://www.confessions.live/collegeconfession',
    type: 'website',
  },
};

export default function CollegeConfessionPage() {
  return (
    <main className="college-profile-page">
      <div className="college-profile-card">
        <header className="college-profile-header">
          <div className="college-profile-avatar" aria-hidden="true">
            ♛
          </div>
          <div>
            <p className="college-profile-handle">@college.confession.ggv</p>
            <p className="college-profile-tagline">
              send me anonymous weekly
              <br />
              <strong>Confession!</strong>
            </p>
          </div>
        </header>

        <CollegeConfessionComposer />

        <section className="college-community-note" aria-label="Community invitation">
          <p>👇 Join your college confession community 👇</p>
          <Link className="college-own-messages" href="/send">
            Get your own messages!
          </Link>
        </section>

        <nav className="college-profile-legal" aria-label="Legal links">
          <Link href="/terms">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
    </main>
  );
}
