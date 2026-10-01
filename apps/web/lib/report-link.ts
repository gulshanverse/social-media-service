const publicIdPattern = /^[a-zA-Z0-9_-]{1,120}$/;
const allowedHosts = new Set(['www.confessions.live', 'confessions.live']);

export function parsePublicConfessionId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (!value.includes('/')) return publicIdPattern.test(value) ? value : null;

  try {
    const url = new URL(value, 'https://www.confessions.live');
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || segments[0] !== 'confessions') return null;
    const publicId = decodeURIComponent(segments[1]);
    return publicIdPattern.test(publicId) ? publicId : null;
  } catch {
    return null;
  }
}
