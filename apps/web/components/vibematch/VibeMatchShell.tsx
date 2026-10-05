import Link from 'next/link';

export function VibeMatchShell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <main className={`vibe-shell ${compact ? 'vibe-shell--compact' : ''}`}>
      <div className="vibe-grid-noise" aria-hidden="true" />
      <div className="vibe-shell__topbar">
        <Link className="vibe-wordmark" href="/vibematch" aria-label="VibeMatch home">
          <span className="vibe-wordmark__mark">V</span>
          <span>VibeMatch</span>
        </Link>
        <span className="vibe-topbar__status">
          <i /> private game
        </span>
      </div>
      {children}
    </main>
  );
}

export function PrivacyNote() {
  return (
    <p className="vibe-privacy-note">
      <span aria-hidden="true">✦</span> Your VibeMatch identity stays separate from anonymous
      confessions.
    </p>
  );
}

export function LoadingPanel({ label = 'Loading your vibe…' }: { label?: string }) {
  return (
    <div className="vibe-loading" role="status">
      <span className="vibe-loading__orb" />
      {label}
    </div>
  );
}
