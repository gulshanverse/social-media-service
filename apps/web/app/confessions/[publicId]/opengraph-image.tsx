import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'College Confession social preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  let content = 'Anonymous confession preview';
  try {
    const response = await fetch(`${apiUrl}/confessions/${encodeURIComponent(publicId)}`);
    if (response.ok) content = ((await response.json()) as { content: string }).content;
  } catch {}
  const preview = content.length > 190 ? `${content.slice(0, 187)}…` : content;
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
        style={{ display: 'flex', maxWidth: 980, fontSize: 58, lineHeight: 1.08, fontWeight: 700 }}
      >
        “{preview}”
      </div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, opacity: 0.85 }}
      >
        <span>Anonymous</span>
        <span>www.confessions.live</span>
      </div>
    </div>,
    { ...size },
  );
}
