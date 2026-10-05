'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { vibeDimensions } from '@ggv/types';
import {
  blockMatch,
  getDiscovery,
  getServerResult,
  unblockMatch,
  type ServerDiscovery,
} from '../../lib/vibematch/api';
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
  const sessionId = params.get('session') || vibeStorage.getServerSessionId();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [discovery, setDiscovery] = useState<ServerDiscovery | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState('');
  const [blockingKey, setBlockingKey] = useState<string | null>(null);
  const [lastBlocked, setLastBlocked] = useState<{ key: string; nickname: string } | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  const [blockError, setBlockError] = useState('');

  const refreshDiscovery = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError('');
    try {
      setDiscovery(await getDiscovery());
    } catch (cause) {
      setMatchesError(
        cause instanceof Error ? cause.message : 'We could not load your campus matches.',
      );
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setError('No completed VibeMatch session was found.');
      setMatchesLoading(false);
      return;
    }
    let active = true;
    getServerResult(sessionId)
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Unable to load your result.');
      });
    getDiscovery()
      .then((value) => {
        if (active) setDiscovery(value);
      })
      .catch((cause) => {
        if (active)
          setMatchesError(
            cause instanceof Error ? cause.message : 'We could not load your campus matches.',
          );
      })
      .finally(() => {
        if (active) setMatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const normalized = useMemo(() => result?.result ?? null, [result]);

  async function hideMatch(matchKey: string, nickname: string) {
    setBlockingKey(matchKey);
    setBlockError('');
    try {
      await blockMatch(matchKey);
      setDiscovery((current) =>
        current
          ? {
              ...current,
              matches: current.matches.filter((match) => match.blockToken !== matchKey),
            }
          : current,
      );
      setLastBlocked({ key: matchKey, nickname });
    } catch (cause) {
      setBlockError(cause instanceof Error ? cause.message : 'Unable to hide this VibeMatch.');
    } finally {
      setBlockingKey(null);
    }
  }

  async function undoHide() {
    if (!lastBlocked) return;
    setUnblocking(true);
    setBlockError('');
    try {
      await unblockMatch(lastBlocked.key);
      setLastBlocked(null);
      await refreshDiscovery();
    } catch (cause) {
      setBlockError(cause instanceof Error ? cause.message : 'Unable to restore this VibeMatch.');
    } finally {
      setUnblocking(false);
    }
  }

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

        <section className="vibe-discovery" aria-labelledby="discovery-title">
          <header className="vibe-discovery__intro">
            <p className="vibe-kicker">
              <span>04</span> GAME FIRST, MATCHES SECOND
            </p>
            <h2 id="discovery-title">
              Your campus,
              <br />
              <em>your top three.</em>
            </h2>
            <p>
              Picked from completed VibeMatch games at {discovery?.campus ?? 'your campus'}. Every
              score is deterministic—not a popularity rating.
            </p>
          </header>

          {matchesLoading ? (
            <LoadingPanel label="Finding your campus frequency…" />
          ) : matchesError ? (
            <div className="vibe-discovery__notice" role="alert">
              <p>{matchesError}</p>
              <button className="vibe-secondary-button" type="button" onClick={refreshDiscovery}>
                Try again
              </button>
            </div>
          ) : discovery?.matches.length ? (
            <ol className="vibe-match-list" aria-label="Your top three VibeMatch results">
              {discovery.matches.map((match, index) => (
                <li
                  className={`vibe-match-card vibe-match-card--${index + 1}`}
                  key={match.blockToken}
                >
                  <div className="vibe-match-card__topline">
                    <span className="vibe-match-card__rank">0{index + 1} / CAMPUS SIGNAL</span>
                    <span
                      className="vibe-match-card__score"
                      aria-label={`${match.score} percent vibe match`}
                    >
                      {match.score}% <small>VIBE MATCH</small>
                    </span>
                  </div>
                  <div className="vibe-match-card__identity">
                    <span className="vibe-match-card__glyph" aria-hidden="true">
                      {index === 0 ? '✳' : index === 1 ? '◒' : '⌁'}
                    </span>
                    <div>
                      <h3>{match.nickname}</h3>
                      <p>{match.college}</p>
                    </div>
                  </div>
                  <p className="vibe-match-card__title">{match.title}</p>
                  <p className="vibe-match-card__tagline">“{match.tagline}”</p>
                  <div className="vibe-match-card__why">
                    <h4>Why your vibes line up</h4>
                    <ul>
                      {match.whyYouMatch.map((reason) => (
                        <li key={reason}>
                          <span aria-hidden="true">✦</span> {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {match.sharedInterests.length > 0 && (
                    <div className="vibe-match-card__interests" aria-label="Shared interests">
                      {match.sharedInterests.map((interest) => (
                        <span key={interest}>{interest}</span>
                      ))}
                    </div>
                  )}
                  <button
                    className="vibe-match-card__hide"
                    type="button"
                    disabled={blockingKey === match.blockToken}
                    onClick={() => void hideMatch(match.blockToken, match.nickname)}
                    aria-label={`Hide ${match.nickname} from your VibeMatch discovery`}
                  >
                    {blockingKey === match.blockToken ? 'Hiding…' : 'Hide this vibe'}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="vibe-discovery__empty" role="status">
              <span aria-hidden="true">✧</span>
              <h3>Your vibe is still loading.</h3>
              <p>
                There are no campus matches ready to show right now. Check back as more people play
                through VibeMatch.
              </p>
            </div>
          )}
          {lastBlocked && (
            <div className="vibe-block-notice" role="status">
              <span>{lastBlocked.nickname} is hidden from your discovery.</span>
              <button type="button" onClick={() => void undoHide()} disabled={unblocking}>
                {unblocking ? 'Restoring…' : 'Undo'}
              </button>
            </div>
          )}
          {blockError && (
            <p className="vibe-form-error" role="alert">
              {blockError}
            </p>
          )}
          <p className="vibe-discovery__privacy">
            Matches are private to VibeMatch. Contact details stay hidden; a match never reveals
            anyone’s Instagram or identity in another campus community.
          </p>
          <p className="vibe-discovery__method">
            Compatibility v{discovery?.algorithmVersion ?? '1'} · transparent deterministic scoring
          </p>
        </section>

        <div className="vibe-results__actions">
          <Link
            className="vibe-primary-button"
            href="/vibematch/play"
            onClick={() => vibeStorage.clearSession()}
          >
            Play Again <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </VibeMatchShell>
  );
}
