import type { VibeQuestion, VibeProfile, VibeSession } from '@ggv/types';
import { ApiRequestError } from '../api';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok)
    throw new ApiRequestError(
      body?.message ?? 'Something went wrong. Please try again.',
      response.status,
    );
  return body as T;
}
export type ServerProfile = Omit<VibeProfile, 'id' | 'name' | 'college'> & {
  id: string;
  displayName: string;
  college: { id: string; slug: string; name: string };
};
export type ServerSession = {
  id: string;
  status: 'PLAYING' | 'COMPLETED' | 'ABANDONED';
  totalRounds: number;
  currentRound: number;
  answers: Array<{ round: number; questionId: string; optionId: string }>;
  scoringVersion: string;
};
export const requestMagicLink = (email: string) =>
  request<{ message: string; developmentToken?: string }>('/vibematch/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
export const verifyMagicLink = (token: string) =>
  request<{ authenticated: boolean; hasProfile: boolean }>('/vibematch/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
export const getProfile = () =>
  request<ServerProfile | null>('/vibematch/profile', { cache: 'no-store' });
export const saveProfile = (
  payload: {
    displayName: string;
    instagramUsername?: string;
    collegeId: string;
    primaryIntent: string;
    secondaryIntent?: string;
    interests?: string[];
    ageConfirmed: boolean;
  },
  existing: boolean,
) =>
  request<ServerProfile>('/vibematch/profile', {
    method: existing ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  });
export const createServerSession = () =>
  request<{ session: ServerSession; question?: VibeQuestion }>('/vibematch/sessions', {
    method: 'POST',
  });
export const getCurrentRound = (id: string) =>
  request<{ session: ServerSession; question: VibeQuestion }>(
    `/vibematch/sessions/${encodeURIComponent(id)}/current-round`,
    { cache: 'no-store' },
  );
export const answerServerSession = (id: string, optionId: string, idempotencyKey: string) =>
  request<{ session: ServerSession; duplicate: boolean }>(
    `/vibematch/sessions/${encodeURIComponent(id)}/answers`,
    { method: 'POST', body: JSON.stringify({ optionId, idempotencyKey }) },
  );
export const getServerResult = (id: string) =>
  request<{
    sessionId: string;
    result: {
      socialEnergy: number;
      adventure: number;
      spontaneity: number;
      humor: number;
      communication: number;
      intent: number;
      coverage: number;
      answerCount: number;
      scoringVersion: string;
    };
  }>(`/vibematch/sessions/${encodeURIComponent(id)}/result`, { cache: 'no-store' });

export type DiscoveryMatch = {
  blockToken: string;
  nickname: string;
  college: string;
  score: number;
  title: string;
  tagline: string;
  whyYouMatch: string[];
  sharedInterests: string[];
};

export type ServerDiscovery = {
  algorithmVersion: string;
  campus: string;
  matches: DiscoveryMatch[];
};

export const getDiscovery = () =>
  request<ServerDiscovery>('/vibematch/discovery', { cache: 'no-store' });

export const blockMatch = (matchKey: string) =>
  request<{ blocked: boolean }>('/vibematch/blocks', {
    method: 'POST',
    body: JSON.stringify({ matchKey }),
  });

export const unblockMatch = (matchKey: string) =>
  request<{ blocked: boolean }>(`/vibematch/blocks/${encodeURIComponent(matchKey)}`, {
    method: 'DELETE',
  });
