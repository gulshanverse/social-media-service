import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import '@ggv/ui/src/styles.css';
import './globals.css';
import { SiteFooter } from '../components/SiteFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.confessions.live'),
  title: {
    default: 'College Confession | Anonymous campus stories',
    template: '%s | College Confession',
  },
  description:
    'A moderated anonymous corner of campus for honest thoughts, stories, and conversation.',
  alternates: { canonical: 'https://www.confessions.live' },
  openGraph: {
    type: 'website',
    siteName: 'College Confession',
    title: 'College Confession',
    description: 'Anonymous campus stories, reviewed before publishing.',
    url: 'https://www.confessions.live',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'College Confession',
    description: 'Anonymous campus stories, reviewed before publishing.',
  },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
