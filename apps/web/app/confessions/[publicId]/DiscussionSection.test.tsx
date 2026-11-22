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
  editDiscussionComment: vi.fn(),
  deleteDiscussionComment: vi.fn(),
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

  it('keeps a successful confession reaction reconciled with the API response', async () => {
    discussionApi.reactToConfession.mockResolvedValue({
      options: ['❤️', '😂', '🫶', '👍', '🔥', '💡'],
      counts: { '❤️': 3, '😂': 1, '🫶': 0, '👍': 0, '🔥': 0, '💡': 0 },
      customReactions: [],
      selected: ['❤️'],
    });
    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    const reaction = await screen.findByRole('button', { name: '❤️ reaction, 2' });
    fireEvent.click(reaction);

    await waitFor(() => expect(reaction).toHaveAttribute('aria-pressed', 'true'));
    expect(reaction).toHaveAccessibleName('❤️ reaction, 3');
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

  it('does not report a published comment as failed when the refresh fails', async () => {
    discussionApi.getCommenterIdentity.mockResolvedValue({
      id: 'profile-1',
      displayName: 'Anonymous',
      instagramUsername: 'anonymous',
      instagramUrl: 'https://www.instagram.com/anonymous/',
    });
    discussionApi.postDiscussionComment.mockResolvedValue({
      status: 'PUBLISHED',
      message: 'Your comment is now visible.',
      comment,
    });
    discussionApi.getDiscussion.mockResolvedValueOnce({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    });
    discussionApi.getDiscussion.mockRejectedValueOnce(new Error('Refresh unavailable'));

    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    await screen.findByPlaceholderText('Add a thoughtful reply…');
    fireEvent.click(await screen.findByRole('button', { name: /replies\. Open reply composer/i }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Your comment' }), {
      target: { value: 'Published despite refresh trouble' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post reply/i }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /Your comment is now visible.*Refresh the page/i,
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

  it('links a valid commenter display name and leaves an unavailable handle as text', async () => {
    discussionApi.getDiscussion.mockResolvedValueOnce({
      items: [
        comment,
        {
          ...comment,
          id: 'comment-invalid-handle',
          profile: {
            ...comment.profile,
            displayName: 'No Link',
            instagramUsername: null,
            instagramUrl: null,
          },
        },
        {
          ...comment,
          id: 'comment-invalid-username',
          profile: {
            ...comment.profile,
            displayName: 'Invalid Link',
            instagramUsername: 'bad username',
            instagramUrl: 'https://example.com/not-instagram',
          },
        },
      ],
      page: 1,
      limit: 20,
      total: 2,
      hasMore: false,
    });

    render(<DiscussionSection publicId="conf-1" confession={confession} />);

    const validName = await screen.findByRole('link', { name: 'Anonymous' });
    expect(validName).toHaveAttribute('href', 'https://www.instagram.com/anonymous/');
    expect(validName).toHaveAttribute('target', '_blank');
    expect(validName).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('No Link').closest('a')).toBeNull();
    expect(screen.getByText('Invalid Link').closest('a')).toBeNull();
  });

  it('posts a reply against the selected nested comment', async () => {
    const nested = {
      ...comment,
      id: 'nested-reply',
      parentId: 'comment-1',
      content: 'Nested reply',
    };
    discussionApi.getCommenterIdentity.mockResolvedValue({
      id: 'profile-1',
      displayName: 'Anonymous',
      instagramUsername: 'anonymous',
      instagramUrl: 'https://www.instagram.com/anonymous/',
    });
    const discussionWithNestedReply = {
      items: [{ ...comment, replyCount: 1, replies: [nested] }],
      page: 1,
      limit: 20,
      total: 1,
      hasMore: false,
    };
    discussionApi.getDiscussion.mockResolvedValueOnce(discussionWithNestedReply);
    discussionApi.getDiscussion.mockResolvedValueOnce(discussionWithNestedReply);
    discussionApi.postDiscussionComment.mockResolvedValue({
      status: 'PUBLISHED',
      message: 'Your comment is now visible.',
      comment: nested,
    });

    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    const replyButtons = await screen.findAllByRole('button', { name: '↩ Reply' });
    fireEvent.click(replyButtons[replyButtons.length - 1]);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Your comment' }), {
      target: { value: 'Reply to nested' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post reply/i }));

    await waitFor(() =>
      expect(discussionApi.postDiscussionComment).toHaveBeenCalledWith(
        'conf-1',
        'Reply to nested',
        'nested-reply',
      ),
    );
    expect(await screen.findByText('Nested reply')).toBeInTheDocument();
  });

  it('shows owner actions, edits inline, and keeps actions hidden for other users', async () => {
    discussionApi.getCommenterIdentity.mockResolvedValue({ ...comment.profile, id: 'profile-1' });
    discussionApi.editDiscussionComment.mockResolvedValue({
      status: 'UPDATED',
      message: 'Updated.',
      comment: { ...comment, content: 'Edited comment' },
    });
    const firstRender = render(<DiscussionSection publicId="conf-1" confession={confession} />);
    expect(await screen.findByRole('button', { name: 'Comment actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comment actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit comment' }));
    const editor = screen.getByRole('textbox', { name: 'Edit comment' });
    fireEvent.change(editor, { target: { value: 'Edited comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(discussionApi.editDiscussionComment).toHaveBeenCalledWith(
        'conf-1',
        'comment-1',
        'Edited comment',
      ),
    );
    expect(await screen.findByText('Edited comment')).toBeInTheDocument();
    firstRender.unmount();

    discussionApi.getCommenterIdentity.mockResolvedValue({
      ...comment.profile,
      id: 'different-profile',
    });
    const { unmount } = render(<DiscussionSection publicId="conf-1" confession={confession} />);
    await screen.findByText('Relatable and kind.');
    expect(screen.queryByRole('button', { name: 'Comment actions' })).not.toBeInTheDocument();
    unmount();
  });

  it('preserves the full reply tree, reply counts, and reactions when editing top-level and nested comments', async () => {
    const nestedChild = {
      ...comment,
      id: 'nested-child',
      parentId: 'nested-reply',
      content: 'Nested child reply',
      reactionCounts: { '❤️': 2, '😂': 0, '👍': 0 },
    };
    const nestedReply = {
      ...comment,
      id: 'nested-reply',
      parentId: 'root-comment',
      content: 'Nested reply',
      replyCount: 1,
      replies: [nestedChild],
      reactionCounts: { '❤️': 3, '😂': 0, '👍': 0 },
    };
    const root = {
      ...comment,
      id: 'root-comment',
      content: 'Root comment',
      replyCount: 2,
      replies: [nestedReply],
      reactionCounts: { '❤️': 4, '😂': 0, '👍': 0 },
    };
    discussionApi.getCommenterIdentity.mockResolvedValue({ ...comment.profile, id: 'profile-1' });
    discussionApi.getDiscussion.mockResolvedValue({
      items: [root],
      page: 1,
      limit: 20,
      total: 1,
      hasMore: false,
    });
    discussionApi.editDiscussionComment
      .mockResolvedValueOnce({
        status: 'UPDATED',
        message: 'Updated.',
        comment: { ...root, content: 'Edited root', replies: [], reactionCounts: {} },
      })
      .mockResolvedValueOnce({
        status: 'UPDATED',
        message: 'Updated.',
        comment: { ...nestedReply, content: 'Edited nested', replies: [], reactionCounts: {} },
      });

    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    expect(await screen.findByText('Root comment')).toBeInTheDocument();
    expect(screen.getByText('Nested reply')).toBeInTheDocument();
    expect(screen.getByText('Nested child reply')).toBeInTheDocument();

    const rootCard = screen.getByText('Root comment').closest('article') as HTMLElement;
    fireEvent.click(within(rootCard).getAllByRole('button', { name: 'Comment actions' })[0]);
    fireEvent.click(within(rootCard).getByRole('menuitem', { name: 'Edit comment' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit comment' }), {
      target: { value: 'Edited root' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Edited root')).toBeInTheDocument());
    expect(screen.getByText('Nested reply')).toBeInTheDocument();
    expect(screen.getByText('Nested child reply')).toBeInTheDocument();
    expect(within(rootCard).getByRole('button', { name: '❤️ reaction, 4' })).toBeInTheDocument();

    const nestedCard = screen.getByText('Nested reply').closest('article') as HTMLElement;
    fireEvent.click(within(nestedCard).getAllByRole('button', { name: 'Comment actions' })[0]);
    fireEvent.click(within(nestedCard).getByRole('menuitem', { name: 'Edit comment' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit comment' }), {
      target: { value: 'Edited nested' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Edited nested')).toBeInTheDocument());
    expect(screen.getByText('Edited root')).toBeInTheDocument();
    expect(screen.getByText('Nested child reply')).toBeInTheDocument();
    expect(within(nestedCard).getByRole('button', { name: '❤️ reaction, 3' })).toBeInTheDocument();
    expect(discussionApi.editDiscussionComment).toHaveBeenNthCalledWith(
      1,
      'conf-1',
      'root-comment',
      'Edited root',
    );
    expect(discussionApi.editDiscussionComment).toHaveBeenNthCalledWith(
      2,
      'conf-1',
      'nested-reply',
      'Edited nested',
    );
  });

  it('requires confirmation before deleting and renders the deleted placeholder', async () => {
    discussionApi.getCommenterIdentity.mockResolvedValue({ ...comment.profile, id: 'profile-1' });
    discussionApi.deleteDiscussionComment.mockResolvedValue({
      status: 'DELETED',
      message: 'Deleted.',
      comment: {
        ...comment,
        content: 'This comment was deleted.',
        deletedAt: '2026-11-22T10:00:00.000Z',
        profile: {
          id: 'deleted-comment',
          displayName: 'Deleted commenter',
          instagramUsername: null,
          instagramUrl: null,
        },
      },
    });
    const confirm = window.confirm;
    window.confirm = vi.fn(() => true);
    render(<DiscussionSection publicId="conf-1" confession={confession} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Comment actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete comment' }));
    await waitFor(() =>
      expect(discussionApi.deleteDiscussionComment).toHaveBeenCalledWith('conf-1', 'comment-1'),
    );
    expect(await screen.findByText('This comment was deleted.')).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalledWith('Delete this comment? This cannot be undone.');
    window.confirm = confirm;
  });
});
