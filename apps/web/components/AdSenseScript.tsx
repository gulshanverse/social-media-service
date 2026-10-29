import Script from 'next/script';

export const ADSENSE_ELIGIBLE_ROUTES = [
  '/about',
  '/how-it-works',
  '/faq',
  '/community-guidelines',
] as const;

export function isAdSenseEligible(
  route: string,
  enabled = process.env.NEXT_PUBLIC_ADSENSE_INFO_PAGES_ENABLED === 'true',
) {
  return (
    enabled && ADSENSE_ELIGIBLE_ROUTES.includes(route as (typeof ADSENSE_ELIGIBLE_ROUTES)[number])
  );
}

/**
 * AdSense is intentionally off unless an owner explicitly enables the informational-page flag.
 * Route allowlisting and an explicit build-time opt-in are both required. Never use on UGC,
 * report, submission, utility, session, or admin routes.
 */
export function AdSenseScript({ route }: { route: string }) {
  if (!isAdSenseEligible(route)) return null;

  return (
    <Script
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8185076856023549"
      crossOrigin="anonymous"
    />
  );
}
