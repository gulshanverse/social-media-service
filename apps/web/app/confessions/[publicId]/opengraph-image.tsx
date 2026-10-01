import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'College Confession community preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: 'linear-gradient(135deg, #ff2d75, #ff7a00)',
        color: 'white',
        fontFamily: 'Arial',
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>
        COLLEGE CONFESSION
      </div>
      <div
        style={{ display: 'flex', maxWidth: 980, fontSize: 60, lineHeight: 1.08, fontWeight: 700 }}
      >
        A campus thought, reviewed before sharing.
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, opacity: 0.85 }}
      >
        <span>Independent community platform</span>
        <span>www.confessions.live</span>
      </div>
    </div>,
    { ...size },
  );
}
