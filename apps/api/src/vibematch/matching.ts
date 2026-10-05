import { createHash } from 'node:crypto';
import { VIBE_INTENTS } from './dto';
import { VIBE_SESSION_LENGTH } from './questions';

export const MATCHING_ALGORITHM_VERSION = 'v1';

export const DNA_WEIGHTS = {
  socialEnergy: 20,
  adventure: 15,
  spontaneity: 15,
  humor: 15,
  communication: 20,
  intent: 15,
} as const;

export const MATCH_COMPONENT_WEIGHTS = {
  dna: 60,
  intent: 20,
  interests: 15,
  confidence: 5,
} as const;

export const INTENT_COMPATIBILITY: Record<
  (typeof VIBE_INTENTS)[number],
  Record<(typeof VIBE_INTENTS)[number], number>
> = {
  'Someone special': {
    'Someone special': 100,
    'New friends': 45,
    'Event partner': 50,
    'Study buddy': 45,
    'Gaming buddy': 40,
    'Just meeting people': 58,
  },
  'New friends': {
    'Someone special': 45,
    'New friends': 100,
    'Event partner': 82,
    'Study buddy': 70,
    'Gaming buddy': 72,
    'Just meeting people': 88,
  },
  'Event partner': {
    'Someone special': 50,
    'New friends': 82,
    'Event partner': 100,
    'Study buddy': 62,
    'Gaming buddy': 68,
    'Just meeting people': 86,
  },
  'Study buddy': {
    'Someone special': 45,
    'New friends': 70,
    'Event partner': 62,
    'Study buddy': 100,
    'Gaming buddy': 55,
    'Just meeting people': 76,
  },
  'Gaming buddy': {
    'Someone special': 40,
    'New friends': 72,
    'Event partner': 68,
    'Study buddy': 55,
    'Gaming buddy': 100,
    'Just meeting people': 78,
  },
  'Just meeting people': {
    'Someone special': 58,
    'New friends': 88,
    'Event partner': 86,
    'Study buddy': 76,
    'Gaming buddy': 78,
    'Just meeting people': 100,
  },
};

export type DnaDimension = keyof typeof DNA_WEIGHTS;
export type DnaVector = Record<DnaDimension, number>;
export type Snapshot = DnaVector & { coverage: number; answerCount: number };

export type MatchParticipant = {
  identityId: string;
  matchKey: string;
  displayName: string;
  collegeId: string;
  collegeName: string;
  profileStatus: string;
  identityStatus: string;
  ageConfirmed: boolean;
  primaryIntent: string;
  secondaryIntent: string | null;
  interests: unknown;
  session: {
    status: string;
    completedAt: Date | null;
    totalRounds: number;
    answerCount: number;
    snapshot: Snapshot | null;
  } | null;
  blockedByRequester: boolean;
  requesterBlockedByCandidate: boolean;
};

export type CompatibilityBreakdown = {
  dna: number;
  intent: number;
  interests: number;
  confidence: number;
};

export type DiscoveryMatch = {
  blockToken: string;
  nickname: string;
  college: string;
  score: number;
  title: string;
  tagline: string;
  whyYouMatch: string[];
  sharedInterests: string[];
};

const DNA_LABELS: Record<DnaDimension, string> = {
  socialEnergy: 'social energy',
  adventure: 'adventure',
  spontaneity: 'spontaneity',
  humor: 'humor',
  communication: 'communication',
  intent: 'intent',
};

export function isValidSnapshot(snapshot: Snapshot | null | undefined): snapshot is Snapshot {
  if (!snapshot) return false;
  return (
    Object.keys(DNA_WEIGHTS).every((dimension) => {
      const score = snapshot[dimension as DnaDimension];
      return Number.isInteger(score) && score >= 0 && score <= 100;
    }) &&
    Number.isFinite(snapshot.coverage) &&
    snapshot.coverage > 0 &&
    snapshot.coverage <= 100 &&
    Number.isInteger(snapshot.answerCount) &&
    snapshot.answerCount > 0
  );
}

export function hasCompletedGame(participant: MatchParticipant) {
  const session = participant.session;
  return Boolean(
    session &&
    session.status === 'COMPLETED' &&
    session.completedAt &&
    Number.isInteger(session.totalRounds) &&
    session.totalRounds >= VIBE_SESSION_LENGTH &&
    session.answerCount >= session.totalRounds &&
    isValidSnapshot(session.snapshot) &&
    session.snapshot.answerCount >= session.totalRounds,
  );
}

export function canDiscover(participant: MatchParticipant) {
  return (
    participant.identityStatus === 'ACTIVE' &&
    participant.profileStatus === 'ACTIVE' &&
    participant.ageConfirmed &&
    Boolean(participant.collegeId) &&
    hasCompletedGame(participant)
  );
}

export function isEligibleCandidate(
  requester: MatchParticipant,
  candidate: MatchParticipant,
): boolean {
  return (
    candidate.identityId !== requester.identityId &&
    candidate.collegeId === requester.collegeId &&
    candidate.profileStatus === 'ACTIVE' &&
    candidate.identityStatus === 'ACTIVE' &&
    candidate.ageConfirmed &&
    !candidate.blockedByRequester &&
    !candidate.requesterBlockedByCandidate &&
    hasCompletedGame(candidate)
  );
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

export function dnaSimilarity(a: DnaVector, b: DnaVector) {
  const weightedDistance = (Object.keys(DNA_WEIGHTS) as DnaDimension[]).reduce(
    (total, dimension) => {
      const av = a[dimension];
      const bv = b[dimension];
      if (!Number.isFinite(av) || !Number.isFinite(bv)) return total + DNA_WEIGHTS[dimension] * 100;
      return total + DNA_WEIGHTS[dimension] * Math.abs(clampScore(av) - clampScore(bv));
    },
    0,
  );
  return Math.round(clampScore(100 - weightedDistance / 100));
}

function normalizedIntent(value: string | null | undefined): (typeof VIBE_INTENTS)[number] | null {
  return VIBE_INTENTS.find((intent) => intent === value) ?? null;
}

function intentsFor(participant: Pick<MatchParticipant, 'primaryIntent' | 'secondaryIntent'>) {
  return [participant.primaryIntent, participant.secondaryIntent]
    .map(normalizedIntent)
    .filter((intent): intent is (typeof VIBE_INTENTS)[number] => Boolean(intent));
}

export function intentCompatibility(a: MatchParticipant, b: MatchParticipant) {
  const aIntents = intentsFor(a);
  const bIntents = intentsFor(b);
  if (!aIntents.length || !bIntents.length) return 0;
  return Math.max(
    ...aIntents.flatMap((left) => bIntents.map((right) => INTENT_COMPATIBILITY[left][right])),
  );
}

function normalizedInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.normalize('NFKC').trim().toLocaleLowerCase('en-US'))
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

export function interestCompatibility(a: unknown, b: unknown) {
  const aTags = new Set(normalizedInterests(a));
  const bTags = new Set(normalizedInterests(b));
  if (aTags.size === 0 || bTags.size === 0) return 50;
  const intersection = [...aTags].filter((tag) => bTags.has(tag)).length;
  const union = new Set([...aTags, ...bTags]).size;
  return Math.round((intersection / union) * 100);
}

function sharedInterestLabels(a: unknown, b: unknown) {
  const bTags = new Set(normalizedInterests(b));
  if (!Array.isArray(a)) return [];
  const seen = new Set<string>();
  return a
    .filter((tag): tag is string => typeof tag === 'string')
    .filter((tag) => {
      const key = tag.normalize('NFKC').trim().toLocaleLowerCase('en-US');
      if (!key || !bTags.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((tag) => tag.trim())
    .slice(0, 3);
}

export function compatibilityBreakdown(
  a: MatchParticipant,
  b: MatchParticipant,
): CompatibilityBreakdown {
  if (!isValidSnapshot(a.session?.snapshot) || !isValidSnapshot(b.session?.snapshot)) {
    throw new Error('A valid Vibe DNA snapshot is required to calculate compatibility.');
  }
  return {
    dna: dnaSimilarity(a.session.snapshot, b.session.snapshot),
    intent: intentCompatibility(a, b),
    interests: interestCompatibility(a.interests, b.interests),
    confidence: Math.round(Math.min(a.session.snapshot.coverage, b.session.snapshot.coverage)),
  };
}

export function finalCompatibilityScore(parts: CompatibilityBreakdown) {
  const weighted =
    parts.dna * MATCH_COMPONENT_WEIGHTS.dna +
    parts.intent * MATCH_COMPONENT_WEIGHTS.intent +
    parts.interests * MATCH_COMPONENT_WEIGHTS.interests +
    parts.confidence * MATCH_COMPONENT_WEIGHTS.confidence;
  return Math.round(clampScore(weighted / 100));
}

function whyLines(a: MatchParticipant, b: MatchParticipant, parts: CompatibilityBreakdown) {
  const snapshotA = a.session!.snapshot!;
  const snapshotB = b.session!.snapshot!;
  const similarDimensions = (Object.keys(DNA_WEIGHTS) as DnaDimension[])
    .map((dimension) => ({
      dimension,
      similarity: 100 - Math.abs(snapshotA[dimension] - snapshotB[dimension]),
    }))
    .filter((item) => item.similarity >= 75)
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        DNA_WEIGHTS[right.dimension] - DNA_WEIGHTS[left.dimension],
    )
    .slice(0, 2);
  const lines = similarDimensions.map(({ dimension }) => `Similar ${DNA_LABELS[dimension]}`);
  const shared = sharedInterestLabels(a.interests, b.interests);
  if (shared.length) lines.push(`You both like ${shared.slice(0, 2).join(' and ')}`);
  if (parts.intent >= 80) lines.push('Your connection goals line up');
  else if (parts.intent >= 60) lines.push('You have a few plans in common');
  if (!lines.length) lines.push('You bring different energy to the same campus');
  return { lines: lines.slice(0, 4), shared };
}

function matchBranding(parts: CompatibilityBreakdown, sharedCount: number) {
  if (sharedCount > 0 && parts.interests >= 50) {
    return { title: 'SHARED SIDE QUEST', tagline: 'You already have a few things in common.' };
  }
  if (parts.intent >= 90) {
    return {
      title: 'SAME PLAN, SAME CAMPUS',
      tagline: 'You’re looking for the same kind of connection.',
    };
  }
  if (parts.dna >= 88) {
    return { title: 'SAME-CHANNEL ENERGY', tagline: 'Your vibes just make sense.' };
  }
  if (parts.dna < 45 && parts.intent >= 65) {
    return { title: 'PLOT-TWIST DUO', tagline: 'Different energy, a surprisingly similar plan.' };
  }
  return { title: 'CAMPUS FREQUENCY', tagline: 'A little common ground goes a long way.' };
}

function stableTieBreak(requesterId: string, candidateId: string) {
  return createHash('sha256').update(`${requesterId}:${candidateId}`).digest('hex');
}

type ScoredCandidate = {
  participant: MatchParticipant;
  parts: CompatibilityBreakdown;
  score: number;
  tieBreak: string;
};

export function selectTopMatches(
  requester: MatchParticipant,
  candidates: MatchParticipant[],
): DiscoveryMatch[] {
  if (!canDiscover(requester)) return [];
  const scored: ScoredCandidate[] = candidates
    .filter((candidate) => isEligibleCandidate(requester, candidate))
    .map((participant) => {
      const parts = compatibilityBreakdown(requester, participant);
      return {
        participant,
        parts,
        score: finalCompatibilityScore(parts),
        tieBreak: stableTieBreak(requester.identityId, participant.identityId),
      };
    });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.parts.intent - a.parts.intent ||
      b.parts.interests - a.parts.interests ||
      a.tieBreak.localeCompare(b.tieBreak),
  );
  const seen = new Set<string>();
  return scored
    .filter(({ participant }) => {
      if (seen.has(participant.identityId)) return false;
      seen.add(participant.identityId);
      return true;
    })
    .slice(0, 3)
    .map(({ participant, parts, score }) => {
      const { lines, shared } = whyLines(requester, participant, parts);
      const branding = matchBranding(parts, shared.length);
      return {
        blockToken: participant.matchKey,
        nickname: participant.displayName,
        college: participant.collegeName,
        score,
        ...branding,
        whyYouMatch: lines,
        sharedInterests: shared,
      };
    });
}
