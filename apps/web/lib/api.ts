import type { PublicConfession, PublicConfessionPage, SubmissionResult } from '@ggv/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'Something went wrong. Please try again.');
  return body as T;
}

export const createConfession = (payload: {
  content: string;
  category?: string;
  themeId: string;
}) => request<SubmissionResult>('/confessions', { method: 'POST', body: JSON.stringify(payload) });
export const getConfessions = (page = 1) =>
  request<PublicConfessionPage>(`/confessions?page=${page}&limit=12`, { cache: 'no-store' });
export const getConfession = (publicId: string) =>
  request<PublicConfession>(`/confessions/${encodeURIComponent(publicId)}`, { cache: 'no-store' });
