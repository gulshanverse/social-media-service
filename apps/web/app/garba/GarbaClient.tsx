'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { garbaThemes } from '@ggv/themes';
import { GarbaCard } from '@ggv/ui';
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
    <GarbaCard
      post={post}
      footer={
        <div className="garba-card__bottom">
          <span>♥ {post._count?.reactions ?? 0}</span>
          <span>💬 {post._count?.comments ?? 0}</span>
          <Link href={`/garba/${post.publicId}`}>Open post →</Link>
        </div>
      }
    />
  );
}
function SubmitForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [themeId, setThemeId] = useState(garbaThemes[0].id);
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
      const payload = Object.fromEntries(
        [...form.entries()]
          .map(([key, value]) => [key, String(value)] as const)
          .filter(([key, value]) => key === 'category' || key === 'content' || value.trim() !== ''),
      );
      const result = await createGarbaPost(payload);
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
      <label>
        Card theme
        <span>Choose how your published card will look.</span>
        <select name="themeId" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
          {garbaThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
      <GarbaCard
        post={{
          category: 'GENERAL',
          content: 'Your Garba card preview will appear here.',
          theme: garbaThemes.find((theme) => theme.id === themeId),
        }}
      />
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
          <p className="eyebrow garba-eyebrow">
            <span aria-hidden="true">✦</span> GARBA SEASON
          </p>
          <h1>
            Find Your <span>Garba Circle</span>
          </h1>
          <p className="hero-lede">
            Meet people from your campus, find a Garba partner or group, and make your festive
            season memorable.
          </p>
          <div className="button-row">
            <a className="ggv-button" href="#post">
              Create a Garba post <span aria-hidden="true">↗</span>
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
              aria-pressed={category === value}
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
