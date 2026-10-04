import type {
  VibeAnswerOption,
  VibeDna,
  VibeDimension,
  VibeQuestion,
  VibeSession,
} from '@ggv/types';
import { vibeDimensions } from '@ggv/types';

export const SESSION_LENGTH = 7;
export const DNA_VERSION = 'v1';

export function seededNumber(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function selectQuestions(
  questions: VibeQuestion[],
  seed: number,
  totalRounds = SESSION_LENGTH,
): VibeQuestion[] {
  const active = questions.filter((question) => question.active);
  const chosen: VibeQuestion[] = [];
  const categories = new Set<string>();
  const roundTypes = new Set<string>();

  for (let round = 0; round < totalRounds; round += 1) {
    const candidates = active
      .filter((question) => !chosen.some((item) => item.id === question.id))
      .sort((a, b) => {
        const aPenalty =
          (categories.has(a.category) ? 4 : 0) + (roundTypes.has(a.roundType) ? 3 : 0);
        const bPenalty =
          (categories.has(b.category) ? 4 : 0) + (roundTypes.has(b.roundType) ? 3 : 0);
        const aScore = a.weight - aPenalty + seededNumber(seed, round + a.id.length);
        const bScore = b.weight - bPenalty + seededNumber(seed, round + b.id.length);
        return bScore - aScore;
      });
    const next = candidates[0];
    if (!next) break;
    chosen.push(next);
    categories.add(next.category);
    roundTypes.add(next.roundType);
  }

  return chosen;
}

export function createEmptyDna(): VibeDna {
  return Object.fromEntries(vibeDimensions.map((dimension) => [dimension, 0])) as VibeDna;
}

export function applyContribution(
  dna: VibeDna,
  contribution: Partial<Record<VibeDimension, number>>,
): VibeDna {
  return Object.fromEntries(
    vibeDimensions.map((dimension) => [
      dimension,
      Math.max(-2, Math.min(2, dna[dimension] + (contribution[dimension] ?? 0))),
    ]),
  ) as VibeDna;
}

export function normalizeDna(dna: VibeDna): VibeDna {
  return Object.fromEntries(
    vibeDimensions.map((dimension) => [dimension, Math.round(((dna[dimension] + 2) / 4) * 100)]),
  ) as VibeDna;
}

export function validateAnswer(question: VibeQuestion, optionId: string): VibeAnswerOption {
  const option = question.answerOptions.find((candidate) => candidate.id === optionId);
  if (!option) throw new Error('That answer is not available for this round.');
  return option;
}

export function answerSession(
  session: VibeSession,
  question: VibeQuestion,
  optionId: string,
): VibeSession {
  if (session.status !== 'PLAYING') throw new Error('This session is not accepting answers.');
  if (session.answeredQuestionIds.includes(question.id))
    throw new Error('This round was already answered.');
  const option = validateAnswer(question, optionId);
  const answeredQuestionIds = [...session.answeredQuestionIds, question.id];
  const complete = answeredQuestionIds.length >= session.totalRounds;
  return {
    ...session,
    currentRound: complete ? session.totalRounds : session.currentRound + 1,
    answeredQuestionIds,
    answers: { ...session.answers, [question.id]: option.id },
    dna: applyContribution(session.dna, option.dnaContribution),
    status: complete ? 'COMPLETED' : 'PLAYING',
  };
}

export function createSession(
  profileId: string,
  seed: number,
  questions: VibeQuestion[],
): VibeSession {
  const selected = selectQuestions(questions, seed);
  return {
    id: `session-${seed}`,
    profileId,
    currentRound: 0,
    totalRounds: selected.length,
    selectedQuestionIds: selected.map((question) => question.id),
    answeredQuestionIds: [],
    answers: {},
    dna: createEmptyDna(),
    status: 'PLAYING',
    seed,
  };
}
