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

function characterWidth(character: string) {
  if (/\s/.test(character)) return 9;
  if (/[,.;:!?']/u.test(character)) return 12;
  if (/^[A-Z]$/u.test(character)) return 22;
  if (/^[a-z0-9]$/u.test(character)) return 17;
  if (/^[\u0900-\u097f]$/u.test(character)) return 30;
  return 27;
}

function textWidth(text: string) {
  return Array.from(text).reduce((width, character) => width + characterWidth(character), 0);
}

function splitLongToken(token: string, maxWidth: number) {
  const pieces: string[] = [];
  let current = '';
  for (const character of Array.from(token)) {
    const candidate = current + character;
    if (current && textWidth(candidate) > maxWidth) {
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
    const wordPieces = textWidth(word) > maxWidth ? splitLongToken(word, maxWidth) : [word];
    for (const piece of wordPieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (current && textWidth(candidate) > maxWidth) {
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
  while (last && textWidth(`${last}${suffix}`) > maxWidth) {
    last = Array.from(last).slice(0, -1).join('').trimEnd();
  }
  visible[maxLines - 1] = `${last}${suffix}`;
  return { lines: visible, truncated: true };
}
