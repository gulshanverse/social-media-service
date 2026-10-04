'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VibeQuestion, VibeSession } from '@ggv/types';
import { answerSession, createSession } from '../../lib/vibematch/engine';
import { mockQuestions } from '../../lib/vibematch/questions';
import { vibeStorage } from '../../lib/vibematch/storage';
import { LoadingPanel, VibeMatchShell } from './VibeMatchShell';

export function GameplayClient() {
  const router = useRouter();
  const [profileReady, setProfileReady] = useState(false);
  const [session, setSession] = useState<VibeSession | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const profile = vibeStorage.getProfile();
    if (!profile) {
      router.replace('/vibematch/create');
      return;
    }
    const saved = vibeStorage.getSession();
    const next =
      saved?.profileId === profile.id && saved.status !== 'COMPLETED'
        ? saved
        : createSession(profile.id, Math.floor(Date.now() / 1000), mockQuestions);
    vibeStorage.setSession(next);
    setSession(next);
    setProfileReady(true);
  }, [router]);

  const question = useMemo<VibeQuestion | null>(() => {
    if (!session) return null;
    const id = session.selectedQuestionIds[session.currentRound];
    return mockQuestions.find((item) => item.id === id) ?? null;
  }, [session]);

  function choose(optionId: string) {
    if (!session || !question || selected) return;
    setSelected(optionId);
    setError('');
    try {
      const next = answerSession(session, question, optionId);
      vibeStorage.setSession(next);
      window.setTimeout(() => {
        setSelected(null);
        if (next.status === 'COMPLETED') router.push('/vibematch/results');
        else setSession(next);
      }, 220);
    } catch (cause) {
      setSelected(null);
      setError(cause instanceof Error ? cause.message : 'That answer could not be saved.');
    }
  }

  if (!profileReady || !session || !question)
    return (
      <VibeMatchShell compact>
        <LoadingPanel label="Loading your next round…" />
      </VibeMatchShell>
    );

  const progress = Math.round((session.currentRound / session.totalRounds) * 100);
  return (
    <VibeMatchShell compact>
      <section className="vibe-game" aria-labelledby="round-prompt">
        <div className="vibe-game__topline">
          <span>
            ROUND {String(session.currentRound + 1).padStart(2, '0')} /{' '}
            {String(session.totalRounds).padStart(2, '0')}
          </span>
          <span>{question.roundType.replaceAll('_', ' ')}</span>
        </div>
        <div
          className="vibe-progress"
          aria-label={`Round ${session.currentRound + 1} of ${session.totalRounds}`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="vibe-game__prompt-wrap">
          <p className="vibe-kicker">
            <span>{question.category}</span> / GO WITH YOUR FIRST INSTINCT
          </p>
          <h1 id="round-prompt">{question.prompt}</h1>
          <p className="vibe-game__hint">Tap an answer. The next round arrives automatically.</p>
        </div>
        <div className="vibe-answer-list" role="group" aria-label="Answer options">
          {question.answerOptions.map((option, index) => (
            <button
              key={option.id}
              className={`vibe-answer ${selected === option.id ? 'is-selected' : ''}`}
              type="button"
              onClick={() => choose(option.id)}
              aria-pressed={selected === option.id}
              disabled={Boolean(selected)}
            >
              <span className="vibe-answer__index">{String.fromCharCode(65 + index)}</span>
              <span>{option.label}</span>
              <span className="vibe-answer__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="vibe-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="vibe-game__footer">
          <span>Vibe DNA is building quietly.</span>
          <span aria-hidden="true">{progress}%</span>
        </div>
      </section>
    </VibeMatchShell>
  );
}
