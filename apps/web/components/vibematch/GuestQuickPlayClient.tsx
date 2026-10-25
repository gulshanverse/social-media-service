'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startGuestPlay } from '../../lib/vibematch/api';
import { vibeStorage } from '../../lib/vibematch/storage';
import { VibeMatchShell } from './VibeMatchShell';

export function GuestQuickPlayClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expired') === '1');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    const handle = instagramUsername.trim().replace(/^@/, '');
    if (name.length < 2 || name.length > 60) {
      setError('Enter a display name between 2 and 60 characters.');
      return;
    }
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
      setError('Enter an Instagram handle using 1–30 letters, numbers, periods, or underscores.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await startGuestPlay({ displayName: name, instagramUsername: handle });
      vibeStorage.setQuickPlay(true);
      vibeStorage.clearSession();
      router.push('/vibematch/play');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Quick Play could not start. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VibeMatchShell compact>
      <section className="vibe-guest-page" aria-labelledby="guest-title">
        <p className="vibe-kicker">
          <span>QUICK PLAY</span> / NO EMAIL REQUIRED
        </p>
        <h1 id="guest-title">Jump in. Find your vibe.</h1>
        <p className="vibe-guest-page__intro">
          Add a display name and Instagram handle to start the seven-round game. Your handle is
          user-provided and will not be verified or shown in public discovery.
        </p>
        {expired && (
          <p className="vibe-guest-expiry" role="status">
            Your Quick Play session expired after seven days. It can’t be recovered from this
            browser or another device. Start a new game below; previous progress won’t carry over.
          </p>
        )}
        <form className="vibe-guest-form" onSubmit={submit} noValidate>
          <label htmlFor="guest-display-name">Display name</label>
          <input
            id="guest-display-name"
            name="displayName"
            autoComplete="name"
            maxLength={60}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-describedby="guest-name-help"
          />
          <small id="guest-name-help">2–60 characters. This stays private to your game.</small>
          <label htmlFor="guest-instagram">Instagram handle</label>
          <div className="vibe-guest-handle">
            <span aria-hidden="true">@</span>
            <input
              id="guest-instagram"
              name="instagramUsername"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={31}
              required
              value={instagramUsername}
              onChange={(event) => setInstagramUsername(event.target.value)}
              aria-describedby="guest-instagram-help"
            />
          </div>
          <small id="guest-instagram-help">Letters, numbers, periods, and underscores only.</small>
          <p className="vibe-guest-form__privacy">
            Quick Play stores your name, handle, answers, and result in an expiring guest session
            for seven days. Progress is available on this browser while the session is valid; it
            cannot be recovered after expiry or on another device, and it is not automatically
            transferred to a profile.
          </p>
          {error && (
            <p className="vibe-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="vibe-primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Starting your game…' : 'Start Quick Play'}
          </button>
        </form>
        <p className="vibe-guest-profile-link">
          Want saved profile features? <Link href="/vibematch/create">Choose My Vibe Profile</Link>.
          Guest progress is not automatically transferred.
        </p>
      </section>
    </VibeMatchShell>
  );
}
