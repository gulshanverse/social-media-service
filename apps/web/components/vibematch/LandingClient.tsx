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
          <div className="vibe-mode-options" aria-label="Choose how to play VibeMatch">
            <Link className="vibe-mode-card vibe-mode-card--quick" href="/vibematch/quick-play">
              <span className="vibe-mode-card__eyebrow">START IN A MINUTE · NO EMAIL</span>
              <strong>
                Quick Play <span aria-hidden="true">↗</span>
              </strong>
              <span>Jump in, find your vibe, and discover your connections.</span>
            </Link>
            <Link className="vibe-mode-card" href="/vibematch/create">
              <span className="vibe-mode-card__eyebrow">OPTIONAL · EMAIL MAGIC LINK</span>
              <strong>
                My Vibe Profile <span aria-hidden="true">↗</span>
              </strong>
              <span>Save your journey and pick up where you left off.</span>
            </Link>
          </div>
          <p className="vibe-mode-note">
            You can create a profile later. Quick Play progress is separate and is not automatically
            transferred.
          </p>
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
