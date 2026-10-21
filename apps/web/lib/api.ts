import type {
  PublicConfession,
  PublicConfessionPage,
  ReadLiveConfessionButtonConfig,
  SubmissionResult,
} from '@ggv/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

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

export const createConfession = (payload: {
  content: string;
  category?: string;
  customCategory?: string;
  themeId: string;
}) => request<SubmissionResult>('/confessions', { method: 'POST', body: JSON.stringify(payload) });
export const getConfessions = (page = 1) =>
  request<PublicConfessionPage>(`/confessions?page=${page}&limit=12`, { cache: 'no-store' });
export const getConfession = (publicId: string) =>
  request<PublicConfession>(`/confessions/${encodeURIComponent(publicId)}`, { cache: 'no-store' });
export type PublicProfileSettings = {
  handle: string;
  headerMessage: string;
  defaultPrompt: string;
  communityButtonText: string;
  communityPath: '/confessions';
  bottomButtonText: string;
  profileImageUrl: string | null;
  themePreset: string;
  maxCharacters: number;
  cardTextSize: number;
  previewLines: number;
  prompts: string[];
  readLiveConfessionButton: ReadLiveConfessionButtonConfig;
};
export const getProfileSettings = () =>
  request<PublicProfileSettings>('/confessions/profile-settings', { cache: 'no-store' });
export const reportConfession = (publicId: string, reason: string, details?: string) =>
  request<{ status: string; message: string }>(
    `/confessions/${encodeURIComponent(publicId)}/report`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, ...(details === undefined ? {} : { details }) }),
    },
  );

export type CommenterProfile = {
  id: string;
  displayName: string;
  instagramUsername: string;
  instagramUrl: string;
};
export type DiscussionComment = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  profile: CommenterProfile;
  replyCount: number;
  replies: DiscussionComment[];
};
export type DiscussionPage = {
  items: DiscussionComment[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
export type ReactionState = {
  options: string[];
  counts: Record<string, number>;
  customReactions: { emoji: string; count: number }[];
  selected: string[];
};
export const getCommenterIdentity = () =>
  request<CommenterProfile | null>('/confessions/identity', { cache: 'no-store' });
export const registerCommenter = (payload: { displayName: string; instagramUsername: string }) =>
  request<{ profile: CommenterProfile }>('/confessions/identity', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const getConfessionReactions = (publicId: string) =>
  request<ReactionState>(`/confessions/${encodeURIComponent(publicId)}/reactions`, {
    cache: 'no-store',
  });
export const reactToConfession = (publicId: string, emoji: string) =>
  request<ReactionState>(`/confessions/${encodeURIComponent(publicId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
export const getDiscussion = (publicId: string, page = 1) =>
  request<DiscussionPage>(`/confessions/${encodeURIComponent(publicId)}/comments?page=${page}`, {
    cache: 'no-store',
  });
export const postDiscussionComment = (publicId: string, content: string, parentId?: string) =>
  request<{ status: string; message: string; comment: DiscussionComment }>(
    `/confessions/${encodeURIComponent(publicId)}/comments`,
    { method: 'POST', body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }) },
  );
export const reportDiscussionComment = (publicId: string, commentId: string, reason = 'OTHER') =>
  request<{ status: string; message: string }>(
    `/confessions/${encodeURIComponent(publicId)}/comments/${encodeURIComponent(commentId)}/report`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
