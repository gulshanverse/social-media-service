'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { vibeDimensions } from '@ggv/types';
import { getServerResult } from '../../lib/vibematch/api';
import { vibeStorage } from '../../lib/vibematch/storage';
import { LoadingPanel, VibeMatchShell } from './VibeMatchShell';
const labels: Record<(typeof vibeDimensions)[number], string> = {
  socialEnergy: 'Social energy',
  adventure: 'Adventure',
  spontaneity: 'Spontaneity',
  humor: 'Humor',
  communication: 'Communication',
  intent: 'Intent',
};
export function ResultsClient() {
  const params = useSearchParams();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const id = params.get('session') || vibeStorage.getServerSessionId();
    if (!id) {
      setError('No completed VibeMatch session was found.');
      return;
    }
    getServerResult(id)
      .then(setResult)
      .catch((c) => setError(c instanceof Error ? c.message : 'Unable to load your result.'));
  }, [params]);
  const normalized = useMemo(() => result?.result ?? null, [result]);
  if (error)
    return (
      <VibeMatchShell compact>
        <div className="vibe-loading" role="alert">
          {error}
          <Link className="vibe-primary-button" href="/vibematch/create">
            Return to profile
          </Link>
        </div>
      </VibeMatchShell>
    );
  if (!normalized)
    return (
      <VibeMatchShell compact>
        <LoadingPanel label="Pulling together your vibe…" />
      </VibeMatchShell>
    );
  const strongest = [...vibeDimensions].sort((a, b) => normalized[b] - normalized[a])[0];
  const title =
    strongest === 'socialEnergy'
      ? 'CAMPUS CONNECTOR'
      : strongest === 'adventure'
        ? 'WILD CARD ENERGY'
        : strongest === 'humor'
          ? 'LOW-KEY LEGEND'
          : 'QUIETLY ICONIC';
  return (
    <VibeMatchShell compact>
      <section className="vibe-results" aria-labelledby="results-title">
        <div className="vibe-results__intro">
          <p className="vibe-kicker">
            <span>03</span> SESSION COMPLETE
          </p>
          <h1 id="results-title">
            Your vibe is
            <br />
            <em>taking shape.</em>
          </h1>
          <p>Your result is saved to your private VibeMatch identity.</p>
        </div>
        <div className="vibe-results__score-card">
          <div className="vibe-results__score-meta">
            <span>VIBE DNA / PRIVATE</span>
            <span>VERSION {normalized.scoringVersion}</span>
          </div>
          <div className="vibe-orbit" aria-hidden="true">
            <div className="vibe-orbit__ring vibe-orbit__ring--outer" />
            <div className="vibe-orbit__ring vibe-orbit__ring--inner" />
            <div className="vibe-orbit__core">
              <strong>V</strong>
              <span>
                DNA
                <br />
                BUILT
              </span>
            </div>
            {vibeDimensions.map((d, i) => (
              <i key={d} className={`vibe-orbit__node vibe-orbit__node--${i}`} />
            ))}
          </div>
          <div className="vibe-results__title">
            <span>YOUR VIBE TITLE</span>
            <strong>{title}</strong>
          </div>
        </div>
        <div className="vibe-dimension-list" aria-label="Vibe DNA dimensions">
          {vibeDimensions.map((d) => (
            <div className="vibe-dimension" key={d}>
              <div>
                <span>{labels[d]}</span>
                <b>{normalized[d]}%</b>
              </div>
              <div className="vibe-dimension__track">
                <span style={{ width: `${normalized[d]}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="vibe-results__disclaimer">
          This is a playful reflection of your choices, not a psychological diagnosis.
        </p>
        <div className="vibe-results__actions">
          <Link
            className="vibe-primary-button"
            href="/vibematch/play"
            onClick={() => vibeStorage.clearSession()}
          >
            Play Again <span aria-hidden="true">↗</span>
          </Link>
          <button className="vibe-secondary-button" type="button" disabled>
            Discover My Matches <span>coming next</span>
          </button>
        </div>
      </section>
    </VibeMatchShell>
  );
}
