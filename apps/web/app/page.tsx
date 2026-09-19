import Link from 'next/link';
import { Logo } from '@ggv/ui';
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem 7vw',
        background: 'radial-gradient(circle at 80% 10%,#3b1640,transparent 35%)',
      }}
    >
      <Logo />
      <section style={{ maxWidth: 760, padding: '14vh 0' }}>
        <p style={{ color: '#C8FF00', fontWeight: 800, letterSpacing: '.16em' }}>
          COLLEGE CONFESSION
        </p>
        <h1 style={{ fontSize: 'clamp(3rem,8vw,7rem)', lineHeight: 0.95, margin: '1rem 0' }}>
          Your thoughts.
          <br />
          Your secrets.
          <br />
          <span style={{ color: '#FF2D75' }}>Your campus.</span>
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '1.2rem', maxWidth: 520 }}>
          A safe, anonymous space for the stories, crushes, chaos and little moments that make
          campus life unforgettable.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <Link className="ggv-button" href="/send">
            Send a Confession 💌
          </Link>
          <Link className="ggv-button" style={{ background: '#151C2B' }} href="/confessions">
            View Confessions
          </Link>
        </div>
      </section>
    </main>
  );
}
