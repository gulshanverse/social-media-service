import { describe, expect, it } from 'vitest';
import {
  SHARE_CARD_MAX_LINES,
  SHARE_CARD_TEXT_WIDTH,
  measureShareCardText,
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

  it('keeps English, Hinglish, Hindi, mixed Unicode, and long-word lines within the font width', () => {
    const samples = [
      'A short English confession with ordinary campus words.',
      'Waise sach kaha tha tumne ki sbke naye dost bn jaate hai.',
      'यह एक हिंदी confession है और कॉलेज जीवन दोस्तों के साथ बेहतर है।',
      'Mixed Unicode café — दोस्त 🫶 campus जीवन.',
      'supercalifragilisticexpialidocious'.repeat(4),
    ];
    for (const sample of samples) {
      expect(
        wrapShareCardText(sample).every(
          (line) => measureShareCardText(line) <= SHARE_CARD_TEXT_WIDTH,
        ),
      ).toBe(true);
    }
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
    expect(result.lines.every((line) => measureShareCardText(line) <= SHARE_CARD_TEXT_WIDTH)).toBe(
      true,
    );
  });

  it('keeps content that wraps to exactly 11 lines complete', () => {
    const content = Array.from({ length: 11 }, (_, index) => `Line ${index + 1}`).join('\n');
    const result = truncateShareCardText(content);
    expect(result.truncated).toBe(false);
    expect(result.lines).toHaveLength(11);
    expect(result.lines.at(-1)).not.toMatch(/\.\.\.$/u);
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
