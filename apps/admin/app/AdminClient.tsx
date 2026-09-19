'use client';
import { FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@ggv/ui';
import { appConfig } from '@ggv/config';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Admin = {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'MODERATOR' | 'DESIGNER';
};
type Session = { admin: Admin; accessToken: string };
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
async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (runtimeToken) headers.set('authorization', `Bearer ${runtimeToken}`);
  let response = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && runtimeToken) {
    await refresh();
    headers.set('authorization', `Bearer ${runtimeToken}`);
    response = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  }
  if (!response.ok) throw new Error((await response.text()) || 'Request failed');
  return response.json();
}
function Nav({ admin }: { admin: Admin }) {
  const links: string[][] = [
    ['/', 'Dashboard'],
    ...(admin.role !== 'DESIGNER'
      ? [
          ['/confessions', 'Confessions'],
          ['/reports', 'Reports'],
        ]
      : []),
    ...(admin.role === 'SUPER_ADMIN' ? [['/audit-logs', 'Audit Logs']] : []),
    ['/themes', 'Themes'],
  ];
  return (
    <nav className="admin-nav">
      {links.map(([href, label]) => (
        <a key={href} href={href}>
          {label}
        </a>
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
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Logo />
        <div className="admin-user">
          <span>
            {admin.email} · {admin.role}
          </span>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <Nav admin={admin} />
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="admin-shell">
      <Logo />
      <section className="login-card">
        <p className="eyebrow">INTERNAL MODERATION</p>
        <h1>Admin sign in</h1>
        <p className="muted">Use your approved administrator credentials.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
function Dashboard({ admin }: { admin: Admin }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    api('/admin/dashboard')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);
  return (
    <section>
      <p className="eyebrow">MODERATION WORKSPACE</p>
      <h1>Good to see you, {admin.name ?? 'admin'}.</h1>
      <p className="muted">
        Review submissions, keep the public feed safe, and track moderation activity.
      </p>
      <div className="stats">
        {[
          ['Pending', 'pending'],
          ['Published', 'published'],
          ['Rejected', 'rejected'],
          ['Open reports', 'openReports'],
        ].map(([label, key]) => (
          <article key={key}>
            <span>{label}</span>
            <strong>{stats?.[key] ?? '—'}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
function Confessions() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    api(`/admin/confessions?status=${status}&page=1&limit=20`)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    void load();
  }, [status]);
  return (
    <section>
      <h1>Confessions</h1>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>PENDING</option>
          <option>PUBLISHED</option>
          <option>REJECTED</option>
          <option>ARCHIVED</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading queue…</p>}
      {data?.items?.length === 0 && <p className="muted">No confessions in this queue.</p>}
      <div className="list">
        {data?.items?.map((item: any) => (
          <Link className="list-card" href={`/confessions/${item.id}`} key={item.id}>
            <div>
              <strong>{item.publicId}</strong>
              <span>
                {item.category ?? 'Uncategorized'} · {item.status} ·{' '}
                {item.theme?.name ?? 'No theme'}
              </span>
              <p>
                {item.content.slice(0, 180)}
                {item.content.length > 180 ? '…' : ''}
              </p>
            </div>
            <small>
              {item.reportCount} reports
              <br />
              {new Date(item.createdAt).toLocaleString()}
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}
function ConfessionDetail({ admin }: { admin: Admin }) {
  const id = usePathname().split('/').pop();
  const [item, setItem] = useState<any>(null);
  const [form, setForm] = useState({ content: '', category: '', themeId: '' });
  const [message, setMessage] = useState('');
  const load = () =>
    api(`/admin/confessions/${id}`)
      .then((value) => {
        setItem(value);
        setForm({
          content: value.content,
          category: value.category ?? '',
          themeId: value.theme?.id ?? '',
        });
      })
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    void load();
  }, [id]);
  async function act(action: string) {
    if ((action === 'reject' || action === 'archive') && !confirm(`Confirm ${action}?`)) return;
    setMessage('');
    try {
      await api(`/admin/confessions/${id}/${action}`, { method: 'POST' });
      await load();
      setMessage(`Confession ${action}d.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed.');
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/admin/confessions/${id}`, { method: 'PATCH', body: JSON.stringify(form) });
      await load();
      setMessage('Saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed.');
    }
  }
  if (!item)
    return (
      <section>
        <p className="muted">{message || 'Loading confession…'}</p>
      </section>
    );
  const canModerate = admin.role !== 'DESIGNER';
  return (
    <section>
      <Link href="/confessions">← Back to queue</Link>
      <h1>{item.publicId}</h1>
      <div className="detail-grid">
        <article className="panel">
          <span className="status">{item.status}</span>
          <p className="muted">
            Submitted {new Date(item.createdAt).toLocaleString()} · Updated{' '}
            {new Date(item.updatedAt).toLocaleString()}
          </p>
          <form onSubmit={save}>
            <label>
              Current content
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                maxLength={appConfig.maxConfessionLength}
              />
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label>
              Theme ID
              <input
                value={form.themeId}
                onChange={(e) => setForm({ ...form, themeId: e.target.value })}
              />
            </label>
            {canModerate && <button>Save edit</button>}
          </form>
          {item.originalContent !== item.content && (
            <>
              <h3>Original submitted content</h3>
              <p className="original">{item.originalContent}</p>
            </>
          )}
        </article>
        <aside className="panel">
          <p>Reports: {item.reportCount}</p>
          <p>
            Published:{' '}
            {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Not published'}
          </p>
          <p>Editor: {item.editor?.email ?? 'None'}</p>
          {canModerate && (
            <div className="actions">
              <button onClick={() => act('approve')}>Approve</button>
              <button onClick={() => act('reject')}>Reject</button>
              <button onClick={() => act('archive')}>Archive</button>
            </div>
          )}
          {message && <p className="muted">{message}</p>}
        </aside>
      </div>
    </section>
  );
}
function Reports() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('OPEN');
  const [message, setMessage] = useState('');
  const load = () =>
    api(`/admin/reports?status=${status}`)
      .then((v) => setItems(v.items))
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    void load();
  }, [status]);
  async function act(id: string, action: string) {
    try {
      await api(`/admin/reports/${id}/${action}`, { method: 'POST' });
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed.');
    }
  }
  return (
    <section>
      <h1>Reports</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option>OPEN</option>
        <option>RESOLVED</option>
        <option>DISMISSED</option>
        <option>ARCHIVED</option>
      </select>
      {message && <p className="error">{message}</p>}
      <div className="list">
        {items.length === 0 ? (
          <p className="muted">No reports in this view.</p>
        ) : (
          items.map((r: any) => (
            <article className="list-card" key={r.id}>
              <div>
                <strong>{r.id}</strong>
                <span>
                  {r.confession.publicId} · {r.status}
                </span>
                <p>{r.reason}</p>
              </div>
              <div>
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
          ))
        )}
      </div>
    </section>
  );
}
function AuditLogs() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    api('/admin/audit-logs')
      .then(setData)
      .catch(() => setData({ items: [] }));
  }, []);
  return (
    <section>
      <h1>Audit logs</h1>
      <div className="list">
        {data?.items?.map((log: any) => (
          <article className="list-card" key={log.id}>
            <div>
              <strong>{log.action}</strong>
              <span>
                {log.entity} · {log.entityId}
              </span>
            </div>
            <small>
              {log.actor?.email ?? 'System'}
              <br />
              {new Date(log.createdAt).toLocaleString()}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
function Themes({ admin }: { admin: Admin }) {
  const [themes, setThemes] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    slug: '',
    name: '',
    background: '#070a12',
    gradient: '',
    textColor: '#ffffff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: 28,
  });
  const load = () =>
    api('/admin/themes')
      .then(setThemes)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/themes', { method: 'POST', body: JSON.stringify(form) });
      setMessage('Theme created.');
      setForm({ ...form, slug: '', name: '' });
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Theme could not be saved.');
    }
  }
  return (
    <section>
      <h1>Themes</h1>
      {message && <p className="muted">{message}</p>}
      <div className="theme-list">
        {themes.map((t) => (
          <article className="panel" key={t.id}>
            <h3>{t.name}</h3>
            <p>{t.slug}</p>
            <div
              style={{
                background: t.background,
                color: t.textColor,
                borderRadius: t.radius,
                padding: '1rem',
              }}
            >
              Theme preview
            </div>
          </article>
        ))}
      </div>
      {admin.role !== 'MODERATOR' && (
        <form className="panel theme-form" onSubmit={save}>
          <h2>Create theme</h2>
          {(
            [
              'slug',
              'name',
              'background',
              'gradient',
              'textColor',
              'accentColor',
              'fontFamily',
            ] as const
          ).map((key) => (
            <label key={key}>
              {key}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
              />
            </label>
          ))}
          <label>
            radius
            <input
              type="number"
              min="0"
              max="100"
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })}
            />
          </label>
          <button>Create theme</button>
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
        <p className="muted">Loading session…</p>
      </main>
    );
  if (!admin) return <Login onLogin={(s) => setAdmin(s.admin)} />;
  let content =
    pathname === '/confessions' ? (
      <Confessions />
    ) : pathname.startsWith('/confessions/') ? (
      <ConfessionDetail admin={admin} />
    ) : pathname === '/reports' ? (
      <Reports />
    ) : pathname === '/audit-logs' ? (
      <AuditLogs />
    ) : pathname === '/themes' ? (
      <Themes admin={admin} />
    ) : (
      <Dashboard admin={admin} />
    );
  return (
    <Shell admin={admin} onLogout={logout}>
      {content}
    </Shell>
  );
}
