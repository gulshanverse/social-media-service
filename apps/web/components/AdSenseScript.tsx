import Script from 'next/script';

const INFORMATIONAL_ADS_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_INFO_PAGES_ENABLED === 'true';

/**
 * AdSense is intentionally off unless an owner explicitly enables the informational-page flag.
 * Call this only from eligible informational routes; never from UGC, report, submission, or admin routes.
 */
export function AdSenseScript({ eligible = false }: { eligible?: boolean }) {
  if (!eligible || !INFORMATIONAL_ADS_ENABLED) return null;

  return (
    <Script
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8185076856023549"
      crossOrigin="anonymous"
    />
  );
}
