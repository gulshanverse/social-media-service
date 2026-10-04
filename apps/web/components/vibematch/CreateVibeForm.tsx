'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '../../lib/api';
import {
  getProfile,
  requestMagicLink,
  saveProfile,
  verifyMagicLink,
  type ServerProfile,
} from '../../lib/vibematch/api';
import { PrivacyNote, VibeMatchShell } from './VibeMatchShell';
const intents = [
  'Someone special',
  'New friends',
  'Event partner',
  'Study buddy',
  'Gaming buddy',
  'Just meeting people',
];
export function CreateVibeForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [college, setCollege] = useState('vibe-college-generic');
  const [primaryIntent, setPrimaryIntent] = useState('');
  const [secondaryIntent, setSecondaryIntent] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [profile, setProfile] = useState<ServerProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    getProfile()
      .then((value) => {
        if (value) {
          setProfile(value);
          setName(value.displayName);
          setInstagramUsername(value.instagramUsername ?? '');
          setCollege(value.college.id);
          setPrimaryIntent(value.primaryIntent);
          setSecondaryIntent(value.secondaryIntent ?? '');
          setAgeConfirmed(true);
        }
      })
      .catch(() => undefined);
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() && !profile) {
      setError('Enter your email to receive a private sign-in link.');
      return;
    }
    if (!name.trim() || !college || !primaryIntent || !ageConfirmed) {
      setError('Add your name, college, primary intent, and confirm you are 18 or older.');
      return;
    }
    if (secondaryIntent === primaryIntent) {
      setError('Choose a different secondary intent, or leave it blank.');
      return;
    }
    setBusy(true);
    try {
      if (!profile) {
        const link = await requestMagicLink(email);
        if (link.developmentToken) await verifyMagicLink(link.developmentToken);
        else {
          setNotice(link.message);
          return;
        }
      }
      await saveProfile(
        {
          displayName: name.trim(),
          instagramUsername: instagramUsername.trim().replace(/^@/, '') || undefined,
          collegeId: college,
          primaryIntent,
          secondaryIntent: secondaryIntent || undefined,
          ageConfirmed,
          interests: [],
        },
        Boolean(profile),
      );
      router.push('/vibematch/play');
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Unable to save your VibeMatch profile. Please retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <VibeMatchShell compact>
      <section className="vibe-form-page" aria-labelledby="create-vibe-title">
        <div className="vibe-form-intro">
          <p className="vibe-kicker">
            <span>02</span> CREATE YOUR VIBE
          </p>
          <h1 id="create-vibe-title">
            A little context.
            <br />
            <em>Then we play.</em>
          </h1>
          <p>
            Use a nickname if you want. Your Instagram is optional and never shown automatically.
          </p>
        </div>
        <form className="vibe-form" onSubmit={submit} noValidate>
          {!profile && (
            <label>
              <span>
                Private email <i>required for sign-in</i>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}
          <label>
            <span>
              Name or nickname <i>required</i>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              autoComplete="nickname"
            />
          </label>
          <label>
            <span>
              Instagram username <i>optional</i>
            </span>
            <div className="vibe-input-prefix">
              <b>@</b>
              <input
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                placeholder="yourhandle"
                autoComplete="off"
              />
            </div>
          </label>
          <label>
            <span>
              College <i>required</i>
            </span>
            <input value="Campus community" readOnly aria-label="College" />
          </label>
          <fieldset>
            <legend>
              What are you open to? <i>pick one primary</i>
            </legend>
            <div className="vibe-intent-grid">
              {intents.map((intent) => (
                <button
                  key={intent}
                  className={primaryIntent === intent ? 'is-selected' : ''}
                  type="button"
                  onClick={() => setPrimaryIntent(intent)}
                  aria-pressed={primaryIntent === intent}
                >
                  {intent}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span>
              One more thing <i>optional secondary</i>
            </span>
            <select value={secondaryIntent} onChange={(e) => setSecondaryIntent(e.target.value)}>
              <option value="">Keep it open</option>
              {intents
                .filter((i) => i !== primaryIntent)
                .map((intent) => (
                  <option key={intent}>{intent}</option>
                ))}
            </select>
          </label>
          <label className="vibe-age-check">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />{' '}
            <span>
              I confirm I’m 18 or older and understand this is a social matching experience.
            </span>
          </label>
          {notice && (
            <p className="vibe-form-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="vibe-form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="vibe-primary-button vibe-primary-button--full"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Saving…' : profile ? 'Save My Vibe' : 'Start My Vibe'}{' '}
            <span aria-hidden="true">→</span>
          </button>
          <PrivacyNote />
        </form>
      </section>
    </VibeMatchShell>
  );
}
