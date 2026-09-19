'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Logo } from '@ggv/ui';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
type Admin = { email: string; name: string | null; role: string };
type Dashboard = { pending: number; published: number; rejected: number; openReports: number };
export default function AdminHome() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${API}/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    if (!response.ok) {
      setError(
        response.status === 429
          ? 'Too many attempts. Try again later.'
          : 'Invalid email or password.',
      );
      setLoading(false);
      return;
    }
    const result = await response.json();
    localStorage.setItem('adminAccessToken', result.accessToken);
    setAdmin(result.admin);
    setLoading(false);
  }
  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) return;
    fetch(`${API}/admin/auth/me`, { headers: { authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (value) setAdmin(value);
      });
  }, []);
  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) return;
    fetch(`${API}/admin/dashboard`, { headers: { authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then(setStats);
  }, [admin]);
  if (!admin)
    return (
      <main className="admin-shell">
        <Logo />
        <section className="login-card">
          <p className="eyebrow">INTERNAL MODERATION</p>
          <h1>Admin sign in</h1>
          <p className="muted">Use your approved administrator credentials.</p>
          <form onSubmit={login}>
            <label>
              Email
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error && <p className="error">{error}</p>}
            <button disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </section>
      </main>
    );
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Logo />
        <div>
          <span>{admin.email}</span>
          <button
            className="secondary"
            onClick={() => {
              localStorage.removeItem('adminAccessToken');
              setAdmin(null);
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <section>
        <p className="eyebrow">MODERATION WORKSPACE</p>
        <h1>Good to see you, {admin.name ?? 'admin'}.</h1>
        <p className="muted">
          Review submissions, keep the public feed safe, and track moderation activity.
        </p>
        <div className="stats">
          {[
            ['Pending', stats?.pending],
            ['Published', stats?.published],
            ['Rejected', stats?.rejected],
            ['Open reports', stats?.openReports],
          ].map(([label, value]) => (
            <article key={String(label)}>
              <span>{label}</span>
              <strong>{value ?? '—'}</strong>
            </article>
          ))}
        </div>
        <nav className="nav-grid">
          <a href="/confessions">Review confessions →</a>
          <a href="/reports">Manage reports →</a>
          <a href="/audit-logs">View audit logs →</a>
          <a href="/themes">Manage themes →</a>
        </nav>
      </section>
    </main>
  );
}
