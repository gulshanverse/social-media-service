import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import {
  SHARE_CARD_FONT_SIZE,
  SHARE_CARD_FOOTER_HEIGHT,
  SHARE_CARD_HEADER_HEIGHT,
  SHARE_CARD_LINE_HEIGHT,
  SHARE_CARD_LINE_HEIGHT_PX,
  SHARE_CARD_MAX_LINES,
  SHARE_CARD_RADIUS,
  SHARE_CARD_SECTION_GAP,
  SHARE_CARD_TEXT_WIDTH,
  SHARE_CARD_VERTICAL_PADDING,
  SHARE_CARD_WIDTH,
  shareCardCategory,
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
  const shadow = token(tokens, 'cardShadow', '0 18px 50px rgba(0, 0, 0, 0.24)');
  const { lines } = truncateShareCardText(
    confession.content,
    SHARE_CARD_MAX_LINES,
    SHARE_CARD_TEXT_WIDTH,
  );
  const height = shareCardHeight(lines.length);
  const [regularFontData, semiboldFontData] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/NotoSansDevanagari-Regular.ttf')),
    readFile(join(process.cwd(), 'app/fonts/NotoSansDevanagari-SemiBold.ttf')),
  ]);
  const regularFontBuffer = regularFontData.buffer.slice(
    regularFontData.byteOffset,
    regularFontData.byteOffset + regularFontData.byteLength,
  );
  const semiboldFontBuffer = semiboldFontData.buffer.slice(
    semiboldFontData.byteOffset,
    semiboldFontData.byteOffset + semiboldFontData.byteLength,
  );

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: SHARE_CARD_WIDTH,
        height,
        background: 'transparent',
        fontFamily: 'Noto Sans Devanagari',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: SHARE_CARD_WIDTH,
          height,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: SHARE_CARD_VERTICAL_PADDING,
          overflow: 'hidden',
          border: `${borderWidth} ${borderStyle} ${metadataColor}`,
          borderRadius: SHARE_CARD_RADIUS,
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
            fontWeight: 700,
            letterSpacing: 1.3,
            height: SHARE_CARD_HEADER_HEIGHT,
            textAlign: 'left',
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
            marginTop: SHARE_CARD_SECTION_GAP,
            marginBottom: SHARE_CARD_SECTION_GAP,
            flex: 1,
            fontSize: SHARE_CARD_FONT_SIZE,
            fontWeight: 600,
            lineHeight: SHARE_CARD_LINE_HEIGHT,
            letterSpacing: -0.32,
            textAlign: 'left',
          }}
        >
          {lines.map((line, index) => (
            <div
              key={`${index}-${line}`}
              style={{ display: 'flex', height: SHARE_CARD_LINE_HEIGHT_PX }}
            >
              {index === 0 ? `“${line}` : line}
              {index === lines.length - 1 ? '”' : ''}
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
            fontWeight: 600,
            letterSpacing: 0.2,
            height: SHARE_CARD_FOOTER_HEIGHT,
            textAlign: 'left',
          }}
        >
          <span>{shareCardCategory(confession)}</span>
          <span>{shareCardDate(confession.publishedAt)}</span>
        </div>
      </div>
    </div>,
    {
      width: SHARE_CARD_WIDTH,
      height,
      headers: cacheHeaders,
      fonts: [
        { name: 'Noto Sans Devanagari', data: regularFontBuffer, weight: 400, style: 'normal' },
        { name: 'Noto Sans Devanagari', data: semiboldFontBuffer, weight: 600, style: 'normal' },
        { name: 'Noto Sans Devanagari', data: semiboldFontBuffer, weight: 700, style: 'normal' },
      ],
    },
  );
}
