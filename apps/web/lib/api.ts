import type {
  PublicConfession,
  PublicConfessionPage,
  ReadLiveConfessionButtonConfig,
  SubmissionResult,
  PublicHomepagePromotion,
} from '@ggv/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const CONFESSIONS_CACHE_TTL_MS = 20_000;
const CONFESSIONS_CACHE_MAX_ENTRIES = 24;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type { PublicHomepagePromotion } from '@ggv/types';

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

export const getHomepagePromotions = () =>
  request<PublicHomepagePromotion[]>('/homepage-promotions', { cache: 'no-store' });

export const createConfession = (payload: {
  content: string;
  category?: string;
  customCategory?: string;
  themeId: string;
}) => request<SubmissionResult>('/confessions', { method: 'POST', body: JSON.stringify(payload) });
export type ConfessionFeedQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  customCategory?: string;
  dateRange?: 'all' | 'today' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
  sort?: 'newest' | 'oldest' | 'relevance';
};

type ConfessionCacheEntry = {
  data: PublicConfessionPage;
  expiresAt: number;
  accessOrder: number;
};

const confessionCache = new Map<string, ConfessionCacheEntry>();
const confessionRequests = new Map<string, Promise<PublicConfessionPage>>();
let confessionCacheAccessOrder = 0;

function confessionRequestDetails(input: ConfessionFeedQuery | number = {}) {
  const query = typeof input === 'number' ? { page: input } : input;
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: String(query.limit ?? 12),
  });

  for (const [key, value] of Object.entries(query)) {
    if (key !== 'page' && value) params.set(key, String(value));
  }

  const normalizedParams = new URLSearchParams(params);
  normalizedParams.sort();

  return {
    path: `/confessions?${params.toString()}`,
    key: normalizedParams.toString(),
  };
}

function readCachedConfessions(key: string) {
  const cached = confessionCache.get(key);
  if (!cached) return undefined;

  const now = Date.now();
  if (cached.expiresAt <= now) {
    confessionCache.delete(key);
    return undefined;
  }

  cached.accessOrder = ++confessionCacheAccessOrder;
  return cached.data;
}

function writeCachedConfessions(key: string, data: PublicConfessionPage) {
  const now = Date.now();
  confessionCache.delete(key);
  confessionCache.set(key, {
    data,
    expiresAt: now + CONFESSIONS_CACHE_TTL_MS,
    accessOrder: ++confessionCacheAccessOrder,
  });

  while (confessionCache.size > CONFESSIONS_CACHE_MAX_ENTRIES) {
    let leastRecentlyUsedKey: string | undefined;
    let leastRecentlyUsedOrder = Number.POSITIVE_INFINITY;
    for (const [entryKey, entry] of confessionCache) {
      if (entry.accessOrder < leastRecentlyUsedOrder) {
        leastRecentlyUsedKey = entryKey;
        leastRecentlyUsedOrder = entry.accessOrder;
      }
    }
    if (!leastRecentlyUsedKey) break;
    confessionCache.delete(leastRecentlyUsedKey);
  }
}

export const clearConfessionsCache = () => {
  confessionCache.clear();
  confessionRequests.clear();
  confessionCacheAccessOrder = 0;
};

export const getConfessions = (input: ConfessionFeedQuery | number = {}) => {
  const { path, key } = confessionRequestDetails(input);
  const cached = readCachedConfessions(key);
  if (cached) return Promise.resolve(cached);

  const existingRequest = confessionRequests.get(key);
  if (existingRequest) return existingRequest;

  const requestPromise = request<PublicConfessionPage>(path, { cache: 'no-store' }).then(
    (result) => {
      writeCachedConfessions(key, result);
      confessionRequests.delete(key);
      return result;
    },
    (error) => {
      // Failed responses stay out of the cache and can be retried normally.
      confessionRequests.delete(key);
      throw error;
    },
  );
  confessionRequests.set(key, requestPromise);
  return requestPromise;
};
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
  instagramUsername: string | null;
  instagramUrl: string | null;
};
export type DiscussionComment = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  profile: CommenterProfile;
  replyCount: number;
  replies: DiscussionComment[];
  reactionCounts: Record<string, number>;
  selectedReactions: string[];
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

function normalizeDiscussionComment(comment: Partial<DiscussionComment>): DiscussionComment {
  return {
    ...(comment as DiscussionComment),
    parentId: comment.parentId ?? null,
    profile: {
      id: comment.profile?.id ?? 'unknown-profile',
      displayName: comment.profile?.displayName ?? 'Anonymous',
      instagramUsername: comment.profile?.instagramUsername ?? null,
      instagramUrl: comment.profile?.instagramUrl ?? null,
    },
    replyCount: comment.replyCount ?? comment.replies?.length ?? 0,
    replies: (comment.replies ?? []).map(normalizeDiscussionComment),
    reactionCounts: comment.reactionCounts ?? {},
    selectedReactions: comment.selectedReactions ?? [],
  };
}

export const getConfessionReactions = (publicId: string) =>
  request<Partial<ReactionState>>(`/confessions/${encodeURIComponent(publicId)}/reactions`, {
    cache: 'no-store',
  }).then((state) => ({
    options: state.options ?? [],
    counts: state.counts ?? {},
    customReactions: state.customReactions ?? [],
    selected: state.selected ?? [],
  }));
export const reactToConfession = (publicId: string, emoji: string) =>
  request<ReactionState>(`/confessions/${encodeURIComponent(publicId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
export const getDiscussion = (publicId: string, page = 1) =>
  request<Partial<DiscussionPage>>(
    `/confessions/${encodeURIComponent(publicId)}/comments?page=${page}`,
    {
      cache: 'no-store',
    },
  ).then((discussion) => ({
    items: (discussion.items ?? []).map(normalizeDiscussionComment),
    page: discussion.page ?? page,
    limit: discussion.limit ?? 20,
    total: discussion.total ?? 0,
    hasMore: discussion.hasMore ?? false,
  }));
export const reactToComment = (publicId: string, commentId: string, emoji: string) =>
  request<{ counts: Record<string, number>; selected: string[] }>(
    `/confessions/${encodeURIComponent(publicId)}/comments/${encodeURIComponent(commentId)}/reactions`,
    { method: 'POST', body: JSON.stringify({ emoji }) },
  );
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
