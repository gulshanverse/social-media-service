import type { PublicConfession } from '@ggv/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
export const PREVIEW_CACHE_CONTROL =
  'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

export function cleanPreviewText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatCategory(category: PublicConfession['category']) {
  return category ? category.replaceAll('_', ' ') : 'Community';
}

export function previewTitle(confession: PublicConfession) {
  return `${formatCategory(confession.category)} confession | College Confession`;
}

export function previewDescription(confession: PublicConfession) {
  return cleanPreviewText(confession.content, 180);
}

/**
 * The API's public detail route returns only published records. Keeping this
 * fetch pointed at that route means previews inherit the same visibility rule
 * as the public page and never need a privileged data source.
 */
export async function getPublicConfessionForPreview(publicId: string) {
  try {
    const response = await fetch(`${apiUrl}/confessions/${encodeURIComponent(publicId)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300, tags: [`confession-preview:${publicId}`] },
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicConfession;
  } catch {
    return null;
  }
}
