import { Logo } from '@ggv/ui';
export default function AdminHome() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 5vw' }}>
      <Logo />
      <section style={{ padding: '12vh 0' }}>
        <p style={{ color: '#FF7A00', fontWeight: 800, letterSpacing: '.12em' }}>
          ADMIN FOUNDATION
        </p>
        <h1>Moderation workspace</h1>
        <p style={{ color: '#9CA3AF', maxWidth: 560 }}>
          Authentication, moderation, dashboard and card studio screens will be added in their
          dedicated product phases.
        </p>
      </section>
    </main>
  );
}
