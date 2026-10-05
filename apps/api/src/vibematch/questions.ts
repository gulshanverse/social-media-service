import type { VibeAnswerOption, VibeDna, VibeQuestion } from '@ggv/types';
import { vibeDimensions } from '@ggv/types';

export const VIBE_SCORING_VERSION = 'v1';
export const VIBE_SESSION_LENGTH = 7;
export const vibeQuestions: VibeQuestion[] = [
  [
    'q-campus-event',
    'You spot a campus event with no one you know. Your move?',
    'ADVENTURE',
    'SCENARIO',
    [
      ['a', 'Walk in. Future me can explain.', { adventure: 2, spontaneity: 2, socialEnergy: 1 }],
      ['b', 'Scout the room first.', { adventure: 1, communication: 1 }],
      ['c', 'Save it for a better-timed plan.', { spontaneity: -1, socialEnergy: -1 }],
    ],
  ],
  [
    'q-group-chat',
    'The group chat is suddenly making plans for tonight.',
    'SOCIAL',
    'QUICK_PICK',
    [
      ['a', 'I am already outside.', { socialEnergy: 2, spontaneity: 1 }],
      ['b', 'Give me ten minutes to decide.', { communication: 1 }],
      ['c', 'I support the plan spiritually.', { humor: 1, socialEnergy: -1 }],
    ],
  ],
  [
    'q-weekend',
    'Your ideal free Saturday is…',
    'LIFESTYLE',
    'THIS_OR_THAT',
    [
      ['a', 'A loose plan and somewhere new.', { adventure: 1, spontaneity: 2 }],
      ['b', 'The comfort zone, but elite.', { socialEnergy: -1, spontaneity: -1 }],
    ],
  ],
  [
    'q-bad-joke',
    'Someone tells a truly terrible joke. You…',
    'HUMOR',
    'WOULD_YOU_RATHER',
    [
      ['a', 'Commit to the bit.', { humor: 2, communication: 1 }],
      ['b', 'Offer a pity laugh with range.', { humor: 1, communication: 1 }],
      ['c', 'Silence is also feedback.', { humor: -1, communication: -1 }],
    ],
  ],
  [
    'q-late-reply',
    'A friend replies “my bad, just saw this” six hours later.',
    'COMMUNICATION',
    'SCENARIO',
    [
      ['a', 'Reply normally. No courtroom needed.', { communication: 2, socialEnergy: 1 }],
      ['b', 'Send a lovingly dramatic “wow”.', { humor: 1, communication: 1 }],
      [
        'c',
        'Match the delay. The experiment begins.',
        { spontaneity: 1, communication: -1, humor: 1 },
      ],
    ],
  ],
  [
    'q-road-trip',
    'Would you rather choose the destination or the playlist?',
    'ADVENTURE',
    'WOULD_YOU_RATHER',
    [
      ['a', 'Destination. We need a plot.', { adventure: 2, communication: 1 }],
      ['b', 'Playlist. Vibes are navigation.', { humor: 1, spontaneity: 1, socialEnergy: 1 }],
    ],
  ],
  [
    'q-unexpected-free-time',
    'You get one unexpected free hour between classes.',
    'PERSONALITY',
    'QUICK_PICK',
    [
      ['a', 'Text someone and make it a side quest.', { spontaneity: 2, socialEnergy: 1 }],
      ['b', 'Find a good corner and reset.', { socialEnergy: -1, communication: 1 }],
      ['c', 'Finally do the thing I postponed.', { communication: 1, spontaneity: -1 }],
    ],
  ],
  [
    'q-first-message',
    'Your first message to a new person should be…',
    'COMMUNICATION',
    'THIS_OR_THAT',
    [
      ['a', 'A specific question with actual personality.', { communication: 2, socialEnergy: 1 }],
      ['b', 'A meme. Let the algorithm translate.', { humor: 2, spontaneity: 1 }],
    ],
  ],
].map(([id, prompt, category, roundType, options]) => ({
  id,
  prompt,
  category,
  roundType,
  active: true,
  season: 'FOUNDATION',
  difficulty: 1,
  weight: 1,
  dnaMappings: {},
  answerOptions: (options as [string, string, Partial<Record<string, number>>][]).map(
    ([optionId, label, dnaContribution]) => ({ id: `${id}-${optionId}`, label, dnaContribution }),
  ),
})) as VibeQuestion[];

export function seededNumber(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
export function selectQuestions(seed: number, totalRounds = VIBE_SESSION_LENGTH) {
  const chosen: VibeQuestion[] = [];
  const categories = new Set<string>();
  const types = new Set<string>();
  for (let round = 0; round < totalRounds; round += 1) {
    const next = vibeQuestions
      .filter((q) => q.active && !chosen.includes(q))
      .sort((a, b) => {
        const score = (q: VibeQuestion) =>
          q.weight -
          (categories.has(q.category) ? 4 : 0) -
          (types.has(q.roundType) ? 3 : 0) +
          seededNumber(seed, round + q.id.length);
        return score(b) - score(a);
      })[0];
    if (!next) break;
    chosen.push(next);
    categories.add(next.category);
    types.add(next.roundType);
  }
  return chosen;
}
export function emptyDna(): VibeDna {
  return Object.fromEntries(vibeDimensions.map((d) => [d, 0])) as VibeDna;
}
export function addContribution(dna: VibeDna, contribution: Partial<Record<string, number>>) {
  return Object.fromEntries(
    vibeDimensions.map((d) => [d, Math.max(-2, Math.min(2, dna[d] + (contribution[d] ?? 0)))]),
  ) as VibeDna;
}
export function normalizeDna(dna: VibeDna) {
  return Object.fromEntries(
    vibeDimensions.map((d) => [d, Math.round(((dna[d] + 2) / 4) * 100)]),
  ) as VibeDna;
}
export function findQuestion(id: string) {
  return vibeQuestions.find((q) => q.id === id);
}
export function findOption(question: VibeQuestion, optionId: string): VibeAnswerOption | undefined {
  return question.answerOptions.find((o) => o.id === optionId);
}
