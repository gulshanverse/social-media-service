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

  it('renders the complete engagement toolbar and opens the full reply composer', async () => {
    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    const toolbar = await screen.findByRole('group', { name: 'Confession engagement' });
    expect(toolbar.children).toHaveLength(6);
    expect(screen.getByLabelText('7.4K views')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reactions\. Jump to reactions/i })).toHaveAttribute(
      'href',
      '#confession-reactions',
    );
    expect(
      screen.getByRole('button', { name: /replies\. Open reply composer/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save confession' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report confession' })).toBeInTheDocument();
    expect(within(toolbar).queryByText('Views')).not.toBeInTheDocument();
    expect(within(toolbar).queryByText('Reactions')).not.toBeInTheDocument();
    expect(within(toolbar).queryByText('Replies')).not.toBeInTheDocument();
    expect(within(toolbar).queryByText('Save')).not.toBeInTheDocument();
    expect(within(toolbar).getByText('Share')).toHaveClass('visually-hidden');
    expect(within(toolbar).queryByText('Report')).not.toBeInTheDocument();
    expect(screen.queryByText('How does this confession feel?')).not.toBeInTheDocument();
    expect(screen.queryByText('3 reactions')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a reaction' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /replies\. Open reply composer/i }));
    expect(screen.getByRole('dialog', { name: 'Write a reply' })).toBeInTheDocument();
  });

  it('renders public comments when commenter identity loading fails', async () => {
    discussionApi.getCommenterIdentity.mockRejectedValue(new Error('Identity unavailable'));

    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    expect(await screen.findByText('Relatable and kind.')).toBeInTheDocument();
    expect(screen.queryByText('Replies are temporarily unavailable.')).not.toBeInTheDocument();
  });

  it('renders public comments when confession reaction loading fails', async () => {
    discussionApi.getConfessionReactions.mockRejectedValue(new Error('Reactions unavailable'));

    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    expect(await screen.findByText('Relatable and kind.')).toBeInTheDocument();
    expect(screen.queryByText('Replies are temporarily unavailable.')).not.toBeInTheDocument();
  });

  it('shows an immediately published comment after the submit response and discussion refresh', async () => {
    discussionApi.getCommenterIdentity.mockResolvedValue({
      id: 'profile-1',
      displayName: 'Anonymous',
      instagramUsername: 'anonymous',
      instagramUrl: 'https://www.instagram.com/anonymous/',
    });
    const publishedComment = {
      ...comment,
      id: 'comment-new',
      content: 'Newly published reply',
    };
    discussionApi.postDiscussionComment.mockResolvedValue({
      status: 'PUBLISHED',
      message: 'Your comment is now visible.',
      comment: publishedComment,
    });
    discussionApi.getDiscussion
      .mockResolvedValueOnce({ items: [], page: 1, limit: 20, total: 0, hasMore: false })
      .mockResolvedValueOnce({
        items: [publishedComment],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      });

    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    await screen.findByPlaceholderText('Add a thoughtful reply…');
    fireEvent.click(await screen.findByRole('button', { name: /replies\. Open reply composer/i }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Your comment' }), {
      target: { value: 'Newly published reply' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post reply/i }));

    await waitFor(() => expect(discussionApi.postDiscussionComment).toHaveBeenCalled());
    expect(await screen.findByText(/Newly published reply/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your comment is now visible.');
    expect(discussionApi.postDiscussionComment).toHaveBeenCalledWith(
      'conf-1',
      'Newly published reply',
      undefined,
    );
    expect(discussionApi.getDiscussion).toHaveBeenCalledTimes(2);
  });

  it('explains that comments appear immediately and remain reportable', async () => {
    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    expect(screen.getByText(/Comments appear immediately.*report comments/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /replies\. Open reply composer/i }));
    expect(
      await screen.findByText(/Your reply appears immediately and can still be reported/i),
    ).toBeInTheDocument();
  });

  it('shows the discussion error only when the discussion request fails', async () => {
    discussionApi.getDiscussion.mockRejectedValue(new Error('Discussion unavailable'));

    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    expect(await screen.findByText('Replies are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Discussion unavailable');
  });

  it('does not replace the current discussion with a stale confession response', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    const firstDiscussion = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    discussionApi.getDiscussion.mockReturnValueOnce(firstDiscussion).mockResolvedValueOnce({
      items: [{ ...comment, id: 'comment-2', content: 'Current confession comment.' }],
      page: 1,
      limit: 20,
      total: 1,
      hasMore: false,
    });

    const { rerender } = render(<DiscussionSection publicId="conf-1" confession={confession} />);
    rerender(
      <DiscussionSection publicId="conf-2" confession={{ ...confession, publicId: 'conf-2' }} />,
    );

    expect(await screen.findByText('Current confession comment.')).toBeInTheDocument();
    resolveFirst({
      items: [comment],
      page: 1,
      limit: 20,
      total: 1,
      hasMore: false,
    });
    await waitFor(() => expect(screen.queryByText('Relatable and kind.')).not.toBeInTheDocument());
  });
});
