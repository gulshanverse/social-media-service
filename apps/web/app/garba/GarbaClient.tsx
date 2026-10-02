'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createGarbaPost, GarbaFeed, GarbaPost, getGarba } from '../../lib/garba-api';

const categories = [
  ['', 'All'],
  ['PARTNER', 'Partner'],
  ['GROUP', 'Group'],
  ['FRIENDS', 'Friends'],
  ['EVENT', 'Events'],
  ['PRACTICE', 'Practice'],
  ['GENERAL', 'General'],
];
const labels: Record<string, string> = {
  PARTNER: 'Looking for partner',
  GROUP: 'Looking for a group',
  FRIENDS: 'Looking for friends',
  EVENT: 'Going to an event',
  PRACTICE: 'Practice partner',
  GENERAL: 'Garba community',
};
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
}
function PostCard({ post }: { post: GarbaPost }) {
  return (
    <article className="garba-card">
      <div className="garba-card__top">
        <span>{labels[post.category] ?? 'Garba community'}</span>
        <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time>
      </div>
      <p>{post.content}</p>
      <div className="garba-meta">
        {date(post.eventDate) && <span>◷ {date(post.eventDate)}</span>}
        {post.location && <span>⌖ {post.location}</span>}
      </div>
      {post.instagramUrl && (
        <a className="garba-instagram" href={post.instagramUrl} target="_blank" rel="noreferrer">
          @{post.instagramHandle} ↗
        </a>
      )}
      <div className="garba-card__bottom">
        <span>♥ {post._count?.reactions ?? 0}</span>
        <span>💬 {post._count?.comments ?? 0}</span>
        <Link href={`/garba/${post.publicId}`}>Open post →</Link>
      </div>
    </article>
  );
}
function SubmitForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const formElement = e.currentTarget;
    submitting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(formElement);
    try {
      const result = await createGarbaPost(
        Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)])),
      );
      setMessage(result.message);
      formElement.reset();
      onDone();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not submit your post.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="garba-form" onSubmit={submit}>
      <p className="eyebrow">ADD TO THE CIRCLE</p>
      <h2>Share your Garba plan</h2>
      <label>
        Post type
        <select name="category" defaultValue="GENERAL" required>
          {categories.slice(1).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        What&apos;s happening?
        <textarea
          name="content"
          minLength={10}
          maxLength={2000}
          required
          placeholder="Tell the community what you're looking for…"
        />
      </label>
      <div className="garba-form-grid">
        <label>
          Event date<span>Optional</span>
          <input name="eventDate" type="date" />
        </label>
        <label>
          Location / venue<span>Optional</span>
          <input name="location" maxLength={160} placeholder="e.g. campus ground" />
        </label>
      </div>
      <label>
        Instagram handle<span>Optional · publicly visible</span>
        <input name="instagramHandle" maxLength={30} placeholder="@username" />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="garba-success" role="status">
          {message}
        </p>
      )}
      <button className="ggv-button" disabled={busy}>
        {busy ? 'Sending…' : 'Post on Garba'}
      </button>
    </form>
  );
}
export default function GarbaClient() {
  const [data, setData] = useState<GarbaFeed | null>(null);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    getGarba(category)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load Garba posts.'));
  };
  useEffect(load, [category]);
  return (
    <main className="garba-page">
      <section className="garba-hero">
        <div>
          <p className="eyebrow garba-eyebrow">GARBA COMMUNITY</p>
          <h1>
            Find Your <span>Garba Circle.</span>
          </h1>
          <p className="hero-lede">
            Meet people from your community, find a Garba partner or group, and discover who&apos;s
            heading out this Navratri.
          </p>
          <div className="button-row">
            <a className="ggv-button" href="#post">
              Post on Garba
            </a>
            <a className="ghost-button" href="#explore">
              Explore posts
            </a>
          </div>
          {data?.season?.startDate && (
            <p className="garba-season">
              {date(data.season.startDate)} — {date(data.season.endDate)} · {data.season.year}
            </p>
          )}
        </div>
        <div className="garba-orbit" aria-hidden="true">
          <span>✦</span>
          <b>
            Navratri
            <br />
            together
          </b>
        </div>
      </section>
      <section className="garba-content" id="explore">
        <div className="garba-section-heading">
          <div>
            <p className="eyebrow">THE COMMUNITY BOARD</p>
            <h2>
              Make plans. <span>Meet your people.</span>
            </h2>
          </div>
          <p>Community-first, never a dating or matching platform.</p>
        </div>
        <div className="garba-filters" role="group" aria-label="Filter Garba posts">
          {categories.map(([value, label]) => (
            <button
              key={value}
              className={category === value ? 'active' : ''}
              onClick={() => setCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? (
          <section className="state-panel">
            <h2>Couldn&apos;t load the circle.</h2>
            <p>{error}</p>
            <button className="ggv-button" onClick={load}>
              Try again
            </button>
          </section>
        ) : !data ? (
          <section className="card-grid">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </section>
        ) : data.items.length ? (
          <div className="garba-grid">
            {data.items.map((post) => (
              <PostCard key={post.publicId} post={post} />
            ))}
          </div>
        ) : (
          <section className="state-panel">
            <div className="empty-orb">✦</div>
            <h2>Nothing here yet.</h2>
            <p>Be the first to find your Garba circle.</p>
          </section>
        )}
      </section>
      <section className="garba-submit" id="post">
        <SubmitForm onDone={load} />
      </section>
    </main>
  );
}
