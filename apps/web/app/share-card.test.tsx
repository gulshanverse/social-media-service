import { describe, expect, it } from 'vitest';
import {
  SHARE_CARD_MAX_LINES,
  shareCardCategory,
  shareCardDate,
  truncateShareCardText,
  wrapShareCardText,
} from '../lib/share-card';

describe('share card renderer helpers', () => {
  it('keeps short content complete and wraps Unicode text into readable lines', () => {
    const content = 'A short Hinglish confession — campus life is better with friends.';
    const result = truncateShareCardText(content);
    expect(result.truncated).toBe(false);
    expect(result.lines.join(' ')).toBe(content);
    expect(wrapShareCardText('यह एक हिंदी confession है।').length).toBeGreaterThan(0);
  });

  it('limits long content to exactly 11 visible lines with an ellipsis', () => {
    const content = Array.from(
      { length: 30 },
      (_, index) => `This is line ${index + 1} with campus thoughts.`,
    ).join(' ');
    const result = truncateShareCardText(content);
    expect(result.truncated).toBe(true);
    expect(result.lines).toHaveLength(SHARE_CARD_MAX_LINES);
    expect(result.lines.at(-1)).toMatch(/\.\.\.$/u);
  });

  it('keeps category and UTC date aligned with the public confession data', () => {
    const confession = {
      publicId: 'abc',
      content: 'hello',
      category: 'COLLEGE_LIFE' as const,
      customCategory: null,
      theme: null,
      publishedAt: '2026-11-20T00:00:00.000Z',
      viewCount: 0,
    };
    expect(shareCardCategory(confession)).toBe('College Life');
    expect(shareCardDate(confession.publishedAt)).toBe('20 Nov 2026');
  });
});
