import { ImageResponse } from 'next/og';
import { PREVIEW_CACHE_CONTROL, PREVIEW_HEIGHT, PREVIEW_WIDTH } from '../../lib/social-preview';

export const runtime = 'edge';
export const alt = 'College Confession anonymous community preview';
export const size = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: '58px 72px 48px',
        background: 'linear-gradient(135deg, #d8ff9b 0%, #55e4c4 54%, #08b9dd 100%)',
        color: '#07151b',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -150,
          right: -90,
          width: 440,
          height: 440,
          borderRadius: 220,
          background: '#ffffff33',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -260,
          left: -80,
          width: 500,
          height: 500,
          borderRadius: 250,
          background: '#0da6b844',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            width: 54,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            background: '#07151b',
            color: '#d8ff9b',
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          ♥
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>College Confession</div>
          <div style={{ color: '#164957', fontSize: 12, fontWeight: 800, letterSpacing: 3 }}>
            ANONYMOUS CAMPUS COMMUNITY
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          maxWidth: 965,
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div style={{ color: '#116071', fontSize: 25, fontWeight: 800 }}>COLLEGE COMMUNITY</div>
        <div style={{ maxWidth: 970, fontSize: 61, fontWeight: 900, lineHeight: 1.08 }}>
          A new anonymous confession from our college community.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 105,
          bottom: 42,
          display: 'flex',
          width: 310,
          height: 142,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          border: '4px solid #0a5965',
          borderBottom: '0px solid transparent',
          color: '#0a5965',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 0,
            height: 0,
            borderLeft: '170px solid transparent',
            borderRight: '170px solid transparent',
            borderBottom: '66px solid #0a5965',
          }}
        />
        <div
          style={{
            display: 'flex',
            height: 65,
            alignItems: 'center',
            color: '#d8ff9b',
            fontSize: 34,
          }}
        >
          ▥ ▥ ▥
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#164957',
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        <span>Read it. Share it. Keep it thoughtful.</span>
        <span>www.confessions.live/confessions</span>
      </div>
    </div>,
    { ...size, headers: { 'Cache-Control': PREVIEW_CACHE_CONTROL } },
  );
}
