'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicConfession } from '@ggv/types';
import { ShareMenu } from '../../../components/ShareMenu';
import {
  ApiRequestError,
  CommenterProfile,
  DiscussionComment,
  DiscussionPage,
  ReactionState,
  getCommenterIdentity,
  getConfessionReactions,
  getDiscussion,
  postDiscussionComment,
  reactToComment,
  reactToConfession,
  registerCommenter,
  reportDiscussionComment,
} from '../../../lib/api';
import { EngagementIcon } from './EngagementIcon';

const commonEmoji = [
  '❤️',
  '😂',
  '🫶',
  '👍',
  '🔥',
  '💡',
  '😍',
  '🥹',
  '👏',
  '✨',
  '😭',
  '😮',
  '🎉',
  '💯',
  '🤝',
  '🙌',
  '👀',
  '😅',
  '💔',
  '🌻',
];
const commentEmoji = ['❤️', '😂', '👍'];

type SortOrder = 'popular' | 'latest';
type FloatingReaction = { id: number; emoji: string };
type CommentReactionSummary = { counts: Record<string, number>; selected: string[] };

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function relative(date: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function compactCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function totalReactionCount(state: ReactionState | null) {
  return state ? Object.values(state.counts).reduce((total, count) => total + count, 0) : 0;
}

function commentReactionCount(comment: DiscussionComment) {
  return Object.values(comment.reactionCounts ?? {}).reduce((total, count) => total + count, 0);
}

function updateCommentReaction(
  items: DiscussionComment[],
  commentId: string,
  summary: CommentReactionSummary,
): DiscussionComment[] {
  return items.map((comment) => ({
    ...comment,
    ...(comment.id === commentId
      ? { reactionCounts: summary.counts, selectedReactions: summary.selected }
      : {}),
    replies: updateCommentReaction(comment.replies, commentId, summary),
  }));
}

function updateCommentReactionOptimistically(
  items: DiscussionComment[],
  commentId: string,
  emoji: string,
): DiscussionComment[] {
  return items.map((comment) => {
    if (comment.id === commentId) {
      const selectedReactions = comment.selectedReactions ?? [];
      const reactionCounts = comment.reactionCounts ?? {};
      const selected = selectedReactions.includes(emoji);
      const nextCounts = { ...reactionCounts, [emoji]: reactionCounts[emoji] ?? 0 };
      nextCounts[emoji] = Math.max(0, nextCounts[emoji] + (selected ? -1 : 1));
      return {
        ...comment,
        reactionCounts: nextCounts,
        selectedReactions: selected
          ? selectedReactions.filter((item) => item !== emoji)
          : [...selectedReactions, emoji],
      };
    }
    return {
      ...comment,
      replies: updateCommentReactionOptimistically(comment.replies, commentId, emoji),
    };
  });
}

export default function DiscussionSection({
  publicId,
  confession,
}: {
  publicId: string;
  confession: PublicConfession;
}) {
  const [reactions, setReactions] = useState<ReactionState | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionPage | null>(null);
  const [profile, setProfile] = useState<CommenterProfile | null>(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<DiscussionComment | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('popular');
  const [error, setError] = useState('');
  const [discussionLoadError, setDiscussionLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingReactions, setPendingReactions] = useState<string[]>([]);
  const [pendingCommentReactions, setPendingCommentReactions] = useState<string[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [saved, setSaved] = useState(false);
  const [composerStickyReady, setComposerStickyReady] = useState(false);
  const floatingId = useRef(0);
  const submittingRef = useRef(false);
  const discussionRequestRef = useRef(0);
  const filteredEmoji = useMemo(
    () => commonEmoji.filter((emoji) => !search || emoji.includes(search)),
    [search],
  );

  useEffect(() => {
    let active = true;
    const requestId = discussionRequestRef.current + 1;
    discussionRequestRef.current = requestId;

    // Reset confession-scoped data immediately so a previous confession cannot flash
    // while the new one is loading. Optional requests must not control discussion rendering.
    setDiscussion(null);
    setDiscussionLoadError('');
    setReactions(null);
    setProfile(null);

    getDiscussion(publicId)
      .then((comments) => {
        if (!active || discussionRequestRef.current !== requestId) return;
        setDiscussion(comments);
      })
      .catch((caught) => {
        if (!active || discussionRequestRef.current !== requestId) return;
        setDiscussionLoadError(
          caught instanceof Error ? caught.message : 'We could not load the conversation yet.',
        );
      });

    getConfessionReactions(publicId)
      .then((reactionData) => {
        if (active && discussionRequestRef.current === requestId) setReactions(reactionData);
      })
      .catch(() => {
        // Reactions are an enhancement. A failure here must never hide public comments.
      });

    getCommenterIdentity()
      .then((identity) => {
        if (active && discussionRequestRef.current === requestId) setProfile(identity);
      })
      .catch(() => {
        // Identity is only needed for posting. Anonymous visitors can still read comments.
      });

    return () => {
      active = false;
    };
  }, [publicId]);

  useEffect(() => {
    try {
      setSaved(window.localStorage.getItem(`saved-confession:${publicId}`) === 'true');
    } catch {
      // Local bookmarks are an enhancement; private browsing may deny storage access.
    }
  }, [publicId]);

  useEffect(() => {
    const heading = document.getElementById('community-replies-heading');
    if (!heading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      setComposerStickyReady(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heading);
    return () => observer.disconnect();
  }, [publicId]);

  const sortedComments = useMemo(() => {
    if (!discussion) return [];
    return [...discussion.items].sort((a, b) => {
      if (sortOrder === 'latest')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return (
        commentReactionCount(b) + b.replyCount - (commentReactionCount(a) + a.replyCount) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [discussion, sortOrder]);

  function addFloatingReaction(emoji: string) {
    const id = floatingId.current++;
    setFloatingReactions((current) => [...current, { id, emoji }]);
    window.setTimeout(
      () => setFloatingReactions((current) => current.filter((item) => item.id !== id)),
      900,
    );
  }

  function setPending(setter: typeof setPendingReactions, emoji: string, pending: boolean) {
    setter((current) => (pending ? [...current, emoji] : current.filter((item) => item !== emoji)));
  }

  async function chooseReaction(emoji: string) {
    if (pendingReactions.includes(emoji) || !reactions) return;
    const previous = reactions;
    const selected = previous.selected.includes(emoji);
    const counts = { ...previous.counts, [emoji]: previous.counts[emoji] ?? 0 };
    counts[emoji] = Math.max(0, counts[emoji] + (selected ? -1 : 1));
    setPending(setPendingReactions, emoji, true);
    setReactions({
      ...previous,
      counts,
      selected: selected
        ? previous.selected.filter((item) => item !== emoji)
        : [...previous.selected, emoji],
    });
    if (!selected) addFloatingReaction(emoji);
    setError('');
    try {
      setReactions(await reactToConfession(publicId, emoji));
    } catch (caught) {
      setReactions(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Reaction failed. Your previous state was restored.',
      );
    } finally {
      setPending(setPendingReactions, emoji, false);
    }
  }

  async function chooseCommentReaction(comment: DiscussionComment, emoji: string) {
    if (!discussion || pendingCommentReactions.includes(comment.id)) return;
    const previous = discussion;
    setPending(setPendingCommentReactions, comment.id, true);
    setDiscussion({
      ...discussion,
      items: updateCommentReactionOptimistically(discussion.items, comment.id, emoji),
    });
    try {
      const summary = await reactToComment(publicId, comment.id, emoji);
      setDiscussion((current) =>
        current
          ? { ...current, items: updateCommentReaction(current.items, comment.id, summary) }
          : current,
      );
    } catch (caught) {
      setDiscussion(previous);
      setError(caught instanceof Error ? caught.message : 'Comment reaction failed.');
    } finally {
      setPending(setPendingCommentReactions, comment.id, false);
    }
  }

  function beginSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) {
      setError('Write something before posting.');
      return;
    }
    if (!profile) {
      setComposerOpen(false);
      setRegistrationOpen(true);
      return;
    }
    void submitComment(content);
  }

  async function submitComment(pendingContent = content) {
    if (submittingRef.current || !pendingContent.trim()) return;
    const requestId = discussionRequestRef.current;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await postDiscussionComment(publicId, pendingContent, replyTo?.id);
      setContent('');
      setReplyTo(null);
      setComposerOpen(false);
      setNotice(result.message);
      const nextDiscussion = await getDiscussion(publicId);
      if (discussionRequestRef.current === requestId) setDiscussion(nextDiscussion);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) {
        setComposerOpen(false);
        setRegistrationOpen(true);
      } else setError(caught instanceof Error ? caught.message : 'Could not post your comment.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const pendingContent = content;
      const result = await registerCommenter({ displayName, instagramUsername });
      setProfile(result.profile);
      setRegistrationOpen(false);
      setComposerOpen(true);
      await submitComment(pendingContent);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your profile.');
      setBusy(false);
    }
  }

  function openReply(comment: DiscussionComment) {
    setReplyTo(comment);
    setComposerOpen(true);
  }

  function toggleSaved() {
    setSaved((current) => {
      const next = !current;
      try {
        if (next) window.localStorage.setItem(`saved-confession:${publicId}`, 'true');
        else window.localStorage.removeItem(`saved-confession:${publicId}`);
      } catch {
        // Keep the in-memory state usable if browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <section className="discussion-section" aria-labelledby="community-replies-heading">
      <div className="engagement-stats" role="group" aria-label="Confession engagement">
        <div
          className="engagement-action engagement-metric"
          role="img"
          aria-label={`${compactCount(confession.viewCount)} views`}
        >
          <EngagementIcon name="eye" />
          <strong>{compactCount(confession.viewCount)}</strong>
        </div>
        <a
          className="engagement-action engagement-metric engagement-reactions-link"
          href="#confession-reactions"
          aria-label={`${compactCount(totalReactionCount(reactions))} reactions. Jump to reactions.`}
        >
          <EngagementIcon name="heart" />
          <strong>{compactCount(totalReactionCount(reactions))}</strong>
        </a>
        <button
          className="engagement-action engagement-metric"
          aria-label={`${compactCount(discussion?.total ?? 0)} replies. Open reply composer.`}
          onClick={() => setComposerOpen(true)}
        >
          <EngagementIcon name="message" />
          <strong>{compactCount(discussion?.total ?? 0)}</strong>
        </button>
        <button
          className={`engagement-action engagement-save ${saved ? 'is-saved' : ''}`}
          aria-label={saved ? 'Remove confession from saved' : 'Save confession'}
          aria-pressed={saved}
          onClick={toggleSaved}
        >
          <EngagementIcon name="bookmark" />
        </button>
        <div className="engagement-share">
          <ShareMenu
            url={
              typeof window === 'undefined'
                ? `https://www.confessions.live/confessions/${publicId}`
                : window.location.href
            }
            title="College Confession"
            buttonClassName="engagement-action engagement-share-button"
            buttonContent={
              <>
                <EngagementIcon name="send" />
                <span className="visually-hidden">Share</span>
              </>
            }
          />
        </div>
        <Link
          className="engagement-action engagement-report"
          href={`/report?confession=${encodeURIComponent(publicId)}`}
          aria-label="Report confession"
        >
          <EngagementIcon name="flag" />
        </Link>
      </div>

      <div className="reaction-panel" id="confession-reactions">
        <div className="reaction-list" role="group" aria-label="Confession reactions">
          {(reactions?.options ?? ['❤️', '😂', '🫶', '👍', '🔥', '💡']).map((emoji) => {
            const selected = reactions?.selected.includes(emoji);
            return (
              <button
                key={emoji}
                className={`reaction-chip ${selected ? 'reaction-chip--selected' : ''}`}
                aria-label={`${emoji} reaction, ${reactions?.counts[emoji] ?? 0}`}
                aria-pressed={selected}
                disabled={!reactions || pendingReactions.includes(emoji)}
                onClick={() => void chooseReaction(emoji)}
              >
                <span className="reaction-chip__emoji" aria-hidden="true">
                  {emoji}
                </span>
                <b>{compactCount(reactions?.counts[emoji] ?? 0)}</b>
              </button>
            );
          })}
          {reactions?.customReactions.map(({ emoji, count }) => (
            <button
              key={emoji}
              className={`reaction-chip ${reactions.selected.includes(emoji) ? 'reaction-chip--selected' : ''}`}
              aria-label={`${emoji} reaction, ${count}`}
              aria-pressed={reactions.selected.includes(emoji)}
              disabled={pendingReactions.includes(emoji)}
              onClick={() => void chooseReaction(emoji)}
            >
              <span className="reaction-chip__emoji" aria-hidden="true">
                {emoji}
              </span>
              <b>{compactCount(count)}</b>
            </button>
          ))}
          <button
            className="reaction-chip reaction-chip--custom"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label="Add a reaction"
            aria-expanded={pickerOpen}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        {pickerOpen && (
          <div className="emoji-picker" role="dialog" aria-label="Choose a custom emoji">
            <div className="emoji-picker__top">
              <strong>Choose a reaction</strong>
              <button
                className="icon-button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close emoji picker"
              >
                ×
              </button>
            </div>
            <input
              aria-label="Search emoji"
              placeholder="Search emoji"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="emoji-grid">
              {filteredEmoji.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setPickerOpen(false);
                    void chooseReaction(emoji);
                  }}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="floating-reactions" aria-live="polite" aria-atomic="true">
          {floatingReactions.map(({ id, emoji }) => (
            <span key={id}>{emoji}</span>
          ))}
        </div>
      </div>

      <div className="community-heading">
        <div>
          <h2 id="community-replies-heading">
            Replies <span>({compactCount(discussion?.total ?? 0)})</span>
          </h2>
        </div>
        <div className="sort-toggle" role="group" aria-label="Sort replies">
          <button
            className={sortOrder === 'popular' ? 'is-active' : ''}
            aria-pressed={sortOrder === 'popular'}
            onClick={() => setSortOrder('popular')}
          >
            ✦ Popular
          </button>
          <button
            className={sortOrder === 'latest' ? 'is-active' : ''}
            aria-pressed={sortOrder === 'latest'}
            onClick={() => setSortOrder('latest')}
          >
            ◷ Latest
          </button>
        </div>
      </div>
      <p className="community-guideline">
        Keep it kind, specific, and safe. Every reply is reviewed before it appears on the wall.
      </p>
      {notice && (
        <p className="discussion-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="comment-list">
        {discussionLoadError ? (
          <div className="discussion-empty discussion-empty--error" role="alert">
            <strong>Replies are temporarily unavailable.</strong>
            <span>{discussionLoadError}</span>
          </div>
        ) : !discussion ? (
          <div className="discussion-loading">
            <span className="loading-dot" /> Loading replies…
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="discussion-empty">
            <strong>Be the first to reply.</strong>
            <span>Your perspective can start the conversation.</span>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={openReply}
              onReact={chooseCommentReaction}
              publicId={publicId}
            />
          ))
        )}
      </div>
      {discussion?.hasMore && (
        <button
          className="ghost-button load-comments"
          onClick={() => {
            const requestId = discussionRequestRef.current;
            const currentDiscussion = discussion;
            getDiscussion(publicId, currentDiscussion.page + 1).then((next) => {
              if (discussionRequestRef.current !== requestId) return;
              setDiscussion({ ...next, items: [...currentDiscussion.items, ...next.items] });
            });
          }}
        >
          Load more replies
        </button>
      )}
      <div className={`composer-launcher ${composerStickyReady ? 'is-sticky-ready' : ''}`}>
        <div className="avatar avatar--composer">
          {profile ? initials(profile.displayName) : <EngagementIcon name="user" />}
        </div>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 1000))}
          onFocus={() => setComposerOpen(true)}
          placeholder={profile ? 'Add a thoughtful reply…' : 'Join the conversation to reply…'}
          maxLength={1000}
          aria-label="Quick reply"
        />
        <button
          type="button"
          className="composer-send"
          aria-label="Open reply composer"
          onClick={() => setComposerOpen(true)}
        >
          <EngagementIcon name="send" />
        </button>
      </div>

      {composerOpen && (
        <div
          className="composer-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setComposerOpen(false);
          }}
        >
          <form
            className="composer-modal"
            onSubmit={beginSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reply-composer-title"
          >
            <div className="composer-modal__top">
              <div>
                <p className="eyebrow">{replyTo ? 'THREAD REPLY' : 'QUICK REPLY'}</p>
                <h2 id="reply-composer-title">Write a reply</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close reply composer"
              >
                ×
              </button>
            </div>
            {replyTo && (
              <div className="reply-context">
                Replying to <b>{replyTo.profile.displayName}</b>
                <button type="button" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </div>
            )}
            <textarea
              autoFocus
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, 1000))}
              placeholder="Add your thoughts, opinion or experience…"
              maxLength={1000}
              aria-label="Your comment"
            />
            <div className="composer-guidance">
              <span>Your reply will be reviewed before it appears publicly.</span>
              <span>{content.length}/1000</span>
            </div>
            <button className="ggv-button composer-submit" disabled={!content.trim() || busy}>
              {busy ? 'Posting…' : '➤  Post reply'}
            </button>
          </form>
        </div>
      )}

      {registrationOpen && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="registration-modal"
            onSubmit={register}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-conversation-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setRegistrationOpen(false)}
              aria-label="Close registration"
            >
              ×
            </button>
            <p className="eyebrow">WELCOME IN</p>
            <h2 id="join-conversation-title">Join the Conversation</h2>
            <p className="modal-copy">
              Your display name and Instagram username appear publicly beside your replies. Your
              Instagram account is not verified, and we never ask for your password.
            </p>
            <label>
              Display name
              <input
                required
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label>
              Instagram username
              <input
                required
                maxLength={31}
                placeholder="your.handle"
                value={instagramUsername}
                onChange={(event) => setInstagramUsername(event.target.value)}
              />
            </label>
            <button className="ggv-button" disabled={busy}>
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function CommentCard({
  comment,
  publicId,
  onReply,
  onReact,
}: {
  comment: DiscussionComment;
  publicId: string;
  onReply: (comment: DiscussionComment) => void;
  onReact: (comment: DiscussionComment, emoji: string) => void;
}) {
  const [reported, setReported] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(comment.replies.length <= 2);
  const visibleReplies = repliesExpanded ? comment.replies : comment.replies.slice(0, 2);
  return (
    <article className="comment-card">
      <div className="avatar">{initials(comment.profile.displayName)}</div>
      <div className="comment-main">
        <div className="comment-meta">
          <strong>{comment.profile.displayName}</strong>
          <a href={comment.profile.instagramUrl} target="_blank" rel="noreferrer">
            @{comment.profile.instagramUsername}
          </a>
          <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>
            {relative(comment.createdAt)}
          </time>
        </div>
        <p>{comment.content}</p>
        <div className="comment-actions">
          {commentEmoji.map((emoji) => {
            const selected = (comment.selectedReactions ?? []).includes(emoji);
            return (
              <button
                key={emoji}
                className={`comment-reaction ${selected ? 'is-selected' : ''}`}
                aria-label={`${emoji} reaction, ${comment.reactionCounts?.[emoji] ?? 0}`}
                aria-pressed={selected}
                onClick={() => onReact(comment, emoji)}
              >
                <span aria-hidden="true">{emoji}</span> {comment.reactionCounts?.[emoji] ?? 0}
              </button>
            );
          })}
          <button onClick={() => onReply(comment)}>↩ Reply</button>
          <button
            onClick={() => {
              setReported(true);
              void reportDiscussionComment(publicId, comment.id);
            }}
          >
            {reported ? 'Reported' : 'Report'}
          </button>
        </div>
        {comment.replies.length > 0 && (
          <div className="reply-thread">
            {visibleReplies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                publicId={publicId}
                onReply={onReply}
                onReact={onReact}
              />
            ))}
            {comment.replies.length > 2 && (
              <button
                className="thread-toggle"
                onClick={() => setRepliesExpanded((expanded) => !expanded)}
              >
                {repliesExpanded
                  ? 'Hide replies'
                  : `View ${comment.replies.length - 2} more replies`}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
