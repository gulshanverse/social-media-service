'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VibeQuestion } from '@ggv/types';
import { ApiRequestError } from '../../lib/api';
import { answerServerSession, createServerSession, getCurrentRound } from '../../lib/vibematch/api';
import { vibeStorage } from '../../lib/vibematch/storage';
import { LoadingPanel, VibeMatchShell } from './VibeMatchShell';
export function GameplayClient() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<VibeQuestion | null>(null);
  const [round, setRound] = useState({ currentRound: 0, totalRounds: 7 });
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = vibeStorage.getServerSessionId();
        const result = stored ? await getCurrentRound(stored).catch(() => null) : null;
        if (result) {
          if (!cancelled) {
            setSessionId(stored);
            setQuestion(result.question);
            setRound(result.session);
          }
        } else {
          const created = await createServerSession();
          if (!cancelled) {
            setSessionId(created.session.id);
            vibeStorage.setServerSessionId(created.session.id);
            setQuestion(created.question ?? null);
            setRound(created.session);
          }
        }
      } catch (cause) {
        if (cause instanceof ApiRequestError && cause.status === 401)
          router.replace('/vibematch/create');
        else setError(cause instanceof Error ? cause.message : 'Unable to load this round.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  async function choose(optionId: string) {
    if (!sessionId || !question || selected) return;
    setSelected(optionId);
    setError('');
    try {
      const next = await answerServerSession(sessionId, optionId, crypto.randomUUID());
      if (next.session.status === 'COMPLETED')
        router.push(`/vibematch/results?session=${encodeURIComponent(sessionId)}`);
      else {
        const current = await getCurrentRound(sessionId);
        setQuestion(current.question);
        setRound(current.session);
        setSelected(null);
      }
    } catch (cause) {
      setSelected(null);
      setError(cause instanceof Error ? cause.message : 'That answer could not be saved.');
    }
  }
  if (loading)
    return (
      <VibeMatchShell compact>
        <LoadingPanel label="Loading your next round…" />
      </VibeMatchShell>
    );
  if (error && !question)
    return (
      <VibeMatchShell compact>
        <div className="vibe-loading" role="alert">
          {error}
          <button className="vibe-primary-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </VibeMatchShell>
    );
  if (!question) return null;
  const progress = Math.round((round.currentRound / round.totalRounds) * 100);
  return (
    <VibeMatchShell compact>
      <section className="vibe-game" aria-labelledby="round-prompt">
        <div className="vibe-game__topline">
          <span>
            ROUND {String(round.currentRound + 1).padStart(2, '0')} /{' '}
            {String(round.totalRounds).padStart(2, '0')}
          </span>
          <span>{question.roundType.replaceAll('_', ' ')}</span>
        </div>
        <div
          className="vibe-progress"
          aria-label={`Round ${round.currentRound + 1} of ${round.totalRounds}`}
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
