'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyMagicLink } from '../../lib/vibematch/api';
import { LoadingPanel, VibeMatchShell } from './VibeMatchShell';

export function MagicLinkVerification() {
  const router = useRouter();
  const initialized = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [isReadingLink, setIsReadingLink] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fragment = window.location.hash.slice(1);
    const linkToken = new URLSearchParams(fragment).get('token');
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    setToken(linkToken || null);
    if (!linkToken) setError('This sign-in link is missing or invalid. Request a new one.');
    setIsReadingLink(false);
  }, []);

  async function continueWithLink() {
    if (!token || isVerifying) return;
    setIsVerifying(true);
    setError('');
    try {
      const result = await verifyMagicLink(token);
      router.replace(result.hasProfile ? '/vibematch/play' : '/vibematch/create#verified');
    } catch {
      setToken(null);
      setError(
        'This sign-in link is invalid or expired. Return to VibeMatch and request a new one.',
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <VibeMatchShell compact>
      <section className="vibe-form-page" aria-labelledby="verify-vibe-title">
        <div className="vibe-form-intro">
          <p className="vibe-kicker">
            <span>V</span> PRIVATE SIGN-IN
          </p>
          <h1 id="verify-vibe-title">
            Your link is
            <br />
            <em>ready.</em>
          </h1>
          <p>Continue to VibeMatch to finish signing in. This one-time link is private to you.</p>
        </div>
        {isReadingLink || isVerifying ? (
          <LoadingPanel
            label={isVerifying ? 'Verifying your sign-in link…' : 'Checking your sign-in link…'}
          />
        ) : (
          <div className="vibe-form">
            {error && (
              <p className="vibe-form-error" role="alert">
                {error}
              </p>
            )}
            {token && (
              <button
                className="vibe-primary-button vibe-primary-button--full"
                type="button"
                onClick={() => void continueWithLink()}
                disabled={isVerifying}
              >
                Continue securely <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </section>
    </VibeMatchShell>
  );
}
