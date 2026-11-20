import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PublicConfession } from '@ggv/types';

export const SHARE_CARD_WIDTH = 720;
export const SHARE_CARD_HEIGHT = 900;
export const SHARE_CARD_MAX_LINES = 11;
export const SHARE_CARD_TEXT_WIDTH = 580;
export const SHARE_CARD_FONT_SIZE = 32;
export const SHARE_CARD_LINE_HEIGHT = 1.42;

const categoryNames: Record<string, string> = {
  ADMIRATION: 'Admiration',
  COLLEGE_LIFE: 'College Life',
  CRUSH: 'Crush',
  RELATIONSHIP: 'Relationship',
  FRIENDSHIP: 'Friendship',
  FUNNY: 'Funny',
  ADVICE: 'Advice',
  APPRECIATION: 'Appreciation',
  RANT: 'Rant',
  CUSTOM: 'Custom',
};

export function shareCardCategory(confession: PublicConfession) {
  return confession.category === 'CUSTOM'
    ? confession.customCategory || 'Custom'
    : confession.category
      ? categoryNames[confession.category] || confession.category
      : 'Campus thoughts';
}

export function shareCardDate(publishedAt: string) {
  return new Date(publishedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type FontMetrics = {
  unitsPerEm: number;
  advances: Uint16Array;
  cmap: (codePoint: number) => number;
};

function uint16(data: Uint8Array, offset: number) {
  return (data[offset] << 8) | data[offset + 1];
}

function int16(data: Uint8Array, offset: number) {
  const value = uint16(data, offset);
  return value & 0x8000 ? value - 0x10000 : value;
}

function uint32(data: Uint8Array, offset: number) {
  return (
    data[offset] * 0x1000000 +
    data[offset + 1] * 0x10000 +
    data[offset + 2] * 0x100 +
    data[offset + 3]
  );
}

function tableDirectory(data: Uint8Array) {
  const tables = new Map<string, number>();
  const count = uint16(data, 4);
  for (let index = 0; index < count; index += 1) {
    const offset = 12 + index * 16;
    const tag = String.fromCharCode(...data.slice(offset, offset + 4));
    tables.set(tag, uint32(data, offset + 8));
  }
  return tables;
}

function parseCmap(data: Uint8Array, offset: number, numGlyphs: number) {
  const records = uint16(data, offset + 2);
  let format12Offset = 0;
  let format4Offset = 0;
  for (let index = 0; index < records; index += 1) {
    const record = offset + 4 + index * 8;
    const subtableOffset = offset + uint32(data, record + 4);
    const format = uint16(data, subtableOffset);
    if (format === 12) format12Offset ||= subtableOffset;
    if (format === 4) format4Offset ||= subtableOffset;
  }

  const format12 = (codePoint: number) => {
    if (!format12Offset) return 0;
    const groups = uint32(data, format12Offset + 12);
    let low = 0;
    let high = groups - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const group = format12Offset + 16 + middle * 12;
      const start = uint32(data, group);
      const end = uint32(data, group + 4);
      if (codePoint < start) high = middle - 1;
      else if (codePoint > end) low = middle + 1;
      else return (uint32(data, group + 8) + codePoint - start) % numGlyphs;
    }
    return 0;
  };

  const format4 = (codePoint: number) => {
    if (!format4Offset || codePoint > 0xffff) return 0;
    const segCount = uint16(data, format4Offset + 6) >> 1;
    const endCodes = format4Offset + 14;
    const startCodes = endCodes + segCount * 2 + 2;
    const idDeltas = startCodes + segCount * 2;
    const idRangeOffsets = idDeltas + segCount * 2;
    for (let index = 0; index < segCount; index += 1) {
      const end = uint16(data, endCodes + index * 2);
      const start = uint16(data, startCodes + index * 2);
      if (codePoint < start || codePoint > end) continue;
      const delta = int16(data, idDeltas + index * 2);
      const rangeOffset = uint16(data, idRangeOffsets + index * 2);
      if (!rangeOffset) return (codePoint + delta) & 0xffff;
      const glyphOffset = idRangeOffsets + index * 2 + rangeOffset + (codePoint - start) * 2;
      const glyph = uint16(data, glyphOffset);
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };

  return (codePoint: number) => format12(codePoint) || format4(codePoint);
}

function parseFontMetrics(data: Uint8Array): FontMetrics {
  const tables = tableDirectory(data);
  const head = tables.get('head');
  const hhea = tables.get('hhea');
  const maxp = tables.get('maxp');
  const hmtx = tables.get('hmtx');
  const cmap = tables.get('cmap');
  if ([head, hhea, maxp, hmtx, cmap].some((value) => value === undefined)) {
    throw new Error('Share-card font is missing required TrueType tables');
  }

  const unitsPerEm = uint16(data, head! + 18);
  const numGlyphs = uint16(data, maxp! + 4);
  const numberOfMetrics = uint16(data, hhea! + 34);
  const advances = new Uint16Array(numGlyphs);
  let lastAdvance = 0;
  for (let index = 0; index < numGlyphs; index += 1) {
    if (index < numberOfMetrics) lastAdvance = uint16(data, hmtx! + index * 4);
    advances[index] = lastAdvance;
  }
  return { unitsPerEm, advances, cmap: parseCmap(data, cmap!, numGlyphs) };
}

function fontPath() {
  const candidates = [
    join(process.cwd(), 'app/fonts/NotoSansDevanagari-Regular.ttf'),
    join(process.cwd(), 'apps/web/app/fonts/NotoSansDevanagari-Regular.ttf'),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error('Unable to locate the share-card font');
  return path;
}

let cachedMetrics: FontMetrics | undefined;
function shareCardFontMetrics() {
  return (cachedMetrics ??= parseFontMetrics(new Uint8Array(readFileSync(fontPath()))));
}

/** Measures advances from the exact TTF passed to ImageResponse, scaled to 32 px. */
export function measureShareCardText(text: string) {
  const metrics = shareCardFontMetrics();
  return Array.from(text).reduce((width, character) => {
    const glyph = metrics.cmap(character.codePointAt(0) || 0);
    return (
      width +
      (metrics.advances[glyph] ?? metrics.advances[0]) * (SHARE_CARD_FONT_SIZE / metrics.unitsPerEm)
    );
  }, 0);
}

function splitLongToken(token: string, maxWidth: number) {
  const pieces: string[] = [];
  let current = '';
  for (const character of Array.from(token)) {
    const candidate = current + character;
    if (current && measureShareCardText(candidate) > maxWidth) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function wrapParagraph(paragraph: string, maxWidth: number) {
  const words = paragraph.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const wordPieces =
      measureShareCardText(word) > maxWidth ? splitLongToken(word, maxWidth) : [word];
    for (const piece of wordPieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && measureShareCardText(candidate) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function wrapShareCardText(content: string, maxWidth = SHARE_CARD_TEXT_WIDTH) {
  return content
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .flatMap((paragraph) => wrapParagraph(paragraph, maxWidth));
}

export function truncateShareCardText(
  content: string,
  maxLines = SHARE_CARD_MAX_LINES,
  maxWidth = SHARE_CARD_TEXT_WIDTH,
) {
  const lines = wrapShareCardText(content, maxWidth);
  if (lines.length <= maxLines) return { lines, truncated: false };

  const visible = lines.slice(0, maxLines);
  const suffix = '...';
  let last = visible[maxLines - 1].trimEnd();
  while (last && measureShareCardText(`${last}${suffix}`) > maxWidth) {
    last = Array.from(last).slice(0, -1).join('').trimEnd();
  }
  visible[maxLines - 1] = `${last}${suffix}`;
  return { lines: visible, truncated: true };
}
