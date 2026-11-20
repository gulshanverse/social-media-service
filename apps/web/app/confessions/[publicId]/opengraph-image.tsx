import { ImageResponse } from 'next/og';
import {
  cleanPreviewText,
  formatCategory,
  getPublicConfessionForPreview,
  PREVIEW_CACHE_CONTROL,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
} from '../../../lib/social-preview';

export const runtime = 'edge';
export const alt = 'College Confession individual confession preview';
export const size = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };
export const contentType = 'image/png';

const responseOptions = {
  ...size,
  headers: { 'Cache-Control': PREVIEW_CACHE_CONTROL },
};

function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          width: 52,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #f6edff',
          borderRadius: 16,
          color: '#f6edff',
          fontSize: 29,
          fontWeight: 800,
        }}
      >
        ♥
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#ffffff', fontSize: 28, fontWeight: 800 }}>College Confession</div>
        <div style={{ color: '#e8caff', fontSize: 11, fontWeight: 700, letterSpacing: 3 }}>
          ANONYMOUS CAMPUS COMMUNITY
        </div>
      </div>
    </div>
  );
}

function CampusIllustration() {
  return (
    <div
      style={{
        position: 'absolute',
        right: 74,
        bottom: 28,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 22,
        color: '#f2d9ff',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 78,
          height: 34,
          border: '3px solid currentColor',
          borderBottom: '0px solid transparent',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        ♜
      </div>
      <div
        style={{
          display: 'flex',
          width: 226,
          height: 78,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          border: '3px solid currentColor',
          borderBottom: '0px solid transparent',
          fontSize: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 0,
            height: 0,
            borderLeft: '120px solid transparent',
            borderRight: '120px solid transparent',
            borderBottom: '48px solid currentColor',
          }}
        />
        <div
          style={{
            display: 'flex',
            height: 34,
            alignItems: 'center',
            color: '#55217d',
            fontSize: 24,
          }}
        >
          ▥ ▥ ▥
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          width: 78,
          height: 34,
          border: '3px solid currentColor',
          borderBottom: '0px solid transparent',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        ♜
      </div>
    </div>
  );
}

function UnavailablePreview() {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: 'linear-gradient(135deg, #171329, #432068 55%, #0f1020)',
        color: '#fff',
        fontFamily: 'Arial',
      }}
    >
      <BrandMark />
      <div style={{ display: 'flex', maxWidth: 900, flexDirection: 'column', gap: 18 }}>
        <div style={{ color: '#e0b8ff', fontSize: 26, fontWeight: 700 }}>
          CONFESSION UNAVAILABLE
        </div>
        <div style={{ fontSize: 48, fontWeight: 800 }}>This confession is no longer public.</div>
      </div>
      <div style={{ display: 'flex', color: '#dec8ef', fontSize: 22 }}>confessions.live</div>
    </div>
  );
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const confession = await getPublicConfessionForPreview(publicId);
  if (!confession) return new ImageResponse(<UnavailablePreview />, responseOptions);

  const content = cleanPreviewText(confession.content, 310);
  const category = formatCategory(confession.category);
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '48px 64px 42px',
        background: 'linear-gradient(135deg, #21113a 0%, #5c1f86 48%, #e12a9d 100%)',
        color: '#fff',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -180,
          right: -90,
          width: 500,
          height: 500,
          borderRadius: 250,
          background: '#ff58c844',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -100,
          bottom: -210,
          width: 500,
          height: 500,
          borderRadius: 250,
          background: '#7c38e866',
        }}
      />
      <BrandMark />
      <div
        style={{
          position: 'absolute',
          top: 55,
          right: 66,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 18px',
          borderRadius: 24,
          background: '#180b2dcc',
          color: '#fff',
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        <span style={{ fontSize: 20 }}>⌁</span> Anonymous
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: 980,
          minHeight: 320,
          flexDirection: 'column',
          justifyContent: 'center',
          marginTop: 42,
          padding: '34px 52px 30px',
          border: '2px solid #ffffff66',
          borderRadius: 34,
          background: '#f8efffeF',
          color: '#160b23',
          boxShadow: '0 20px 50px #17062b66',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 22,
            color: '#be3ee7',
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          “
        </div>
        <div
          style={{
            display: 'flex',
            maxWidth: 870,
            paddingTop: 25,
            fontSize: content.length > 230 ? 31 : 38,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {content}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 20,
              background: '#efd6ff',
              color: '#5e1c82',
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {category}
          </div>
          <div style={{ color: '#be3ee7', fontSize: 64, lineHeight: 0.6 }}>” ♡</div>
        </div>
      </div>
      <CampusIllustration />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 22,
          color: '#f4ddff',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <span>A thought from your campus community</span>
        <span>www.confessions.live</span>
      </div>
    </div>,
    responseOptions,
  );
}
