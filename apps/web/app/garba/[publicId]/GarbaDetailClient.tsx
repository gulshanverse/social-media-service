'use client';
import { useState } from 'react';
import Link from 'next/link';
import { commentGarba, reactGarba, reportGarbaComment } from '../../../lib/garba-api';

type Comment = { id: string; content: string; createdAt: string; replies?: Comment[] };
type Post = {
  publicId: string;
  category: string;
  content: string;
  eventDate: string | null;
  location: string | null;
  instagramHandle: string | null;
  instagramUrl: string | null;
  createdAt: string;
  comments: Comment[];
  _count?: { reactions: number };
};
function CommentItem({
  post,
  comment,
  onDone,
}: {
  post: Post;
  comment: Comment;
  onDone: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const value = String(new FormData(e.currentTarget).get('content') || '');
    try {
      await commentGarba(post.publicId, value, replying ? comment.id : undefined);
      setReplying(false);
      e.currentTarget.reset();
      onDone();
    } catch {
      /* parent reload exposes the moderated state */
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    const reason = window.prompt(
      'Report reason: SPAM, HARASSMENT, INAPPROPRIATE, SCAM, or OTHER',
      'INAPPROPRIATE',
    );
    if (reason)
      await reportGarbaComment(post.publicId, comment.id, reason.toUpperCase()).catch(
        () => undefined,
      );
  }
  return (
    <div className="garba-comment">
      <div>
        <p>{comment.content}</p>
        <small>{new Date(comment.createdAt).toLocaleDateString()}</small>
      </div>
      <div className="garba-comment-actions">
        <button onClick={() => setReplying(!replying)}>{replying ? 'Cancel' : 'Reply'}</button>
        <button onClick={report}>Report</button>
      </div>
      {replying && (
        <form className="garba-reply-form" onSubmit={submit}>
          <input
            name="content"
            maxLength={500}
            minLength={1}
            placeholder="Write a reply…"
            required
          />
          <button disabled={busy}>Reply</button>
        </form>
      )}
      {comment.replies?.map((reply) => (
        <div className="garba-reply" key={reply.id}>
          <p>{reply.content}</p>
          <small>{new Date(reply.createdAt).toLocaleDateString()}</small>
          <button
            onClick={() =>
              reportGarbaComment(post.publicId, reply.id, 'INAPPROPRIATE').catch(() => undefined)
            }
          >
            Report
          </button>
        </div>
      ))}
    </div>
  );
}
export default function GarbaDetailClient({ post }: { post: Post }) {
  const [comments, setComments] = useState(post.comments || []);
  const [reactionCount, setReactionCount] = useState(post._count?.reactions ?? 0);
  const [reacted, setReacted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  async function toggleReaction() {
    if (reactionBusy) return;
    setReactionBusy(true);
    try {
      const result = await reactGarba(post.publicId);
      setReacted(result.reacted);
      setReactionCount(result.count);
    } finally {
      setReactionBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    try {
      await commentGarba(post.publicId, String(new FormData(form).get('content') || ''));
      form.reset();
      window.location.reload();
    } catch {
      /* surface through the existing page state on next refresh */
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="detail-page garba-page">
      <Link className="back-link" href="/garba">
        ← Back to Garba
      </Link>
      <article className="garba-card detail-card">
        <div className="garba-card__top">
          <span>{post.category}</span>
          <time>{new Date(post.createdAt).toLocaleDateString()}</time>
        </div>
        <p>{post.content}</p>
        <div className="garba-meta">
          {post.eventDate && <span>◷ {new Date(post.eventDate).toLocaleDateString()}</span>}
          {post.location && <span>⌖ {post.location}</span>}
        </div>
        {post.instagramUrl && (
          <a className="garba-instagram" href={post.instagramUrl} rel="noreferrer">
            @{post.instagramHandle} ↗
          </a>
        )}
        <div className="garba-card__bottom">
          <button
            type="button"
            onClick={toggleReaction}
            disabled={reactionBusy}
            aria-pressed={reacted}
          >
            {reacted ? '♥ Reacted' : '♡ React'} · {reactionCount}
          </button>
          <span>💬 {comments.length}</span>
        </div>
      </article>
      <section className="garba-comments panel">
        <p className="eyebrow">COMMUNITY CONVERSATION</p>
        <h2>Comments</h2>
        <form className="garba-comment-form" onSubmit={submit}>
          <input
            name="content"
            maxLength={500}
            minLength={1}
            placeholder="Add a thoughtful comment…"
            required
          />
          <button disabled={busy}>Comment</button>
        </form>
        {comments.length ? (
          comments.map((comment) => (
            <CommentItem
              post={post}
              comment={comment}
              onDone={() => window.location.reload()}
              key={comment.id}
            />
          ))
        ) : (
          <p className="muted">No comments yet. Start the conversation.</p>
        )}
      </section>
    </main>
  );
}
