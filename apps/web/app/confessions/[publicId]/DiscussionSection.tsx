'use client';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiRequestError,
  CommenterProfile,
  DiscussionComment,
  DiscussionPage,
  getCommenterIdentity,
  getConfessionReactions,
  getDiscussion,
  postDiscussionComment,
  reactToConfession,
  registerCommenter,
} from '../../../lib/api';

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

export default function DiscussionSection({ publicId }: { publicId: string }) {
  const [reactions, setReactions] = useState<{
    options: string[];
    counts: Record<string, number>;
    customReactions: { emoji: string; count: number }[];
    selected: string | null;
  } | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionPage | null>(null);
  const [profile, setProfile] = useState<CommenterProfile | null>(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<DiscussionComment | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const filteredEmoji = useMemo(
    () => commonEmoji.filter((emoji) => !search || emoji.includes(search)),
    [search],
  );
  useEffect(() => {
    Promise.all([getConfessionReactions(publicId), getDiscussion(publicId), getCommenterIdentity()])
      .then(([reactionData, comments, identity]) => {
        setReactions(reactionData);
        setDiscussion(comments);
        setProfile(identity);
      })
      .catch(() => setError('We could not load the conversation yet.'));
  }, [publicId]);
  async function chooseReaction(emoji: string) {
    setBusy(true);
    setError('');
    try {
      setReactions(await reactToConfession(publicId, emoji));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Reaction failed.');
    } finally {
      setBusy(false);
    }
  }
  function beginSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    if (!profile) {
      setRegistrationOpen(true);
      return;
    }
    void submitComment(content);
  }
  async function submitComment(pendingContent = content) {
    if (submittingRef.current || !pendingContent.trim()) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await postDiscussionComment(publicId, pendingContent, replyTo?.id);
      setContent('');
      setReplyTo(null);
      setNotice(result.message);
      setDiscussion(await getDiscussion(publicId));
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 401) setRegistrationOpen(true);
      else setError(caught instanceof Error ? caught.message : 'Could not post your comment.');
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
      await submitComment(pendingContent);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your profile.');
      setBusy(false);
    }
  }
  return (
    <section className="discussion-section" aria-labelledby="community-replies-heading">
      <div className="reaction-panel">
        <div>
          <p className="eyebrow">FEEL THE ROOM</p>
          <h2>React to this confession</h2>
        </div>
        <div className="reaction-list" aria-label="Confession reactions">
          {(reactions?.options ?? ['❤️', '😂', '🫶', '👍', '🔥', '💡']).map((emoji) => (
            <button
              key={emoji}
              className={`reaction-chip ${reactions?.selected === emoji ? 'reaction-chip--selected' : ''}`}
              aria-pressed={reactions?.selected === emoji}
              disabled={busy}
              onClick={() => void chooseReaction(emoji)}
            >
              <span>{emoji}</span>
              <b>{reactions?.counts[emoji] ?? 0}</b>
            </button>
          ))}
          {reactions?.customReactions.map(({ emoji, count }) => (
            <button
              key={emoji}
              className={`reaction-chip ${reactions.selected === emoji ? 'reaction-chip--selected' : ''}`}
              aria-pressed={reactions.selected === emoji}
              disabled={busy}
              onClick={() => void chooseReaction(emoji)}
            >
              <span>{emoji}</span>
              <b>{count}</b>
            </button>
          ))}
          <button
            className="reaction-chip reaction-chip--custom"
            onClick={() => setPickerOpen((open) => !open)}
            aria-expanded={pickerOpen}
          >
            ＋ React
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
            />{' '}
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
      </div>
      <div className="community-heading">
        <div>
          <p className="eyebrow">THE CONVERSATION</p>
          <h2 id="community-replies-heading">Community replies</h2>
        </div>
        <span>{discussion?.total ?? 0} published replies</span>
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
      <form className="comment-composer" onSubmit={beginSubmit}>
        <div className="avatar avatar--composer">
          {profile ? initials(profile.displayName) : '✦'}
        </div>
        <div className="composer-body">
          {replyTo && (
            <div className="reply-context">
              Replying to <b>{replyTo.profile.displayName}</b>
              <button type="button" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </div>
          )}
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 1000))}
            placeholder={profile ? 'Add something thoughtful…' : 'Join the conversation to reply…'}
            maxLength={1000}
            aria-label="Your comment"
          />
          <div className="composer-footer">
            <span>{content.length}/1000</span>
            <button className="ggv-button" disabled={!content.trim() || busy}>
              {busy ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      </form>
      <div className="comment-list">
        {!discussion ? (
          <div className="discussion-loading">Loading replies…</div>
        ) : discussion.items.length === 0 ? (
          <div className="discussion-empty">
            <strong>Be the first to reply.</strong>
            <span>Your perspective can start the conversation.</span>
          </div>
        ) : (
          discussion.items.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              publicId={publicId}
              onReply={setReplyTo}
            />
          ))
        )}
      </div>
      {discussion?.hasMore && (
        <button
          className="ghost-button load-comments"
          onClick={() =>
            getDiscussion(publicId, discussion.page + 1).then((next) =>
              setDiscussion({ ...next, items: [...discussion.items, ...next.items] }),
            )
          }
        >
          Load more replies
        </button>
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
}: {
  comment: DiscussionComment;
  publicId: string;
  onReply: (comment: DiscussionComment) => void;
}) {
  const [reported, setReported] = useState(false);
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
          <button onClick={() => onReply(comment)}>Reply</button>
          <button
            onClick={() => {
              setReported(true);
              void import('../../../lib/api').then(({ reportDiscussionComment }) =>
                reportDiscussionComment(publicId, comment.id),
              );
            }}
          >
            {reported ? 'Reported' : 'Report'}
          </button>
        </div>
        {comment.replies?.length > 0 && (
          <div className="reply-list">
            {comment.replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} publicId={publicId} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
