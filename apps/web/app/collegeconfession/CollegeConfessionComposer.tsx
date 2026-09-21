'use client';

import { useState } from 'react';
import { appConfig } from '@ggv/config';
import { createConfession } from '../../lib/api';

const prompts = [
  'Are u talking to anyone??',
  'Who is your current college crush?',
  "What is something you've never told anyone?",
  "What's your biggest college secret?",
  'Who do you secretly want to talk to?',
  "What's your funniest college memory?",
];

export default function CollegeConfessionComposer() {
  const [prompt, setPrompt] = useState(prompts[0]);
  const [content, setContent] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  function pickPrompt() {
    setPrompt((current) => {
      const choices = prompts.filter((item) => item !== current);
      return choices[Math.floor(Math.random() * choices.length)] ?? prompts[0];
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Write something before sending.');
      return;
    }
    if (trimmed.length > appConfig.maxConfessionLength) {
      setError(`Keep it under ${appConfig.maxConfessionLength} characters.`);
      return;
    }

    setError('');
    setState('loading');
    try {
      await createConfession({ content: trimmed, category: 'COLLEGE_LIFE', themeId: 'midnight' });
      setState('success');
    } catch {
      setState('error');
      setError('Something went wrong. Please try again.');
    }
  }

  if (state === 'success') {
    return (
      <section className="college-success" aria-live="polite">
        <div className="college-success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="college-success-eyebrow">CONFESSION RECEIVED</p>
        <h1>Your message is on its way.</h1>
        <p>Your anonymous confession has been sent for review.</p>
        <p className="college-success-note">Once approved, it may appear on College Confession.</p>
        <button
          className="college-secondary-action"
          type="button"
          onClick={() => {
            setContent('');
            setState('idle');
          }}
        >
          Send another
        </button>
      </section>
    );
  }

  return (
    <form className="college-composer" onSubmit={submit} noValidate>
      <div className="college-message-box">
        <label className="sr-only" htmlFor="college-confession-content">
          Your anonymous confession
        </label>
        <textarea
          id="college-confession-content"
          value={content}
          onChange={(event) =>
            setContent(event.target.value.slice(0, appConfig.maxConfessionLength))
          }
          placeholder={prompt}
          maxLength={appConfig.maxConfessionLength}
          aria-describedby="college-confession-counter"
          required
        />
        <button
          className="college-dice"
          type="button"
          onClick={pickPrompt}
          aria-label="Try another prompt"
        >
          🎲
        </button>
        <span className="college-counter" id="college-confession-counter">
          {content.length}/{appConfig.maxConfessionLength}
        </span>
      </div>

      <p className="college-anonymous-label">
        <span aria-hidden="true">🔒</span> anonymous q&amp;a
      </p>

      {error && (
        <p className="college-form-error" role="alert">
          {error}
        </p>
      )}

      <button className="college-send-button" type="submit" disabled={state === 'loading'}>
        {state === 'loading' ? 'Sending...' : 'SEND!'}
      </button>
    </form>
  );
}
