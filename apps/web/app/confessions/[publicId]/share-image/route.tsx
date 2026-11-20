import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import {
  SHARE_CARD_FONT_SIZE,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_LINE_HEIGHT,
  SHARE_CARD_MAX_LINES,
  SHARE_CARD_TEXT_WIDTH,
  SHARE_CARD_WIDTH,
  shareCardCategory,
  shareCardDate,
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
  const radius = token(tokens, 'cardRadius', theme?.radius || '28px');
  const shadow = token(tokens, 'cardShadow', '0 18px 50px rgba(0, 0, 0, 0.24)');
  const padding = token(tokens, 'cardPadding', '48px');
  const { lines } = truncateShareCardText(
    confession.content,
    SHARE_CARD_MAX_LINES,
    SHARE_CARD_TEXT_WIDTH,
  );
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
        height: SHARE_CARD_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: '#0b0f19',
        fontFamily: 'Noto Sans Devanagari',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: SHARE_CARD_WIDTH - 80,
          height: SHARE_CARD_HEIGHT - 80,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding,
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
            alignItems: 'center',
            justifyContent: 'space-between',
            color: metadataColor,
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: 1.5,
          }}
        >
          <span>COLLEGE CONFESSION</span>
          <span>ANONYMOUS</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: SHARE_CARD_TEXT_WIDTH,
            minHeight: 520,
            justifyContent: 'center',
            fontSize: SHARE_CARD_FONT_SIZE,
            fontWeight: 400,
            lineHeight: SHARE_CARD_LINE_HEIGHT,
          }}
        >
          {lines.map((line, index) => (
            <div key={`${index}-${line}`} style={{ display: 'flex', minHeight: 45 }}>
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 22,
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
      height: SHARE_CARD_HEIGHT,
      headers: cacheHeaders,
      fonts: [{ name: 'Noto Sans Devanagari', data: fontBuffer, weight: 400, style: 'normal' }],
    },
  );
}
