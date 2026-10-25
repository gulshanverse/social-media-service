'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export type BawalBoxResponse = { id: string; content: string; pinned: boolean; createdAt: string };
export type BawalBoxQuestion = {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status: string;
  responses: BawalBoxResponse[];
};
export type BawalBoxPage = {
  settings: Record<string, any>;
  featuredQuestion: BawalBoxQuestion | null;
  archive: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    _count: { responses: number };
  }>;
};

export function BawalBoxClient({ data }: { data: BawalBoxPage | null }) {
  const [content, setContent] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const settings = data?.settings ?? {
    brandName: 'BawalBox',
    tagline: 'Sawaal ek, bawal anek!',
    introTitle: 'The question is anonymous. The bawal is communal.',
    introDescription:
      'Share a question, read what your campus thinks, and keep it kind. No public profile required.',
    emptyStateText: 'No question is live right now. Check back soon.',
  };
  const question = data?.featuredQuestion;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question || !content.trim()) return;
    setState('sending');
    try {
      const response = await fetch(`${API}/bawalbox/questions/${question.id}/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message ?? 'Unable to send your answer.',
        );
      setContent('');
      setState('sent');
    } catch {
      setState('error');
    }
  }
  return (
    <main
      className="bawalbox-shell"
      style={{ '--bawal-accent': settings.accentColor ?? '#ff2d75' } as React.CSSProperties}
    >
      <section className="bawalbox-hero" aria-labelledby="bawalbox-title">
        <div>
          <p className="eyebrow">{settings.tagline}</p>
          <h1 id="bawalbox-title">
            {settings.brandName}
            <span>?</span>
          </h1>
          <p className="bawalbox-lede">{settings.longDescription ?? settings.introDescription}</p>
          <div className="home-actions">
            <Link className="home-button" href="#question">
              {settings.introCta ?? 'Ask anonymously'} <span aria-hidden="true">↓</span>
            </Link>
            <Link className="home-button home-button--secondary" href="/community-guidelines">
              Read the guidelines
            </Link>
          </div>
        </div>
        <div className="bawalbox-hero-card">
          <span aria-hidden="true">?</span>
          <strong>{settings.heroHeading ?? 'One question.'}</strong>
          <small>{settings.heroSubtitle ?? 'Many campus answers.'}</small>
        </div>
      </section>
      <section className="bawalbox-intro">
        <p className="eyebrow">THE CAMPUS QUESTION BOX</p>
        <h2>{settings.introTitle}</h2>
        <p>{settings.introDescription}</p>
      </section>
      <section className="bawalbox-question-layout" id="question">
        <div className="bawalbox-question-column">
          {!data ? (
            <div className="state-panel">
              <h2> BawalBox is taking a breather.</h2>
              <p>Try again in a moment.</p>
            </div>
          ) : !question ? (
            <div className="state-panel">
              <h2>{settings.emptyStateText}</h2>
              <p>The next question will appear here when it is ready.</p>
            </div>
          ) : (
            <>
              <div className="bawalbox-question-card">
                <p className="eyebrow">THIS WEEK&apos;S QUESTION</p>
                <h2>{question.title}</h2>
                {question.description && <p>{question.description}</p>}
                {question.instructions && <small>{question.instructions}</small>}
              </div>
              <form className="bawalbox-response-form" onSubmit={submit}>
                <label htmlFor="bawalbox-response">Your anonymous answer</label>
                <textarea
                  id="bawalbox-response"
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setState('idle');
                  }}
                  maxLength={2000}
                  minLength={2}
                  rows={6}
                  placeholder="Say what you really think — without naming or targeting someone."
                  required
                />
                <div className="bawalbox-form-footer">
                  <small>{content.length}/2000 · reviewed before publishing</small>
                  <button className="home-button" disabled={state === 'sending'}>
                    {state === 'sending' ? 'Sending…' : 'Send anonymously ↗'}
                  </button>
                </div>
                {state === 'sent' && (
                  <p className="bawalbox-success" role="status">
                    Queued for review. Thanks for adding to the bawal.
                  </p>
                )}
                {state === 'error' && (
                  <p className="bawalbox-error" role="alert">
                    Could not send that right now. Please try again.
                  </p>
                )}
              </form>
            </>
          )}
        </div>
        {question && (
          <aside className="bawalbox-responses">
            <div className="form-heading">
              <div>
                <p className="eyebrow">APPROVED ANSWERS</p>
                <h2>What campus said</h2>
              </div>
              <span>{question.responses.length}</span>
            </div>
            {question.responses.length ? (
              question.responses.map((response) => (
                <article className="bawalbox-response-card" key={response.id}>
                  <p>{response.content}</p>
                  {response.pinned && <small>Featured answer</small>}
                </article>
              ))
            ) : (
              <div className="state-panel">
                <p>Be the first approved answer.</p>
              </div>
            )}
          </aside>
        )}
      </section>
      {!!data?.archive.length && (
        <section className="bawalbox-archive">
          <p className="eyebrow">THE QUESTION ARCHIVE</p>
          <h2>Previous prompts</h2>
          <div className="bawalbox-archive-grid">
            {data.archive.map((item) => (
              <article key={item.id}>
                <span>{item._count.responses} answers</span>
                <h3>{item.title}</h3>
                <small>
                  {item.status === 'ARCHIVED' ? 'Archived question' : 'Previous question'}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
