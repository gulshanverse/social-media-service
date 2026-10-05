import assert from 'node:assert/strict';
import {
  canDiscover,
  compatibilityBreakdown,
  dnaSimilarity,
  finalCompatibilityScore,
  interestCompatibility,
  intentCompatibility,
  isEligibleCandidate,
  MATCHING_ALGORITHM_VERSION,
  MATCH_COMPONENT_WEIGHTS,
  selectTopMatches,
  type MatchParticipant,
  type Snapshot,
} from './matching';

const fullSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  socialEnergy: 80,
  adventure: 65,
  spontaneity: 70,
  humor: 75,
  communication: 85,
  intent: 60,
  coverage: 100,
  answerCount: 7,
  ...overrides,
});

function participant(
  identityId: string,
  overrides: Partial<MatchParticipant> = {},
): MatchParticipant {
  return {
    identityId,
    matchKey: `opaque-key-${identityId}`,
    displayName: `Vibe ${identityId}`,
    collegeId: 'campus-north',
    collegeName: 'North Campus',
    profileStatus: 'ACTIVE',
    identityStatus: 'ACTIVE',
    ageConfirmed: true,
    primaryIntent: 'New friends',
    secondaryIntent: null,
    interests: ['music', 'late-night food', 'films'],
    session: {
      status: 'COMPLETED',
      completedAt: new Date('2026-10-01T12:00:00Z'),
      totalRounds: 7,
      answerCount: 7,
      snapshot: fullSnapshot(),
    },
    blockedByRequester: false,
    requesterBlockedByCandidate: false,
    ...overrides,
  };
}

const requester = participant('requester');

assert.equal(MATCHING_ALGORITHM_VERSION, 'v1');
assert.deepEqual(MATCH_COMPONENT_WEIGHTS, { dna: 60, intent: 20, interests: 15, confidence: 5 });

// Eligibility gates are hard exclusions, not values a high score can outweigh.
assert.equal(canDiscover(requester), true);
assert.equal(isEligibleCandidate(requester, participant('eligible')), true);
assert.equal(isEligibleCandidate(requester, requester), false, 'self is excluded');
assert.equal(
  isEligibleCandidate(requester, participant('other-campus', { collegeId: 'campus-south' })),
  false,
  'different college is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('paused', { profileStatus: 'PAUSED' })),
  false,
  'inactive profile is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('suspended', { identityStatus: 'SUSPENDED' })),
  false,
  'suspended identity is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('deleted', { identityStatus: 'DELETED' })),
  false,
  'deleted identity is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('profile-deleted', { profileStatus: 'DELETED' })),
  false,
  'deleted profile is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('underage', { ageConfirmed: false })),
  false,
  '18+ confirmation is required',
);
assert.equal(
  isEligibleCandidate(
    requester,
    participant('incomplete', {
      session: {
        status: 'PLAYING',
        completedAt: null,
        totalRounds: 7,
        answerCount: 6,
        snapshot: fullSnapshot(),
      },
    }),
  ),
  false,
  'incomplete game is excluded',
);
assert.equal(
  isEligibleCandidate(
    requester,
    participant('short-game', {
      session: {
        status: 'COMPLETED',
        completedAt: new Date('2026-10-01T12:00:00Z'),
        totalRounds: 6,
        answerCount: 6,
        snapshot: fullSnapshot({ answerCount: 6 }),
      },
    }),
  ),
  false,
  'a completed session below the required seven rounds is excluded',
);
assert.equal(
  isEligibleCandidate(
    requester,
    participant('missing-dna', { session: { ...requester.session!, snapshot: null } }),
  ),
  false,
  'missing DNA is excluded',
);
assert.equal(
  isEligibleCandidate(requester, participant('blocked-by-requester', { blockedByRequester: true })),
  false,
  'a candidate blocked by requester is excluded',
);
assert.equal(
  isEligibleCandidate(
    requester,
    participant('blocked-requester', { requesterBlockedByCandidate: true }),
  ),
  false,
  'a candidate who blocked requester is excluded',
);
assert.equal(
  canDiscover(participant('no-age-confirmation', { ageConfirmed: false })),
  false,
  'requester must satisfy eligibility too',
);

// The six bounded DNA axes use transparent weighted absolute-distance similarity.
const identical = fullSnapshot();
assert.equal(dnaSimilarity(identical, identical), 100, 'identical vectors score 100');
assert.equal(
  dnaSimilarity(
    fullSnapshot({
      socialEnergy: 0,
      adventure: 0,
      spontaneity: 0,
      humor: 0,
      communication: 0,
      intent: 0,
    }),
    fullSnapshot({
      socialEnergy: 100,
      adventure: 100,
      spontaneity: 100,
      humor: 100,
      communication: 100,
      intent: 100,
    }),
  ),
  0,
  'opposite endpoints score 0',
);
assert.equal(dnaSimilarity(identical, fullSnapshot({ socialEnergy: 60 })), 96);
assert.equal(dnaSimilarity(identical, fullSnapshot({ socialEnergy: 0 })), 84);
assert.equal(dnaSimilarity(identical, fullSnapshot({ intent: 0 })), 91);
assert.equal(
  dnaSimilarity(identical, fullSnapshot({ socialEnergy: 0 })),
  dnaSimilarity(identical, fullSnapshot({ socialEnergy: 0 })),
  'repeat calls are deterministic',
);

// Intent is a symmetric goal-compatibility table; secondary goals can improve fit.
const eventA = participant('event-a', { primaryIntent: 'Event partner' });
const eventB = participant('event-b', { primaryIntent: 'Event partner' });
assert.equal(intentCompatibility(eventA, eventB), 100);
const friends = participant('friends', { primaryIntent: 'New friends' });
assert.equal(intentCompatibility(eventA, friends), 82);
assert.equal(intentCompatibility(eventA, friends), intentCompatibility(friends, eventA));
const openEnded = participant('open', { primaryIntent: 'Just meeting people' });
assert.equal(intentCompatibility(openEnded, friends), 88);
assert.ok(
  intentCompatibility(openEnded, eventA) >= 50,
  'open-ended intent remains broadly compatible',
);
const special = participant('special', { primaryIntent: 'Someone special' });
const gaming = participant('gaming', { primaryIntent: 'Gaming buddy' });
assert.equal(intentCompatibility(special, gaming), 40);
assert.equal(
  intentCompatibility(
    participant('secondary-event', {
      primaryIntent: 'Study buddy',
      secondaryIntent: 'Event partner',
    }),
    eventB,
  ),
  100,
  'best declared goal pair drives intent compatibility',
);

// Interest tags are normalized, bounded, and neutral when either side has no tags.
assert.equal(interestCompatibility(['Music', 'music'], [' music ']), 100);
assert.equal(interestCompatibility(['music'], ['music', 'games']), 50);
assert.equal(interestCompatibility(['music'], ['games']), 0);
assert.equal(interestCompatibility([], []), 50);
assert.equal(interestCompatibility([], ['music']), 50);
assert.equal(interestCompatibility(null, ['music']), 50);

// Component weighting, completion coverage, bounds, and integer display score.
const pair = participant('pair', {
  interests: ['music', 'late-night food'],
  session: {
    ...requester.session!,
    snapshot: fullSnapshot({ coverage: 80 }),
  },
});
const breakdown = compatibilityBreakdown(requester, pair);
assert.deepEqual(breakdown, { dna: 100, intent: 100, interests: 67, confidence: 80 });
assert.equal(finalCompatibilityScore({ dna: 100, intent: 80, interests: 60, confidence: 80 }), 89);
assert.equal(
  finalCompatibilityScore({ dna: 1000, intent: 1000, interests: 1000, confidence: 1000 }),
  100,
);
assert.equal(
  finalCompatibilityScore({ dna: -100, intent: -100, interests: -100, confidence: -100 }),
  0,
);
assert.equal(Number.isInteger(finalCompatibilityScore(breakdown)), true);

// Top-three results are deterministic, duplicate-free, and contain only approved presentation fields.
const candidates = [
  participant('match-1'),
  participant('match-2'),
  participant('match-3'),
  participant('match-4'),
  participant('match-5'),
  participant('match-1', { matchKey: 'alternate-public-key' }),
  participant('wrong-campus', { collegeId: 'campus-south' }),
];
const top = selectTopMatches(requester, candidates);
assert.equal(top.length, 3);
assert.deepEqual(top, selectTopMatches(requester, candidates), 'refresh ordering is stable');
assert.equal(new Set(top.map((match) => match.nickname)).size, 3, 'no duplicate identities');
assert.ok(
  top.every((match) => Number.isInteger(match.score) && match.score >= 0 && match.score <= 100),
);
assert.ok(top.every((match) => match.college === 'North Campus'));
assert.ok(top.every((match) => match.whyYouMatch.length > 0));
assert.ok(top.every((match) => match.sharedInterests.includes('music')));
for (const match of top) {
  assert.deepEqual(Object.keys(match).sort(), [
    'blockToken',
    'college',
    'nickname',
    'score',
    'sharedInterests',
    'tagline',
    'title',
    'whyYouMatch',
  ]);
  const json = JSON.stringify(match).toLowerCase();
  assert.equal(json.includes('email'), false);
  assert.equal(json.includes('instagram'), false);
  assert.equal(json.includes('confession'), false);
  assert.equal(json.includes('garba'), false);
  assert.equal(json.includes('identityid'), false);
  assert.equal(json.includes('sessionid'), false);
}
assert.equal(
  selectTopMatches(requester, []).length,
  0,
  'empty candidate pool returns no fabricated matches',
);
assert.equal(selectTopMatches(participant('unfinished', { session: null }), candidates).length, 0);

console.log(
  'VibeMatch matching eligibility, scoring, explanations, privacy, and deterministic top-three tests passed',
);
