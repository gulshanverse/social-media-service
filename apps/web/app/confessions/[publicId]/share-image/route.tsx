import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import {
  SHARE_CARD_FONT_SIZE,
  SHARE_CARD_FOOTER_HEIGHT,
  SHARE_CARD_FOOTER_PADDING,
  SHARE_CARD_HEADER_HEIGHT,
  SHARE_CARD_LINE_HEIGHT,
  SHARE_CARD_MAX_LINES,
  SHARE_CARD_OUTER_PADDING,
  SHARE_CARD_SECTION_GAP,
  SHARE_CARD_WIDTH,
  shareCardCategory,
  shareCardContent,
  shareCardContentWidth,
  shareCardDate,
  shareCardHeight,
  truncateShareCardText,
} from '../../../../lib/share-card';
import { getPublicConfessionForPreview } from '../../../../lib/social-preview';

export const runtime = 'nodejs';

const cacheHeaders = {
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
};

function token(tokens: Record<string, string>, key: string, fallback: string) {
  return tokens[key] || fallback;
}

function pixelValue(value: string, fallback: number) {
  const match = /^([\d.]+)px$/u.exec(value.trim());
  return match ? Number(match[1]) : fallback;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const confession = await getPublicConfessionForPreview(publicId);
  if (!confession) {
    return new Response('Confession unavailable', { status: 404, headers: cacheHeaders });
  }

  const theme = confession.theme;
  const tokens = theme?.tokens ?? {};
  const background = token(
    tokens,
    'cardBackground',
    theme?.gradient || theme?.background || '#151c2b',
  );
  const textColor = token(tokens, 'cardBodyColor', theme?.textColor || '#ffffff');
  const metadataColor = token(tokens, 'cardMetadataColor', theme?.accentColor || '#c8ff00');
  const borderStyle = token(tokens, 'cardBorderStyle', theme?.borderStyle || 'solid');
  const borderWidth = token(tokens, 'cardBorderWidth', '0px');
  const radius = theme?.radius || '28px';
  const shadow = token(tokens, 'cardShadow', '0 18px 50px rgba(0, 0, 0, 0.24)');
  const cardPadding = pixelValue(token(tokens, 'cardPadding', '25px'), 25);
  const content = shareCardContent(confession.content);
  const contentWidth = shareCardContentWidth(cardPadding);
  const { lines } = truncateShareCardText(content, SHARE_CARD_MAX_LINES, contentWidth);
  const cardHeight = shareCardHeight(lines.length, cardPadding);
  const canvasHeight = cardHeight + SHARE_CARD_OUTER_PADDING * 2;
  const bodyLineHeight = SHARE_CARD_FONT_SIZE * SHARE_CARD_LINE_HEIGHT;
  const bodyHeight = lines.length * bodyLineHeight;
  const fontData = await readFile(join(process.cwd(), 'app/fonts/NotoSansDevanagari-Regular.ttf'));
  const fontBuffer = fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  );

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: SHARE_CARD_WIDTH,
        height: canvasHeight,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SHARE_CARD_OUTER_PADDING,
        background: '#0b0f19',
        fontFamily: 'Noto Sans Devanagari',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: SHARE_CARD_WIDTH - SHARE_CARD_OUTER_PADDING * 2,
          height: cardHeight,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: cardPadding,
          overflow: 'hidden',
          border: `${borderWidth} ${borderStyle} ${metadataColor}`,
          borderRadius: radius,
          background,
          color: textColor,
          boxShadow: shadow,
        }}
      >
        <div
          style={{
            display: 'flex',
            height: SHARE_CARD_HEADER_HEIGHT,
            alignItems: 'center',
            justifyContent: 'space-between',
            color: metadataColor,
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: 1.5,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill="#070a12" />
              <path d="M14 20 22 39h20l8-19-11 8-7-12-7 12-11-8Z" fill="#ffd54a" />
              <path d="M20 45h24" stroke="#ff2d75" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <span>COLLEGE CONFESSION</span>
          </span>
          <span>ANONYMOUS</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: contentWidth,
            height: bodyHeight,
            justifyContent: 'flex-start',
            fontSize: SHARE_CARD_FONT_SIZE,
            fontWeight: 400,
            lineHeight: SHARE_CARD_LINE_HEIGHT,
            textAlign: 'left',
          }}
        >
          {lines.map((line, index) => (
            <div
              key={`${index}-${line}`}
              style={{ display: 'flex', height: bodyLineHeight, textAlign: 'left' }}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            height: SHARE_CARD_FOOTER_HEIGHT + SHARE_CARD_FOOTER_PADDING + 2,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: SHARE_CARD_FOOTER_PADDING,
            borderTop: `2px ${borderStyle} ${metadataColor}`,
            color: metadataColor,
            fontSize: 19,
            fontWeight: 400,
          }}
        >
          <span>{shareCardCategory(confession)}</span>
          <span>{shareCardDate(confession.publishedAt)}</span>
        </div>
      </div>
    </div>,
    {
      width: SHARE_CARD_WIDTH,
      height: canvasHeight,
      headers: cacheHeaders,
      fonts: [{ name: 'Noto Sans Devanagari', data: fontBuffer, weight: 400, style: 'normal' }],
    },
  );
}
