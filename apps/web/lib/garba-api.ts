export type GarbaPost = {
  publicId: string; category: string; content: string; eventDate: string | null; location: string | null;
  instagramHandle: string | null; instagramUrl: string | null; createdAt: string; _count?: { comments: number; reactions: number };
};
export type GarbaFeed = { items: GarbaPost[]; season: { name: string; year: number; startDate: string | null; endDate: string | null }; page: number; total: number; hasMore: boolean };
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
async function request<T>(path: string, init?: RequestInit) { const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } }); const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.message ?? 'Something went wrong.'); return body as T; }
export const getGarba = (category = '', page = 1) => request<GarbaFeed>(`/garba?page=${page}${category ? `&category=${encodeURIComponent(category)}` : ''}`, { cache: 'no-store' });
export const createGarbaPost = (payload: Record<string, string>) => request<{ message: string }>('/garba', { method: 'POST', body: JSON.stringify(payload) });
export const reportGarba = (id: string, reason: string) => request<{ message: string }>(`/garba/${encodeURIComponent(id)}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
export const commentGarba = (id: string, content: string, parentId?: string) => request<{ message: string }>(`/garba/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }) });
export const reportGarbaComment = (id: string, commentId: string, reason: string) => request<{ message: string }>(`/garba/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/report`, { method: 'POST', body: JSON.stringify({ reason }) });

export const reactGarba = (id: string) => request<{ reacted: boolean; count: number }>(`/garba/${encodeURIComponent(id)}/react`, { method: 'POST' });
