import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicConfession } from '@ggv/types';
import DiscussionSection from './DiscussionSection';

const discussionApi = vi.hoisted(() => ({
  getCommenterIdentity: vi.fn(),
  getConfessionReactions: vi.fn(),
  getDiscussion: vi.fn(),
  postDiscussionComment: vi.fn(),
  reactToComment: vi.fn(),
  reactToConfession: vi.fn(),
  registerCommenter: vi.fn(),
  reportDiscussionComment: vi.fn(),
}));

vi.mock('../../../lib/api', () => discussionApi);

const confession: PublicConfession = {
  publicId: 'conf-1',
  content: 'A thoughtful campus confession.',
  category: 'CRUSH',
  customCategory: null,
  theme: null,
  publishedAt: '2026-11-15T12:00:00.000Z',
  viewCount: 7400,
};

const comment = {
  id: 'comment-1',
  content: 'Relatable and kind.',
  parentId: null,
  createdAt: '2026-11-15T13:00:00.000Z',
  profile: {
    id: 'profile-1',
    displayName: 'Anonymous',
    instagramUsername: 'anonymous',
    instagramUrl: 'https://www.instagram.com/anonymous/',
  },
  replyCount: 0,
  replies: [],
  reactionCounts: { '❤️': 1, '😂': 0, '👍': 0 },
  selectedReactions: [],
};

function seedDiscussion() {
  discussionApi.getCommenterIdentity.mockResolvedValue(null);
  discussionApi.getConfessionReactions.mockResolvedValue({
    options: ['❤️', '😂', '🫶', '👍', '🔥', '💡'],
    counts: { '❤️': 2, '😂': 1, '🫶': 0, '👍': 0, '🔥': 0, '💡': 0 },
    customReactions: [],
    selected: [],
  });
  discussionApi.getDiscussion.mockResolvedValue({
    items: [comment],
    page: 1,
    limit: 20,
    total: 1,
    hasMore: false,
  });
  discussionApi.reactToComment.mockResolvedValue({
    counts: { '❤️': 2, '😂': 0, '👍': 0 },
    selected: ['❤️'],
  });
  discussionApi.reportDiscussionComment.mockResolvedValue({
    status: 'RECEIVED',
    message: 'Reported.',
  });
}

describe('College Confession engagement redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    seedDiscussion();
  });

  it('updates a confession reaction immediately and rolls back when the API fails', async () => {
    discussionApi.reactToConfession.mockRejectedValue(new Error('Network failed'));
    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    const reaction = await screen.findByRole('button', { name: '❤️ reaction, 2' });
    fireEvent.click(reaction);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network failed'));
    expect(screen.getByRole('button', { name: '❤️ reaction, 2' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(discussionApi.reactToConfession).toHaveBeenCalledWith('conf-1', '❤️');
  });

  it('reconciles comment reaction state and persists a local bookmark toggle', async () => {
    discussionApi.reactToConfession.mockResolvedValue({
      options: ['❤️', '😂', '🫶', '👍', '🔥', '💡'],
      counts: { '❤️': 3, '😂': 1, '🫶': 0, '👍': 0, '🔥': 0, '💡': 0 },
      customReactions: [],
      selected: ['❤️'],
    });
    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    const card = await screen.findByRole('article');
    const commentReaction = within(card).getByRole('button', { name: '❤️ reaction, 1' });
    fireEvent.click(commentReaction);
    await waitFor(() =>
      expect(discussionApi.reactToComment).toHaveBeenCalledWith('conf-1', 'comment-1', '❤️'),
    );
    expect(commentReaction).toHaveAttribute('aria-pressed', 'true');

    const save = screen.getByRole('button', { name: 'Save confession' });
    fireEvent.click(save);
    expect(save).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('saved-confession:conf-1')).toBe('true');
  });
});
