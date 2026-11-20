import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanPreviewText,
  formatCategory,
  getPublicConfessionForPreview,
  previewDescription,
  previewTitle,
} from '../lib/social-preview';

const confession = {
  publicId: 'abc123',
  content: 'A short confession from campus.',
  category: 'ADVICE' as const,
  customCategory: null,
  theme: null,
  publishedAt: '2026-11-20T00:00:00.000Z',
  viewCount: 4,
};

describe('social preview helpers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normalizes whitespace and truncates long confession text safely', () => {
    expect(cleanPreviewText('  one\n\n two   three  ', 30)).toBe('one two three');
    expect(cleanPreviewText('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghi…');
  });

  it('formats category-specific title and description from the public confession', () => {
    expect(formatCategory(confession.category)).toBe('ADVICE');
    expect(previewTitle(confession)).toBe('ADVICE confession | College Confession');
    expect(previewDescription(confession)).toBe(confession.content);
  });

  it('fetches the public detail endpoint using the exact confession ID', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(confession), { status: 200 }),
    );
    await expect(getPublicConfessionForPreview('abc123')).resolves.toEqual(confession);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/confessions/abc123'),
      expect.objectContaining({ next: expect.objectContaining({ revalidate: 300 }) }),
    );
  });

  it('returns no preview data for unavailable or non-public responses', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(getPublicConfessionForPreview('pending-or-deleted')).resolves.toBeNull();
  });
});
