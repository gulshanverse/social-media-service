import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockMatch, getDiscovery, getServerResult, unblockMatch } from '../../lib/vibematch/api';
import { ResultsClient } from '../../components/vibematch/ResultsClient';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('session=session-1'),
}));

vi.mock('../../lib/vibematch/api', () => ({
  blockMatch: vi.fn(),
  getDiscovery: vi.fn(),
  getServerResult: vi.fn(),
  unblockMatch: vi.fn(),
}));

vi.mock('../../lib/vibematch/storage', () => ({
  vibeStorage: { getServerSessionId: () => null, clearSession: vi.fn() },
}));

const dnaResult = {
  sessionId: 'session-1',
  result: {
    socialEnergy: 80,
    adventure: 65,
    spontaneity: 70,
    humor: 75,
    communication: 85,
    intent: 60,
    coverage: 100,
    answerCount: 7,
    scoringVersion: 'v1',
  },
};

const match = {
  blockToken: 'opaque-public-match-token',
  nickname: 'Alex',
  college: 'North Campus',
  score: 94,
  title: 'SAME-CHANNEL ENERGY',
  tagline: 'Your vibes just make sense.',
  whyYouMatch: ['Similar social energy', 'You both like music', 'Your connection goals line up'],
  sharedInterests: ['music'],
};

beforeEach(() => {
  vi.mocked(getServerResult).mockResolvedValue(dnaResult);
  vi.mocked(getDiscovery).mockResolvedValue({
    algorithmVersion: 'v1',
    campus: 'North Campus',
    matches: [match],
  });
  vi.mocked(blockMatch).mockResolvedValue({ blocked: true });
  vi.mocked(unblockMatch).mockResolvedValue({ blocked: false });
});

describe('VibeMatch discovery results', () => {
  it('shows the game result and a privacy-safe top match from the server', async () => {
    render(<ResultsClient />);
    expect(await screen.findByRole('heading', { name: 'Alex' })).toBeTruthy();
    expect(screen.getByText('94%')).toBeTruthy();
    expect(screen.getByText(/Your vibes just make sense/)).toBeTruthy();
    expect(screen.getByText('Why your vibes line up')).toBeTruthy();
    expect(screen.getByText(/score is deterministic/i)).toBeTruthy();
    expect(screen.queryByText(/@alex/i)).toBeNull();
  });

  it('shows a truthful empty state instead of inventing matches', async () => {
    vi.mocked(getDiscovery).mockResolvedValue({
      algorithmVersion: 'v1',
      campus: 'North Campus',
      matches: [],
    });
    render(<ResultsClient />);
    expect(
      await screen.findByRole('heading', { name: 'Your vibe is still loading.' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/percent vibe match/i)).toBeNull();
  });

  it('allows the user to hide a shown match using its opaque block token', async () => {
    render(<ResultsClient />);
    const hideButton = await screen.findByRole('button', {
      name: 'Hide Alex from your VibeMatch discovery',
    });
    fireEvent.click(hideButton);
    await waitFor(() => expect(blockMatch).toHaveBeenCalledWith('opaque-public-match-token'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Alex' })).toBeNull());
    expect(screen.getByRole('heading', { name: 'Your vibe is still loading.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(unblockMatch).toHaveBeenCalledWith('opaque-public-match-token'));
    expect(await screen.findByRole('heading', { name: 'Alex' })).toBeTruthy();
  });

  it('shows a retryable discovery error without losing the private DNA result', async () => {
    vi.mocked(getDiscovery).mockRejectedValueOnce(new Error('Discovery is unavailable.'));
    render(<ResultsClient />);
    expect(await screen.findByRole('heading', { name: /Your vibe is/ })).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
