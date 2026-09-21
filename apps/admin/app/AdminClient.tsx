'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { appConfig } from '@ggv/config';
import { Logo } from '@ggv/ui';
import ProfilePage from './ProfilePage';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Role = 'SUPER_ADMIN' | 'MODERATOR' | 'DESIGNER';
type Admin = { id: string; email: string; name: string | null; role: Role };
type Session = { admin: Admin; accessToken: string };
type Theme = {
  id: string;
  slug: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: number;
};
type PageData<T> = { items: T[]; page: number; limit: number; total: number; hasMore: boolean };
let runtimeToken = '';

async function refresh() {
  const response = await fetch(`${API}/admin/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    runtimeToken = '';
    throw new Error('Session expired');
  }
  const result = await response.json();
  runtimeToken = result.accessToken;
  return runtimeToken;
}
export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  if (runtimeToken) headers.set('authorization', `Bearer ${runtimeToken}`);
  let response = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && runtimeToken) {
    await refresh();
    headers.set('authorization', `Bearer ${runtimeToken}`);
    response = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  }
  if (!response.ok) {
    let message = 'Request failed.';
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
function qs(values: Record<string, string | number | undefined>) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
    .join('&');
}
function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '—';
}
function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase()}`}>{value}</span>;
}
function Notice({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
    </>
  );
}
function Pager({
  data,
  onPage,
}: {
  data: PageData<unknown> | null;
  onPage: (page: number) => void;
}) {
  if (!data || data.total === 0) return null;
  return (
    <div className="pager">
      <span>
        Page {data.page} · {data.total} total
      </span>
      <div>
        <button
          className="secondary"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          Previous
        </button>
        <button
          className="secondary"
          disabled={!data.hasMore}
          onClick={() => onPage(data.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
function ThemePreview({
  theme,
  label = 'Preview confession',
}: {
  theme: Partial<Theme>;
  label?: string;
}) {
  return (
    <article
      className="theme-preview"
      style={{
        background: theme.gradient || theme.background || '#151c2b',
        color: theme.textColor || '#fff',
        borderRadius: `${theme.radius ?? 28}px`,
        fontFamily: theme.fontFamily || 'Inter',
      }}
    >
      <div className="preview-top">
        <strong>COLLEGE CONFESSION</strong>
        <span>ANONYMOUS</span>
      </div>
      <p>“{label} — a safe place for campus thoughts.”</p>
      <div className="preview-bottom" style={{ color: theme.accentColor || '#00b8ff' }}>
        <span>Campus thoughts</span>
        <span>Preview</span>
      </div>
    </article>
  );
}
export function Nav({ admin, onNavigate }: { admin: Admin; onNavigate?: () => void }) {
  const links: [string, string][] = [['/', 'Dashboard']];
  if (admin.role !== 'DESIGNER') links.push(['/confessions', 'Queue'], ['/reports', 'Reports']);
  if (admin.role === 'SUPER_ADMIN') links.push(['/audit-logs', 'Audit']);
  links.push(['/themes', 'Themes']);
  if (admin.role === 'SUPER_ADMIN' || admin.role === 'DESIGNER')
    links.push(['/profile-page', 'Profile Page']);
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map(([href, label]) => (
        <Link href={href} key={href} onClick={onNavigate}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
function Shell({
  admin,
  children,
  onLogout,
}: {
  admin: Admin;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <button
          className="admin-menu-button"
          type="button"
          aria-label={menuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          ☰
        </button>
        <Link href="/" className="brand">
          <Logo />
          <span>COLLEGE CONFESSION · MODERATION</span>
        </Link>
        <div className="admin-user">
          <a
            className="secondary visit-community"
            href="https://www.confessions.live/"
            target="_blank"
            rel="noreferrer"
          >
            Visit Community ↗
          </a>
          <span>
            {admin.name || admin.email} · {admin.role}
          </span>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      {menuOpen && (
        <button
          className="admin-nav-backdrop"
          aria-label="Close admin navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className={menuOpen ? 'admin-nav-wrap admin-nav-wrap--open' : 'admin-nav-wrap'}>
        <Nav admin={admin} onNavigate={() => setMenuOpen(false)} />
      </div>
      {children}
    </main>
  );
}
function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'Too many attempts. Try again later.'
            : 'Invalid email or password.',
        );
      const session = await response.json();
      runtimeToken = session.accessToken;
      onLogin(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="admin-shell login-shell">
      <Logo />
      <section className="login-card">
        <p className="eyebrow">INTERNAL MODERATION</p>
        <h1>Admin sign in</h1>
        <p className="muted">Review submissions and keep the public feed safe.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <Notice error={error} />
          <button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
export function Dashboard({ admin }: { admin: Admin }) {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/admin/dashboard')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);
  const cards = [
    ['Pending confessions', 'pendingConfessions', '/confessions?status=PENDING'],
    ['Published', 'publishedConfessions', '/confessions?status=PUBLISHED'],
    ['Rejected', 'rejectedConfessions', '/confessions?status=REJECTED'],
    ['Archived', 'archivedConfessions', '/confessions?status=ARCHIVED'],
    ['Open reports', 'openReports', '/reports?status=OPEN'],
    ['Resolved reports', 'resolvedReports', '/reports?status=RESOLVED'],
    ['Total confessions', 'totalConfessions', '/confessions'],
    ['Active themes', 'activeThemes', '/themes'],
  ];
  return (
    <section>
      <p className="eyebrow">OPERATIONS OVERVIEW</p>
      <h1>Good to see you, {admin.name || 'admin'}.</h1>
      <p className="muted">A focused view of the work waiting for your team.</p>
      <Notice error={error} />
      <div className="stats">
        {cards.map(([label, key, href]) => (
          <Link className="metric" href={href} key={key}>
            <span>{label}</span>
            <strong>{stats ? (stats[key] ?? 0) : '—'}</strong>
            <small>Open workspace →</small>
          </Link>
        ))}
      </div>
      <div className="quick-actions">
        <div>
          <p className="eyebrow">QUICK ACTIONS</p>
          <h2>Keep the wall moving.</h2>
        </div>
        <div className="quick-action-links">
          {admin.role !== 'DESIGNER' && (
            <Link href="/confessions?status=PENDING">Open pending queue</Link>
          )}
          {admin.role !== 'DESIGNER' && <Link href="/reports?status=OPEN">Open reports queue</Link>}
          <Link href="/confessions?status=PUBLISHED">View published</Link>
          <Link href="/confessions?status=REJECTED">View rejected</Link>
          <Link href="/themes">Manage themes</Link>
          {admin.role === 'SUPER_ADMIN' && <Link href="/audit-logs">Audit activity</Link>}
        </div>
      </div>
      {stats?.recentActivity?.length > 0 && (
        <div className="panel activity-panel">
          <div className="form-heading">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h2>What changed lately</h2>
            </div>
            <Link className="inline-link" href="/audit-logs">
              View audit
            </Link>
          </div>
          <div className="activity-list">
            {stats.recentActivity.map((activity: any) => (
              <div className="activity-row" key={activity.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{activity.action.replaceAll('_', ' ')}</strong>
                  <p>
                    {activity.actor?.email || 'System'} · {formatDate(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="workspace-links">
        {admin.role !== 'DESIGNER' && (
          <>
            <Link href="/confessions" className="panel-link">
              <strong>Open moderation queue</strong>
              <span>Review pending submissions and take action.</span>
            </Link>
            <Link href="/reports" className="panel-link">
              <strong>Review reports</strong>
              <span>Resolve or dismiss open reports.</span>
            </Link>
          </>
        )}
        <Link href="/themes" className="panel-link">
          <strong>Manage themes</strong>
          <span>Keep public confession styling consistent.</span>
        </Link>
      </div>
    </section>
  );
}
export function Confessions() {
  const [data, setData] = useState<PageData<any> | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeError, setThemeError] = useState('');
  const [status, setStatus] = useState(() =>
    typeof window === 'undefined'
      ? 'PENDING'
      : new URLSearchParams(window.location.search).get('status') ||
        localStorage.getItem('admin.queue.status') ||
        'PENDING',
  );
  const [category, setCategory] = useState(() =>
    typeof window === 'undefined' ? '' : localStorage.getItem('admin.queue.category') || '',
  );
  const [theme, setTheme] = useState(() =>
    typeof window === 'undefined' ? '' : localStorage.getItem('admin.queue.theme') || '',
  );
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState(() =>
    typeof window === 'undefined'
      ? 'newest'
      : localStorage.getItem('admin.queue.order') || 'newest',
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    setError('');
    api(`/admin/confessions?${qs({ status, category, theme, search, order, page, limit: 20 })}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    localStorage.setItem('admin.queue.status', status);
    localStorage.setItem('admin.queue.category', category);
    localStorage.setItem('admin.queue.theme', theme);
    localStorage.setItem('admin.queue.order', order);
  }, [status, category, theme, order]);
  useEffect(() => {
    const query = new URLSearchParams();
    if (status && status !== 'PENDING') query.set('status', status);
    if (category) query.set('category', category);
    if (theme) query.set('theme', theme);
    if (search) query.set('search', search);
    if (order !== 'newest') query.set('order', order);
    if (typeof window !== 'undefined')
      window.history.replaceState(null, '', `/confessions${query.toString() ? `?${query}` : ''}`);
  }, [status, category, theme, search, order]);
  useEffect(() => {
    load();
    setSelected([]);
  }, [status, category, theme, order, page]);
  useEffect(() => {
    api('/admin/themes?page=1&limit=100')
      .then((value) => setThemes(value.items ?? []))
      .catch((e) => setThemeError(e instanceof Error ? e.message : 'Themes unavailable.'));
  }, []);
  const visibleIds = data?.items.map((item) => item.id) ?? [];
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  function submit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }
  function clear() {
    setStatus('PENDING');
    setCategory('');
    setTheme('');
    setSearch('');
    setOrder('newest');
    setPage(1);
    setSelected([]);
  }
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }
  function toggleAll() {
    setSelected(allVisibleSelected ? [] : visibleIds);
  }
  async function bulk(action: 'approve' | 'reject' | 'archive') {
    if (
      !selected.length ||
      !confirm(
        `${action[0].toUpperCase()}${action.slice(1)} ${selected.length} selected confessions?`,
      )
    )
      return;
    setBulkBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api('/admin/confessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selected, action }),
      });
      setMessage(`${result.processed} processed, ${result.skipped} skipped.`);
      setSelected([]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed.');
    } finally {
      setBulkBusy(false);
    }
  }
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MODERATION</p>
          <h1>Confession queue</h1>
          <p className="muted">
            Search, triage, and safely action submissions without leaving the workspace.
          </p>
        </div>
      </div>
      <form className="filters" onSubmit={submit}>
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Content or public ID"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {['PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {[
              'CRUSH',
              'RELATIONSHIP',
              'FRIENDSHIP',
              'FUNNY',
              'COLLEGE_LIFE',
              'ADVICE',
              'APPRECIATION',
              'RANT',
              'OTHER',
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Theme
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All themes</option>
            {themes.map((value) => (
              <option value={value.id} key={value.id}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order
          <select
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        <button type="submit">Search</button>
        <button type="button" className="secondary" onClick={clear}>
          Clear
        </button>
      </form>
      <Notice error={error} message={message} />
      {themeError && (
        <div className="notice error" role="alert">
          Theme filters unavailable: {themeError}
        </div>
      )}
      {selected.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Bulk moderation actions">
          <strong>{selected.length} selected</strong>
          <button disabled={bulkBusy} onClick={() => bulk('approve')}>
            Approve selected
          </button>
          <button disabled={bulkBusy} onClick={() => bulk('reject')}>
            Reject selected
          </button>
          <button disabled={bulkBusy} className="secondary" onClick={() => bulk('archive')}>
            Archive selected
          </button>
          <button disabled={bulkBusy} className="secondary" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}
      {loading && (
        <div className="state" role="status">
          Loading queue…
        </div>
      )}
      {!loading && data?.items.length === 0 && (
        <div className="state empty">No confessions match these filters.</div>
      )}
      {data?.items.length ? (
        <label className="select-all">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /> Select all
          visible
        </label>
      ) : null}
      <div className="list">
        {data?.items.map((item) => (
          <div className="list-card" key={item.id}>
            <input
              aria-label={`Select ${item.publicId}`}
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            <Link href={`/confessions/${item.id}`}>
              <div>
                <div className="row-title">
                  <strong>{item.publicId}</strong>
                  <Status value={item.status} />
                </div>
                <span>
                  {item.category || 'Uncategorized'} · {item.theme?.name || 'No theme'} · Created{' '}
                  {formatDate(item.createdAt)}
                </span>
                <p>
                  {item.content.slice(0, 220)}
                  {item.content.length > 220 ? '…' : ''}
                </p>
              </div>
            </Link>
            <small>
              {item.reportCount} reports
              <br />
              Updated {formatDate(item.updatedAt)}
            </small>
          </div>
        ))}
      </div>
      <Pager data={data} onPage={setPage} />
    </section>
  );
}
function ConfessionDetail({ admin }: { admin: Admin }) {
  const id = usePathname().split('/').pop();
  const [item, setItem] = useState<any>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [form, setForm] = useState({ content: '', category: '', themeId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () =>
    api(`/admin/confessions/${id}`)
      .then((value) => {
        setItem(value);
        setForm({
          content: value.content,
          category: value.category || '',
          themeId: value.theme?.id || '',
        });
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api('/admin/themes?page=1&limit=100')
      .then((value) => setThemes(value.items ?? []))
      .catch(() => undefined);
  }, [id]);
  async function act(action: string) {
    if (!confirm(`Confirm ${action} for this confession?`)) return;
    setSaving(true);
    setError('');
    try {
      await api(`/admin/confessions/${id}/${action}`, { method: 'POST' });
      await load();
      const messages: Record<string, string> = {
        approve: 'Confession approved successfully.',
        reject: 'Confession rejected successfully.',
        archive: 'Confession archived successfully.',
        restore: 'Confession restored to the public feed.',
      };
      setMessage(messages[action] ?? 'Moderation action completed successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setSaving(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/admin/confessions/${id}`, { method: 'PATCH', body: JSON.stringify(form) });
      await load();
      setMessage('Confession saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }
  if (!item)
    return (
      <section>
        <Notice error={error} />
        <div className="state">{error ? 'Unable to load confession.' : 'Loading confession…'}</div>
      </section>
    );
  const editable = item.status === 'PENDING' && admin.role !== 'DESIGNER';
  const canModerate = admin.role !== 'DESIGNER';
  return (
    <section>
      <Link href="/confessions" className="back-link">
        ← Back to queue
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REVIEW WORKSPACE</p>
          <h1>{item.publicId}</h1>
          <p className="muted">
            Created {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}
          </p>
        </div>
        <Status value={item.status} />
      </div>
      <Notice error={error} message={message} />
      {item.status === 'PUBLISHED' && (
        <div className="detail-toolbar">
          <a
            className="secondary"
            href={`https://www.confessions.live/confessions/${item.publicId}`}
            target="_blank"
            rel="noreferrer"
          >
            View Public ↗
          </a>
        </div>
      )}
      <div className="detail-grid">
        <article className="panel">
          <h2>Confession content</h2>
          {editable ? (
            <form onSubmit={save}>
              <label>
                Content
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  maxLength={appConfig.maxConfessionLength}
                  required
                />
                <span className="counter">
                  {form.content.length} / {appConfig.maxConfessionLength}
                </span>
              </label>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {[
                    'CRUSH',
                    'RELATIONSHIP',
                    'FRIENDSHIP',
                    'FUNNY',
                    'COLLEGE_LIFE',
                    'ADVICE',
                    'APPRECIATION',
                    'RANT',
                    'OTHER',
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Theme
                <select
                  value={form.themeId}
                  onChange={(e) => setForm({ ...form, themeId: e.target.value })}
                >
                  <option value="">No theme</option>
                  {themes.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name} · {t.id}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </form>
          ) : (
            <div className="content-read">
              <p>{item.content}</p>
              <p className="muted">This confession is not editable in its current state.</p>
            </div>
          )}
          {item.originalContent !== item.content && (
            <>
              <h3>Original submitted content</h3>
              <p className="original">{item.originalContent}</p>
            </>
          )}
        </article>
        <aside className="panel">
          <h2>Moderation</h2>
          <dl className="facts">
            <dt>Category</dt>
            <dd>{item.category || 'Uncategorized'}</dd>
            <dt>Theme</dt>
            <dd>{item.theme?.name || 'No theme'}</dd>
            <dt>Published</dt>
            <dd>{formatDate(item.publishedAt)}</dd>
            <dt>Reports</dt>
            <dd>{item.reportCount}</dd>
            <dt>Editor</dt>
            <dd>{item.editor?.email || 'None'}</dd>
          </dl>
          {canModerate && (
            <div className="actions">
              {item.status === 'PENDING' && (
                <>
                  <button disabled={saving} onClick={() => act('approve')}>
                    Approve
                  </button>
                  <button className="danger" disabled={saving} onClick={() => act('reject')}>
                    Reject
                  </button>
                </>
              )}
              {['PUBLISHED', 'REJECTED'].includes(item.status) && (
                <button className="danger" disabled={saving} onClick={() => act('archive')}>
                  Archive
                </button>
              )}
              {item.status === 'ARCHIVED' && (
                <>
                  <button disabled={saving} onClick={() => act('restore')}>
                    {saving ? 'Restoring…' : 'Restore to published'}
                  </button>
                  {admin.role === 'SUPER_ADMIN' && (
                    <button
                      className="danger"
                      disabled={saving}
                      onClick={async () => {
                        if (
                          !confirm(
                            'Delete this archived confession permanently? This cannot be undone.',
                          )
                        )
                          return;
                        setSaving(true);
                        try {
                          await api(`/admin/confessions/${id}`, { method: 'DELETE' });
                          window.location.href = '/confessions?status=ARCHIVED';
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : 'Confession could not be deleted.',
                          );
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? 'Deleting…' : 'Delete permanently'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      {canModerate && (
        <div className="mobile-moderation-bar" aria-label="Quick moderation actions">
          {item.status === 'PENDING' && (
            <>
              <button disabled={saving} onClick={() => act('approve')}>
                Approve
              </button>
              <button className="danger" disabled={saving} onClick={() => act('reject')}>
                Reject
              </button>
            </>
          )}
          {['PUBLISHED', 'REJECTED'].includes(item.status) && (
            <button className="danger" disabled={saving} onClick={() => act('archive')}>
              Archive
            </button>
          )}
          {item.status === 'ARCHIVED' && (
            <button disabled={saving} onClick={() => act('restore')}>
              Restore
            </button>
          )}
        </div>
      )}
      {item.reports?.length > 0 && (
        <div className="panel report-context">
          <h2>Associated reports</h2>
          {item.reports.map((r: any) => (
            <div className="report-line" key={r.id}>
              <Status value={r.status} />
              <span>{r.reason}</span>
              <small>{formatDate(r.createdAt)}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export function Reports() {
  const [data, setData] = useState<PageData<any> | null>(null);
  const [status, setStatus] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const load = () => {
    setLoading(true);
    api(`/admin/reports?${qs({ status, search, order, page, limit: 20 })}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [status, order, page]);
  async function act(id: string, action: string) {
    if (!confirm(`Confirm ${action} report?`)) return;
    try {
      await api(`/admin/reports/${id}/${action}`, { method: 'POST' });
      setMessage(
        action === 'resolve' ? 'Report resolved successfully.' : 'Report dismissed successfully.',
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    }
  }
  return (
    <section>
      <p className="eyebrow">TRUST & SAFETY</p>
      <h1>Reports</h1>
      <p className="muted">Resolve reports with the related confession context in view.</p>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
      >
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reason or confession ID"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option>OPEN</option>
            <option>RESOLVED</option>
            <option>DISMISSED</option>
            <option>ARCHIVED</option>
          </select>
        </label>
        <label>
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        <button>Search</button>
      </form>
      <Notice error={error} message={message} />
      {loading && <div className="state">Loading reports…</div>}
      {!loading && data?.items.length === 0 && (
        <div className="state empty">No reports match this view.</div>
      )}
      <div className="list">
        {data?.items.map((r) => (
          <article className="list-card" key={r.id}>
            <div>
              <div className="row-title">
                <strong>{r.confession.publicId}</strong>
                <Status value={r.status} />
              </div>
              <span>
                Report {r.id} · {formatDate(r.createdAt)}
              </span>
              <p>{r.reason}</p>
              <Link href={`/confessions/${r.confession.id}`} className="inline-link">
                Open confession context →
              </Link>
            </div>
            <div className="card-actions">
              {r.reviewer && (
                <small>
                  Reviewed by {r.reviewer.email}
                  <br />
                  {formatDate(r.resolvedAt)}
                </small>
              )}
              {r.status === 'OPEN' && (
                <>
                  <button onClick={() => act(r.id, 'resolve')}>Resolve</button>
                  <button className="secondary" onClick={() => act(r.id, 'dismiss')}>
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <Pager data={data} onPage={setPage} />
    </section>
  );
}
export function AuditLogs() {
  const [data, setData] = useState<PageData<any> | null>(null);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const load = () =>
    api(`/admin/audit?${qs({ action, entity, page, limit: 30 })}`)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [page]);
  return (
    <section>
      <p className="eyebrow">ACCOUNTABILITY</p>
      <h1>Audit activity</h1>
      <p className="muted">
        Append-only operational history. Sensitive authentication material is never displayed.
      </p>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
      >
        <label>
          Action
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. EDIT"
          />
        </label>
        <label>
          Entity
          <input
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="e.g. CONFESSION"
          />
        </label>
        <button>Filter</button>
      </form>
      <Notice error={error} />
      {!data && !error && <div className="state">Loading audit activity…</div>}
      {data?.items.length === 0 && (
        <div className="state empty">No audit events match these filters.</div>
      )}
      <div className="list">
        {data?.items.map((log) => (
          <article className="list-card" key={log.id}>
            <div>
              <div className="row-title">
                <strong>{log.action}</strong>
                <span>
                  {log.entity} · {log.entityId}
                </span>
              </div>
              <p className="safe-metadata">
                {log.metadata ? JSON.stringify(log.metadata) : 'No metadata'}
              </p>
            </div>
            <small>
              {log.actor?.email || 'System'}
              <br />
              {formatDate(log.createdAt)}
            </small>
          </article>
        ))}
      </div>
      <Pager data={data} onPage={setPage} />
    </section>
  );
}
const emptyTheme = {
  slug: '',
  name: '',
  background: '#070a12',
  gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
  textColor: '#ffffff',
  accentColor: '#00b8ff',
  fontFamily: 'Inter',
  radius: 28,
};
export function Themes({ admin }: { admin: Admin }) {
  const [data, setData] = useState<PageData<Theme> | null>(null);
  const [form, setForm] = useState<any>(emptyTheme);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const canWrite = admin.role === 'SUPER_ADMIN' || admin.role === 'DESIGNER';
  const load = () => {
    setLoading(true);
    setError('');
    api(`/admin/themes?page=${page}&limit=20`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Themes could not be loaded.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [page]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api(editing ? `/admin/themes/${editing}` : '/admin/themes', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      setMessage(editing ? 'Theme updated successfully.' : 'Theme created successfully.');
      setForm(emptyTheme);
      setEditing(null);
      if (!editing) setPage(1);
      else load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Theme could not be saved.');
    }
  }
  return (
    <section>
      <p className="eyebrow">DESIGN SYSTEM</p>
      <h1>Themes</h1>
      <p className="muted">
        Create a public-card theme and preview it before saving. Slugs stay immutable after
        creation.
      </p>
      <Notice error={error} message={message} />
      {loading && <div className="state">Loading themes…</div>}
      {!loading && data?.items.length === 0 && (
        <div className="state empty">No themes exist yet.</div>
      )}
      <div className="theme-list">
        {data?.items.map((t) => (
          <article className="panel theme-card" key={t.id}>
            <ThemePreview theme={t} label={t.name} />
            <div className="theme-card-meta">
              <div>
                <h3>{t.name}</h3>
                <span className="muted">
                  {t.slug} · {t.id}
                </span>
              </div>
              {canWrite && (
                <button
                  className="secondary"
                  onClick={() => {
                    setEditing(t.id);
                    setForm({ ...t });
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <Pager data={data} onPage={setPage} />
      {canWrite && (
        <form className="panel theme-form" onSubmit={save}>
          <div className="form-heading">
            <h2>{editing ? 'Edit theme' : 'Create theme'}</h2>
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyTheme);
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <label>
            Slug
            <input
              value={form.slug}
              disabled={Boolean(editing)}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
              minLength={1}
            />
          </label>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={1}
            />
          </label>
          <div className="form-grid">
            {(['background', 'gradient', 'textColor', 'accentColor', 'fontFamily'] as const).map(
              (key) => (
                <label key={key}>
                  {key}
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                    minLength={1}
                  />
                </label>
              ),
            )}
          </div>
          <label>
            Radius
            <input
              type="number"
              min="0"
              max="100"
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })}
              required
            />
          </label>
          <ThemePreview theme={form} label={form.name || 'Live preview'} />
          <button>{editing ? 'Save theme' : 'Create theme'}</button>
        </form>
      )}
    </section>
  );
}
export default function AdminClient() {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    refresh()
      .then(() => api('/admin/auth/me'))
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setReady(true));
  }, []);
  async function logout() {
    try {
      await api('/admin/auth/logout', { method: 'POST' });
    } catch {}
    runtimeToken = '';
    setAdmin(null);
    router.push('/login');
  }
  if (!ready)
    return (
      <main className="admin-shell">
        <div className="state">Loading secure workspace…</div>
      </main>
    );
  if (!admin) return <Login onLogin={(s) => setAdmin(s.admin)} />;
  const content =
    pathname === '/confessions' ? (
      <Confessions />
    ) : pathname.startsWith('/confessions/') ? (
      <ConfessionDetail admin={admin} />
    ) : pathname === '/reports' ? (
      <Reports />
    ) : pathname === '/audit-logs' || pathname === '/audit' ? (
      <AuditLogs />
    ) : pathname === '/themes' ? (
      <Themes admin={admin} />
    ) : pathname === '/profile-page' ? (
      <ProfilePage />
    ) : (
      <Dashboard admin={admin} />
    );
  return (
    <Shell admin={admin} onLogout={logout}>
      {content}
    </Shell>
  );
}
