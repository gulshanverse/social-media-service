'use client';

import Link from 'next/link';
import { PrivacyNote, VibeMatchShell } from './VibeMatchShell';

export function LandingClient() {
  return (
    <VibeMatchShell>
      <section className="vibe-landing" aria-labelledby="vibe-title">
        <div className="vibe-landing__copy">
          <p className="vibe-kicker">
            <span>01</span> PRIVATE SOCIAL GAME
          </p>
          <h1 id="vibe-title">
            Your choices.
            <br />
            <em>Your vibe.</em>
          </h1>
          <p className="vibe-landing__lede">
            Answer quick scenarios, discover your Vibe DNA, and get closer to people with compatible
            energy.
          </p>
          <div className="vibe-landing__actions">
            <Link className="vibe-primary-button" href="/vibematch/create">
              Create Your Vibe <span aria-hidden="true">↗</span>
            </Link>
            <span className="vibe-action-hint">No password. No public directory.</span>
          </div>
          <PrivacyNote />
        </div>
        <div className="vibe-launch-card" aria-label="VibeMatch game preview">
          <div className="vibe-launch-card__orbit vibe-launch-card__orbit--one" />
          <div className="vibe-launch-card__orbit vibe-launch-card__orbit--two" />
          <div className="vibe-launch-card__meta">
            <span>VIBEMATCH // 001</span>
            <span>READY</span>
          </div>
          <div className="vibe-launch-card__core">
            <span className="vibe-launch-card__core-mark">V</span>
            <span>
              your
              <br />
              energy
              <br />
              <b>is data.</b>
            </span>
          </div>
          <div className="vibe-launch-card__footer">
            <span>07 ROUNDS</span>
            <span>
              BUILD YOUR DNA <b>→</b>
            </span>
          </div>
        </div>
      </section>
      <section className="vibe-landing__rail" aria-label="How VibeMatch works">
        <div>
          <b>01</b>
          <strong>Choose</strong>
          <span>Pick what feels true.</span>
        </div>
        <div>
          <b>02</b>
          <strong>Play</strong>
          <span>Seven rounds. Zero overthinking.</span>
        </div>
        <div>
          <b>03</b>
          <strong>Discover</strong>
          <span>Your vibe starts taking shape.</span>
        </div>
      </section>
    </VibeMatchShell>
  );
}
