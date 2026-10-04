import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  answerSession,
  createEmptyDna,
  createSession,
  normalizeDna,
  selectQuestions,
  validateAnswer,
} from '../../lib/vibematch/engine';
import { mockQuestions } from '../../lib/vibematch/questions';
import type { VibeQuestion } from '@ggv/types';
import { GameplayClient } from '../../components/vibematch/GameplayClient';

const mockRouter = { push: vi.fn(), replace: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));
vi.mock('../../lib/vibematch/storage', () => ({
  vibeStorage: {
    getServerSessionId: () => null,
    setServerSessionId: vi.fn(),
    clearSession: vi.fn(),
  },
}));
let serverRound = 0;
vi.mock('../../lib/vibematch/api', () => ({
  createServerSession: vi.fn(async () => ({
    session: { id: 'server-session-1', status: 'PLAYING', totalRounds: 7, currentRound: 0 },
    question: mockQuestions[0],
  })),
  getCurrentRound: vi.fn(async () => ({
    session: {
      id: 'server-session-1',
      status: 'PLAYING',
      totalRounds: 7,
      currentRound: serverRound,
    },
    question: mockQuestions[serverRound],
  })),
  answerServerSession: vi.fn(async () => {
    serverRound = 1;
    return {
      session: { id: 'server-session-1', status: 'PLAYING', totalRounds: 7, currentRound: 1 },
      duplicate: false,
    };
  }),
}));

describe('VibeMatch question engine', () => {
  it('selects deterministic, unique questions with varied categories and round types', () => {
    const first = selectQuestions(mockQuestions, 42, 7);
    const second = selectQuestions(mockQuestions, 42, 7);
    expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id));
    expect(new Set(first.map((question) => question.id)).size).toBe(first.length);
    expect(new Set(first.map((question) => question.category)).size).toBeGreaterThan(2);
    expect(new Set(first.map((question) => question.roundType)).size).toBeGreaterThan(2);
  });

  it('rejects inactive questions and invalid answers', () => {
    const inactive: VibeQuestion = { ...mockQuestions[0], id: 'inactive', active: false };
    expect(selectQuestions([inactive], 1, 1)).toEqual([]);
    expect(() => validateAnswer(mockQuestions[0], 'not-an-option')).toThrow('not available');
  });

  it('applies bounded DNA contributions and normalizes to percentages', () => {
    const dna = createEmptyDna();
    const session = createSession('profile-1', 7, mockQuestions);
    const next = answerSession(session, mockQuestions[0], mockQuestions[0].answerOptions[0].id);
    expect(next.dna.adventure).toBe(2);
    expect(normalizeDna(next.dna).adventure).toBe(100);
    expect(dna.intent).toBe(0);
  });

  it('progresses and completes a session after its configured rounds', () => {
    let session = createSession('profile-1', 7, mockQuestions);
    for (const questionId of session.selectedQuestionIds) {
      const question = mockQuestions.find((candidate) => candidate.id === questionId)!;
      session = answerSession(session, question, question.answerOptions[0].id);
    }
    expect(session.answeredQuestionIds).toHaveLength(session.totalRounds);
    expect(session.status).toBe('COMPLETED');
    expect(session.currentRound).toBe(session.totalRounds);
  });
});

describe('VibeMatch gameplay interaction', () => {
  it('renders accessible answer buttons and advances after a tap', async () => {
    render(<GameplayClient />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
    const answer = screen.getAllByRole('button', { name: /.+/ })[0];
    expect(answer.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(answer);
    expect(answer.getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(screen.getByText(/ROUND 02/)).toBeTruthy(), { timeout: 500 });
  });
});
