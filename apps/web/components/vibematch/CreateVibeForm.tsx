'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VibeProfile } from '@ggv/types';
import { vibeStorage } from '../../lib/vibematch/storage';
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
  const [name, setName] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [college, setCollege] = useState('');
  const [primaryIntent, setPrimaryIntent] = useState('');
  const [secondaryIntent, setSecondaryIntent] = useState('');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !college.trim() || !primaryIntent) {
      setError('Add your name, college, and a primary intent to continue.');
      return;
    }
    if (secondaryIntent && secondaryIntent === primaryIntent) {
      setError('Choose a different secondary intent, or leave it blank.');
      return;
    }
    const profile: VibeProfile = {
      id: `profile-${Date.now()}`,
      name: name.trim(),
      instagramUsername: instagramUsername.trim().replace(/^@/, '') || undefined,
      college: college.trim(),
      primaryIntent,
      secondaryIntent: secondaryIntent || undefined,
      ageConfirmed: true,
    };
    vibeStorage.setProfile(profile);
    vibeStorage.clearSession();
    router.push('/vibematch/play');
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
          <label>
            <span>
              Name or nickname <i>required</i>
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
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
                onChange={(event) => setInstagramUsername(event.target.value)}
                placeholder="yourhandle"
                autoComplete="off"
              />
            </div>
          </label>
          <label>
            <span>
              College <i>required</i>
            </span>
            <input
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              placeholder="Where is your campus energy?"
              autoComplete="organization"
            />
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
            <select
              value={secondaryIntent}
              onChange={(event) => setSecondaryIntent(event.target.value)}
            >
              <option value="">Keep it open</option>
              {intents
                .filter((intent) => intent !== primaryIntent)
                .map((intent) => (
                  <option key={intent}>{intent}</option>
                ))}
            </select>
          </label>
          <label className="vibe-age-check">
            <input type="checkbox" checked readOnly />{' '}
            <span>
              I confirm I’m 18 or older and understand this is a social matching experience.
            </span>
          </label>
          {error && (
            <p className="vibe-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="vibe-primary-button vibe-primary-button--full" type="submit">
            Start My Vibe <span aria-hidden="true">→</span>
          </button>
          <PrivacyNote />
        </form>
      </section>
    </VibeMatchShell>
  );
}
