'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { vibeDimensions, type VibeDna, type VibeProfile, type VibeSession } from '@ggv/types';
import { normalizeDna } from '../../lib/vibematch/engine';
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

function getTitle(dna: VibeDna) {
  const scores = normalizeDna(dna);
  const social = scores.socialEnergy >= 60;
  const adventure = scores.adventure >= 60;
  const humor = scores.humor >= 60;
  if (social && adventure) return 'SOCIAL EXPLORER';
  if (humor && adventure) return 'CHAOS CURATOR';
  if (social) return 'CAMPUS CONNECTOR';
  if (adventure) return 'WILD CARD ENERGY';
  if (humor) return 'LOW-KEY LEGEND';
  return 'QUIETLY ICONIC';
}

function getSummary(dna: VibeDna) {
  const scores = normalizeDna(dna);
  const strongest = [...vibeDimensions].sort((a, b) => scores[b] - scores[a])[0];
  const copy: Record<(typeof vibeDimensions)[number], string> = {
    socialEnergy: 'You bring a room to life, even when you pretend you did not plan to.',
    adventure: 'You are curious enough to turn ordinary campus hours into a side quest.',
    spontaneity: 'Your best plans probably started five minutes before they happened.',
    humor: 'You notice the bit, commit to the bit, and occasionally become the bit.',
    communication: 'You bring enough directness to keep the group chat moving.',
    intent: 'You know what kind of energy you are open to finding next.',
  };
  return copy[strongest];
}

export function ResultsClient() {
  const [profile, setProfile] = useState<VibeProfile | null>(null);
  const [session, setSession] = useState<VibeSession | null>(null);
  useEffect(() => {
    setProfile(vibeStorage.getProfile());
    setSession(vibeStorage.getSession());
  }, []);

  const normalized = useMemo(() => (session ? normalizeDna(session.dna) : null), [session]);
  if (!profile || !session || session.status !== 'COMPLETED' || !normalized)
    return (
      <VibeMatchShell compact>
        <LoadingPanel label="Pulling together your vibe…" />
      </VibeMatchShell>
    );

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
          <p>{getSummary(session.dna)}</p>
        </div>
        <div className="vibe-results__score-card">
          <div className="vibe-results__score-meta">
            <span>VIBE DNA / {profile.name}</span>
            <span>VERSION 1.0</span>
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
            {vibeDimensions.map((dimension, index) => (
              <i key={dimension} className={`vibe-orbit__node vibe-orbit__node--${index}`} />
            ))}
          </div>
          <div className="vibe-results__title">
            <span>YOUR VIBE TITLE</span>
            <strong>{getTitle(session.dna)}</strong>
          </div>
        </div>
        <div className="vibe-dimension-list" aria-label="Vibe DNA dimensions">
          {vibeDimensions.map((dimension) => (
            <div className="vibe-dimension" key={dimension}>
              <div>
                <span>{labels[dimension]}</span>
                <b>{normalized[dimension]}%</b>
              </div>
              <div className="vibe-dimension__track">
                <span style={{ width: `${normalized[dimension]}%` }} />
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
