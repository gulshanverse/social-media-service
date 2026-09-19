'use client';

import { useState } from 'react';
import Link from 'next/link';
import { appConfig } from '@ggv/config';
import { confessionCategories } from '@ggv/types';
import { themes } from '@ggv/themes';
import { createConfession } from '../lib/api';

const categoryNames: Record<string, string> = {
  COLLEGE_LIFE: 'College Life',
  CRUSH: 'Crush',
  RELATIONSHIP: 'Relationship',
  FRIENDSHIP: 'Friendship',
  FUNNY: 'Funny',
  ADVICE: 'Advice',
  APPRECIATION: 'Appreciation',
  RANT: 'Rant',
  OTHER: 'Other',
};

export function SubmissionForm() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [themeId, setThemeId] = useState('midnight');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return setError('Write something before sending your confession.');
    if (trimmed.length > appConfig.maxConfessionLength)
      return setError(`Keep your confession under ${appConfig.maxConfessionLength} characters.`);
    setState('loading');
    setError('');
    try {
      await createConfession({ content: trimmed, category: category || undefined, themeId });
      setState('success');
    } catch (caught) {
      setState('error');
      setError(caught instanceof Error ? caught.message : 'We could not send that confession.');
    }
  }

  if (state === 'success')
    return (
      <section className="success-panel">
        <div className="success-icon">✓</div>
        <p className="eyebrow">CONFESSION RECEIVED</p>
        <h2>Your secret is safe with us.</h2>
        <p>
          Your anonymous confession is now pending review. It will only appear publicly if approved
          by the community team.
        </p>
        <div className="button-row">
          <button
            className="ggv-button"
            onClick={() => {
              setContent('');
              setCategory('');
              setState('idle');
            }}
          >
            Send another
          </button>
          <Link className="ghost-button" href="/confessions">
            View community
          </Link>
        </div>
      </section>
    );

  return (
    <form className="submission-form" onSubmit={submit} noValidate>
      <div className="form-intro">
        <p className="eyebrow">ANONYMOUS DROPBOX</p>
        <h1>
          Say what you <span>really</span> think.
        </h1>
        <p>
          No names. No logins. Just your honest campus story. Every confession is reviewed before it
          can be published.
        </p>
      </div>
      <label htmlFor="content">
        Your confession <span className="required">required</span>
      </label>
      <textarea
        id="content"
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, appConfig.maxConfessionLength))}
        placeholder="A crush, a rant, a moment you can't stop thinking about…"
        maxLength={appConfig.maxConfessionLength}
        aria-describedby="counter"
        required
      />
      <div className="form-meta">
        <span id="counter">
          {content.length}/{appConfig.maxConfessionLength}
        </span>
        <span>Be kind. Be real.</span>
      </div>
      <div className="form-grid">
        <label htmlFor="category">
          Category <span>optional</span>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Choose a vibe</option>
            {confessionCategories.map((item) => (
              <option key={item} value={item}>
                {categoryNames[item]}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="theme">
          Card theme <span>optional</span>
          <select id="theme" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="theme-strip" aria-label="Theme previews">
        {themes.map((theme) => (
          <button
            type="button"
            key={theme.id}
            className={`theme-dot ${themeId === theme.id ? 'theme-dot--active' : ''}`}
            style={{ background: theme.gradient }}
            onClick={() => setThemeId(theme.id)}
            aria-label={`Use ${theme.name} theme`}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="ggv-button submit-button" type="submit" disabled={state === 'loading'}>
        {state === 'loading' ? 'Sending securely…' : 'Send Anonymously 💌'}
      </button>
      <p className="privacy-note">
        Anonymous submissions are moderated. Your identity is never requested or shown.
      </p>
    </form>
  );
}
