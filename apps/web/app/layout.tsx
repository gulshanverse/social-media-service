import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { DM_Sans, Space_Grotesk } from 'next/font/google';
import '@ggv/ui/src/styles.css';
import './globals.css';
import { SiteFooter } from '../components/SiteFooter';
import { PublicHeader } from '../components/PublicHeader';
import { SITE_ORIGIN } from '../lib/seo-routes';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: 'College Confession | Anonymous campus stories',
    template: '%s | College Confession',
  },
  description:
    'A moderated anonymous corner of campus for honest thoughts, stories, and conversation.',
  alternates: { canonical: SITE_ORIGIN },
  openGraph: {
    type: 'website',
    siteName: 'College Confession',
    title: 'College Confession',
    description: 'Anonymous campus stories, reviewed before publishing.',
    url: SITE_ORIGIN,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'College Confession',
    description: 'Anonymous campus stories, reviewed before publishing.',
  },
  other: {
    'google-adsense-account': 'ca-pub-8185076856023549',
  },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        <PublicHeader />
        {children}
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
